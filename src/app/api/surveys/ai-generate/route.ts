import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export const maxDuration = 60 // Vercel Pro 이상에서 60초 허용

const MAX_INPUT_CHARS = 6000
const AI_GEN_LIMIT = 5        // 프로젝트당 최대 생성 횟수
const AI_GEN_COOLDOWN_SEC = 30 // 연속 호출 방지 쿨다운 (초)

// 항상 마지막에 추가되는 고정 주관식 문항
const FIXED_TEXT_QUESTIONS = [
  {
    label: '이 제품의 아쉬운 점이나 단점을 자유롭게 적어주세요.',
    group: 'overall',
  },
  {
    label: '이 제품이 개선되었으면 하는 점을 자유롭게 적어주세요.',
    group: 'overall',
  },
]

function getAnthropicApiKey(): string | undefined {
  // 1차: process.env에서 읽기 (Vercel 배포 환경)
  const fromEnv = process.env['ANTHROPIC_API_KEY']
  if (fromEnv) return fromEnv

  // 2차: .env.local 직접 읽기 (로컬 dev — Claude Code 실행 환경이 process.env를 빈값으로 덮어쓸 수 있음)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path')
    const content = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf-8')
    const match = content.match(/^ANTHROPIC_API_KEY=(.+)$/m)
    return match?.[1]?.trim() || undefined
  } catch {
    return undefined
  }
}

export async function POST(req: NextRequest) {
  // ── 1. API 키 확인 ──────────────────────────────────────────────
  const apiKey = getAnthropicApiKey()
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다. .env.local(로컬) 또는 Vercel 환경변수(배포)를 확인하세요.' },
      { status: 500 }
    )
  }

  // ── 2. 인증 확인 ─────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  // ── 3. 요청 파싱 ─────────────────────────────────────────────────
  const { productInfo, category, projectId } = await req.json()

  if (!productInfo?.trim()) {
    return NextResponse.json({ error: '제품 정보를 입력해주세요' }, { status: 400 })
  }

  // ── 4. 사용 한도 & 쿨다운 체크 (projectId 있을 때만) ──────────────
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  if (projectId) {
    const { data: proj } = await admin
      .from('projects')
      .select('id, client_id, ai_generation_count, ai_generated_at')
      .eq('id', projectId)
      .single()

    if (!proj) {
      return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다.' }, { status: 404 })
    }
    if (proj.client_id !== user.id) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const count: number = proj.ai_generation_count ?? 0
    if (count >= AI_GEN_LIMIT) {
      return NextResponse.json(
        { error: `AI 문항 생성은 프로젝트당 최대 ${AI_GEN_LIMIT}회까지 가능합니다. (현재 ${count}/${AI_GEN_LIMIT}회 사용)` },
        { status: 429 }
      )
    }

    if (proj.ai_generated_at) {
      const elapsed = (Date.now() - new Date(proj.ai_generated_at).getTime()) / 1000
      if (elapsed < AI_GEN_COOLDOWN_SEC) {
        const remaining = Math.ceil(AI_GEN_COOLDOWN_SEC - elapsed)
        return NextResponse.json(
          { error: `${remaining}초 후 다시 시도해주세요.`, cooldownRemaining: remaining },
          { status: 429 }
        )
      }
    }
  }

  // ── 5. AI 생성 ───────────────────────────────────────────────────
  const client = new Anthropic({ apiKey })

  try {
    const truncated = productInfo.length > MAX_INPUT_CHARS
    const safeInput = truncated
      ? productInfo.slice(0, MAX_INPUT_CHARS) + '\n...(이하 생략)'
      : productInfo

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `당신은 화장품 관능 평가 전문가입니다. 아래 제품 정보를 바탕으로 소비자 패널 설문 문항을 생성해주세요.

제품 정보:
${safeInput}
${category ? `카테고리: ${category}` : ''}

다음 규칙을 반드시 따라주세요:
1. Kill Signal 문항 2~3개: 자극감·끈적임·이물감·냄새 이상 등 치명적 불만 감지용 — type: "scale" (4점 척도)
2. 일반 평가 문항 7~10개: 제형감·흡수력·발림성·보습감·향·전반적 만족도 등 — type: "scale" (4점 척도)
3. 추천 의향 1개, 구매 의향 1개 — type: "scale" (4점 척도)

문항 type 규칙:
- "scale": 4점 척도 문항 (scale=4, scaleLabels 필수)
- "text": 주관식 서술형 (scale·scaleLabels 없음)
- "choice": 객관식 선택형 (choices 배열 필수)

아래 JSON 형식으로만 응답하세요 (마크다운 코드블록 없이 순수 JSON):

[
  {
    "key": "q_고유ID",
    "label": "문항 내용",
    "type": "scale",
    "scale": 4,
    "scaleLabels": ["전혀 그렇지 않다", "그렇지 않다", "그렇다", "매우 그렇다"],
    "isKillSignal": false,
    "group": "texture",
    "order": 1
  }
]

group 값: "killsignal" | "texture" | "absorption" | "scent" | "moisture" | "overall" | "purchase"
isKillSignal: Kill Signal 문항만 true, 나머지 false
type이 "text"인 경우 scale·scaleLabels 필드 생략
type이 "choice"인 경우 choices 배열 추가, scale·scaleLabels 생략`,
        },
      ],
    })

    const raw = (message.content[0] as { type: string; text: string }).text.trim()

    // JSON 파싱
    let questions
    try {
      questions = JSON.parse(raw)
    } catch {
      const cleaned = raw.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim()
      questions = JSON.parse(cleaned)
    }

    if (!Array.isArray(questions)) {
      throw new Error('올바른 형식의 응답이 아닙니다')
    }

    // ── 6. 성공 시 카운터 업데이트 ──────────────────────────────────
    if (projectId) {
      const { data: proj } = await admin
        .from('projects')
        .select('ai_generation_count')
        .eq('id', projectId)
        .single()

      await admin
        .from('projects')
        .update({
          ai_generation_count: ((proj?.ai_generation_count ?? 0) as number) + 1,
          ai_generated_at: new Date().toISOString(),
        })
        .eq('id', projectId)
    }

    const now = Date.now()

    // AI 생성 문항 정규화 (타입별로 필요없는 필드 제거)
    const aiNormalized = questions.map((q: Record<string, unknown>, i: number) => {
      const type = (q.type as string) || 'scale'
      const base = {
        ...q,
        key: `ai_${now}_${i}`,
        order: i + 1,
        type,
        isKillSignal: q.isKillSignal ?? false,
      }
      if (type === 'scale') {
        return {
          ...base,
          scale: (q.scale as number) ?? 4,
          scaleLabels: (q.scaleLabels as string[]) ?? ['전혀 그렇지 않다', '그렇지 않다', '그렇다', '매우 그렇다'],
        }
      }
      if (type === 'choice') {
        const { scale: _s, scaleLabels: _sl, ...rest } = base as Record<string, unknown>
        void _s; void _sl
        return { ...rest, choices: (q.choices as string[]) ?? ['예', '아니오'] }
      }
      // text: scale/scaleLabels 제거
      const { scale: _s, scaleLabels: _sl, ...rest } = base as Record<string, unknown>
      void _s; void _sl
      return rest
    })

    // 고정 주관식 2개 — AI가 이미 포함했으면 중복 추가 방지
    const existingLabels = new Set(aiNormalized.map((q: Record<string, unknown>) => String(q.label).trim()))
    const fixedQuestions = FIXED_TEXT_QUESTIONS
      .filter(fq => !existingLabels.has(fq.label.trim()))
      .map((fq, i) => ({
        key: `ai_fixed_${now}_${i}`,
        label: fq.label,
        type: 'text' as const,
        isKillSignal: false,
        group: fq.group,
        order: aiNormalized.length + i + 1,
      }))

    const normalized = [
      ...aiNormalized,
      ...fixedQuestions,
    ].map((q, i) => ({ ...q, order: i + 1 }))

    return NextResponse.json({ questions: normalized, truncated })
  } catch (e) {
    console.error('[ai-generate] error:', e)

    let message = 'AI 문항 생성에 실패했습니다.'
    if (e instanceof Anthropic.APIError) {
      if (e.status === 401) message = 'API 키가 올바르지 않습니다.'
      else if (e.status === 404) message = `모델을 찾을 수 없습니다: ${e.message}`
      else if (e.status === 429) message = 'API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.'
      else message = `Anthropic API 오류 (${e.status}): ${e.message}`
    } else if (e instanceof SyntaxError) {
      message = 'AI 응답 형식이 올바르지 않습니다. 다시 시도해주세요.'
    } else if (e instanceof Error) {
      message = e.message
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
