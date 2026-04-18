import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { productInfo, category } = await req.json()

    if (!productInfo?.trim()) {
      return NextResponse.json({ error: '제품 정보를 입력해주세요' }, { status: 400 })
    }

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `당신은 화장품 관능 평가 전문가입니다. 아래 제품 정보를 바탕으로 소비자 패널 설문 문항을 생성해주세요.

제품 정보:
${productInfo}
${category ? `카테고리: ${category}` : ''}

다음 규칙을 반드시 따라주세요:
1. 문항은 4점 척도(1=전혀 그렇지 않다, 2=그렇지 않다, 3=그렇다, 4=매우 그렇다)로 구성
2. Kill Signal 문항(심각한 결함 감지용): 자극감·끈적임·이물감·냄새 이상 등 치명적 불만 관련 2~3개
3. 일반 평가 문항: 제형감·흡수력·발림성·보습감·향·전반적 만족도 등 7~10개
4. 마지막에 추천 의향 1개, 구매 의향 1개 반드시 포함
5. 아래 JSON 형식으로만 응답 (다른 텍스트 없이)

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

group 값은 다음 중 하나: "killsignal" | "texture" | "absorption" | "scent" | "moisture" | "overall" | "purchase"
isKillSignal은 Kill Signal 문항만 true

JSON 배열만 반환하고, 마크다운 코드블록 없이 순수 JSON만 출력하세요.`,
        },
      ],
    })

    const raw = (message.content[0] as { type: string; text: string }).text.trim()

    // JSON 파싱
    let questions
    try {
      questions = JSON.parse(raw)
    } catch {
      // 코드블록 감싸인 경우 제거 후 재시도
      const cleaned = raw.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim()
      questions = JSON.parse(cleaned)
    }

    if (!Array.isArray(questions)) {
      throw new Error('올바른 형식의 응답이 아닙니다')
    }

    // key 중복 방지 및 order 재정렬
    const now = Date.now()
    const normalized = questions.map((q: Record<string, unknown>, i: number) => ({
      ...q,
      key: `ai_${now}_${i}`,
      order: i + 1,
      scaleLabels: q.scaleLabels ?? ['전혀 그렇지 않다', '그렇지 않다', '그렇다', '매우 그렇다'],
    }))

    return NextResponse.json({ questions: normalized })
  } catch (e) {
    console.error('[ai-generate]', e)
    return NextResponse.json({ error: 'AI 문항 생성에 실패했습니다. 잠시 후 다시 시도해주세요.' }, { status: 500 })
  }
}
