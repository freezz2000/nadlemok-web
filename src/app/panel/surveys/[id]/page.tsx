'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import type { Survey, SurveyQuestion } from '@/lib/types'

const scaleLabels = [
  '',
  '매우 그렇지 않다',
  '그렇지 않다',
  '그렇다',
  '매우 그렇다',
]

export default function SurveyResponsePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [responses, setResponses] = useState<Record<string, number | string>>({})
  const [existingResponseId, setExistingResponseId] = useState<string | null>(null)
  const [isReadOnly, setIsReadOnly] = useState(false)
  const [isNotStarted, setIsNotStarted] = useState(false)  // 설문 미시작 (draft)
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)
  const startTime = useRef(Date.now())

  useEffect(() => { load() }, [id])

  async function load() {
    // 설문 로드
    const { data: surveyData } = await supabase
      .from('surveys')
      .select('*, project:projects(status)')
      .eq('id', id)
      .single()
    setSurvey(surveyData)

    // 설문 미시작 (draft) — 고객사가 아직 "설문 시작하기"를 누르지 않은 상태
    if (surveyData?.status === 'draft') {
      setIsNotStarted(true)
      return
    }

    // 분석 단계 이후는 읽기 전용
    const projectStatus = (surveyData as unknown as { project: { status: string } })?.project?.status
    if (surveyData?.status === 'closed' || projectStatus === 'analyzing' || projectStatus === 'completed') {
      setIsReadOnly(true)
    }

    // 기존 응답 로드
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: existing } = await supabase
        .from('survey_responses')
        .select('*')
        .eq('survey_id', id)
        .eq('panel_id', user.id)
        .limit(1)
        .single()

      if (existing) {
        setExistingResponseId(existing.id)
        // 기존 응답 복원
        const restored: Record<string, number | string> = {}
        if (existing.responses) {
          for (const [key, val] of Object.entries(existing.responses)) {
            restored[key] = val as number | string
          }
        }
        if (existing.open_weakness) restored['open_weakness'] = existing.open_weakness
        if (existing.open_improvement) restored['open_improvement'] = existing.open_improvement
        setResponses(restored)
      }
    }
    startTime.current = Date.now()
  }

  function setScaleResponse(key: string, value: number) {
    setResponses({ ...responses, [key]: value })
  }

  async function submit() {
    if (!survey) return
    setSubmitting(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const scaleResponses: Record<string, number> = {}
    let openWeakness = ''
    let openImprovement = ''

    for (const q of survey.questions) {
      if (q.type === 'scale') {
        scaleResponses[q.key] = (responses[q.key] as number) || 0
      } else if (q.type === 'choice') {
        if (responses[q.key] !== undefined) {
          scaleResponses[q.key] = responses[q.key] as unknown as number
        }
      } else if (q.key === 'open_weakness') {
        openWeakness = (responses[q.key] as string) || ''
      } else if (q.key === 'open_improvement') {
        openImprovement = (responses[q.key] as string) || ''
      }
    }

    const durationSec = Math.round((Date.now() - startTime.current) / 1000)

    if (existingResponseId) {
      // 기존 응답 수정
      await supabase.from('survey_responses').update({
        responses: scaleResponses,
        open_weakness: openWeakness,
        open_improvement: openImprovement,
        response_duration_sec: durationSec,
        responded_at: new Date().toISOString(),
      }).eq('id', existingResponseId)
    } else {
      // 새 응답 제출
      const { data } = await supabase.from('survey_responses').insert({
        survey_id: id,
        panel_id: user.id,
        day_checkpoint: 1,
        responses: scaleResponses,
        open_weakness: openWeakness,
        open_improvement: openImprovement,
        response_duration_sec: durationSec,
      }).select().single()

      if (data) setExistingResponseId(data.id)

      // 매칭 상태 업데이트
      await supabase
        .from('survey_panels')
        .update({ status: 'accepted' })
        .eq('survey_id', id)
        .eq('panel_id', user.id)
    }

    setSaved(true)
    setSubmitting(false)
    startTime.current = Date.now()
    setTimeout(() => setSaved(false), 3000)
  }

  if (!survey) return <p className="text-text-muted p-6">로딩중...</p>

  // 설문 미시작 — 고객사가 "설문 시작하기"를 누르기 전
  if (isNotStarted) {
    return (
      <div className="max-w-2xl mx-auto">
        <button onClick={() => router.push('/panel')} className="text-text-muted hover:text-text text-sm mb-6 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          돌아가기
        </button>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-surface-dark flex items-center justify-center mb-5">
            <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-text mb-2">설문이 아직 시작되지 않았습니다</h2>
          <p className="text-sm text-text-muted leading-relaxed max-w-xs">
            고객사에서 설문을 시작하면 응답하실 수 있습니다.<br />잠시 후 다시 확인해 주세요.
          </p>
        </div>
      </div>
    )
  }

  const scaleQuestions = survey.questions.filter((q) => q.type === 'scale')
  const textQuestions = survey.questions.filter((q) => q.type === 'text')
  const choiceQuestions = survey.questions.filter((q) => q.type === 'choice')
  const answeredCount = scaleQuestions.filter((q) => responses[q.key] !== undefined).length
  const progress = scaleQuestions.length > 0 ? Math.round((answeredCount / scaleQuestions.length) * 100) : 0

  return (
    <div className="max-w-2xl mx-auto">
      {/* 헤더 */}
      <div className="mb-6">
        <button onClick={() => router.push('/panel')} className="text-text-muted hover:text-text text-sm mb-2 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          돌아가기
        </button>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-text">{survey.title}</h1>
          {existingResponseId && !isReadOnly && (
            <Badge variant="info">수정 가능</Badge>
          )}
          {isReadOnly && (
            <Badge variant="default">읽기 전용</Badge>
          )}
        </div>
      </div>

      {isReadOnly && (
        <Card className="mb-6" padding="sm">
          <p className="text-sm text-text-muted text-center">분석이 진행 중이므로 응답을 수정할 수 없습니다.</p>
        </Card>
      )}

      {/* 진행률 */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-text-muted mb-1">
          <span>진행률</span>
          <span>{answeredCount} / {scaleQuestions.length} ({progress}%)</span>
        </div>
        <div className="h-2 bg-surface-dark rounded-full overflow-hidden">
          <div className="h-full bg-navy rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* 척도 문항 */}
      <div className="space-y-4">
        {scaleQuestions.map((q, i) => (
          <Card key={q.key} padding="md">
            <div className="flex items-start gap-2 mb-3">
              <span className="text-sm text-text-muted">{i + 1}.</span>
              <p className="text-sm font-medium text-text flex-1">{q.label}</p>
              {q.isKillSignal && <Badge variant="nogo">KS</Badge>}
            </div>
            <div className="grid grid-cols-4 gap-2 ml-5">
              {[1, 2, 3, 4].map((val) => (
                <button
                  key={val}
                  onClick={() => !isReadOnly && setScaleResponse(q.key, val)}
                  disabled={isReadOnly}
                  className={`py-2.5 px-2 rounded-lg text-xs text-center transition-all ${
                    responses[q.key] === val
                      ? 'bg-navy text-white font-medium'
                      : isReadOnly
                        ? 'border border-border text-text-muted/50 cursor-not-allowed'
                        : 'border border-border hover:border-navy/30 text-text-muted hover:text-text'
                  }`}
                >
                  {q.scaleLabels?.[val - 1] || scaleLabels[val]}
                </button>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* 객관식 문항 */}
      {choiceQuestions.length > 0 && (
        <div className="mt-6 space-y-4">
          {choiceQuestions.map((q, i) => (
            <Card key={q.key} padding="md">
              <div className="flex items-start gap-2 mb-3">
                <span className="text-sm text-text-muted">{scaleQuestions.length + i + 1}.</span>
                <p className="text-sm font-medium text-text flex-1">{q.label}</p>
              </div>
              <div className="ml-5 space-y-2">
                {(q.choices || []).map((choice) => (
                  <button
                    key={choice}
                    onClick={() => !isReadOnly && setResponses({ ...responses, [q.key]: choice })}
                    disabled={isReadOnly}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-all ${
                      responses[q.key] === choice
                        ? 'bg-navy text-white border-navy font-medium'
                        : isReadOnly
                          ? 'border-border text-text-muted/50 cursor-not-allowed'
                          : 'border-border hover:border-navy/30 text-text'
                    }`}
                  >
                    {choice}
                  </button>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 주관식 문항 */}
      {textQuestions.length > 0 && (
        <div className="mt-6 space-y-4">
          {textQuestions.map((q) => (
            <Card key={q.key}>
              <p className="text-sm font-medium text-text mb-2">{q.label}</p>
              <textarea
                value={(responses[q.key] as string) || ''}
                onChange={(e) => !isReadOnly && setResponses({ ...responses, [q.key]: e.target.value })}
                readOnly={isReadOnly}
                className={`w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 min-h-[80px] ${isReadOnly ? 'bg-surface cursor-not-allowed' : ''}`}
                placeholder="자유롭게 작성해주세요"
              />
            </Card>
          ))}
        </div>
      )}

      {/* 제출/저장 */}
      {!isReadOnly && (
        <div className="mt-8 mb-12">
          <Button
            onClick={submit}
            loading={submitting}
            disabled={answeredCount < scaleQuestions.length}
            className="w-full"
            size="lg"
          >
            {existingResponseId ? '응답 수정 저장' : '응답 제출'} ({answeredCount}/{scaleQuestions.length})
          </Button>
          {answeredCount < scaleQuestions.length && (
            <p className="text-xs text-text-muted text-center mt-2">모든 척도 문항에 응답해야 제출할 수 있습니다.</p>
          )}
          {saved && (
            <p className="text-sm text-go text-center mt-3">저장되었습니다</p>
          )}
        </div>
      )}
    </div>
  )
}
