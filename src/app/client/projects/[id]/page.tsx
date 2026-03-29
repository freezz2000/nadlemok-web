'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Card, { CardTitle } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Link from 'next/link'
import { QUESTION_GROUPS, DEFAULT_SCALE_LABELS, getGroupConfig } from '@/lib/template-constants'
import type { Project, ProjectStatus, SurveyTemplate, SurveyQuestion, QuestionGroup } from '@/lib/types'

const genderOptions = ['여성', '남성']
const ageGroupOptions = ['10대', '20대', '30대', '40대', '50대 이상']
const skinTypeOptions = ['건성', '복합성', '지성', '중성', '민감성']

export default function ClientProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const [project, setProject] = useState<Project | null>(null)
  const [surveyStats, setSurveyStats] = useState({ total: 0, responded: 0 })

  // 코호트 설정 (draft 상태에서 편집 가능)
  const [cohort, setCohort] = useState({ genders: [] as string[], ageGroups: [] as string[], skinTypes: [] as string[] })

  // 설문 설정
  const [templates, setTemplates] = useState<SurveyTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [questions, setQuestions] = useState<SurveyQuestion[]>([])
  const [existingSurveyId, setExistingSurveyId] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => { load() }, [id])

  async function load() {
    const { data: proj } = await supabase.from('projects').select('*').eq('id', id).single()
    setProject(proj)

    // 저장된 코호트 복원
    if (proj?.target_cohort) {
      setCohort(proj.target_cohort)
    }

    // 기존 설문 로드
    const { data: surveys } = await supabase.from('surveys').select('*').eq('project_id', id)
    if (surveys?.length) {
      const survey = surveys[0]
      setExistingSurveyId(survey.id)
      setQuestions(survey.questions || [])

      // 응답 현황
      const { count: totalPanels } = await supabase
        .from('survey_panels').select('*', { count: 'exact', head: true }).eq('survey_id', survey.id)
      const { count: responded } = await supabase
        .from('survey_responses').select('*', { count: 'exact', head: true }).eq('survey_id', survey.id)
      setSurveyStats({ total: totalPanels || 0, responded: responded || 0 })
    }

    // 템플릿 목록 (draft 상태에서 편집용)
    if (proj?.status === 'draft') {
      const { data: tmpls } = await supabase
        .from('survey_templates')
        .select('*')
        .order('is_default', { ascending: false })
      setTemplates(tmpls || [])
    }
  }

  function toggleCohort(field: 'genders' | 'ageGroups' | 'skinTypes', value: string) {
    setCohort((prev) => ({
      ...prev,
      [field]: prev[field].includes(value) ? prev[field].filter((v) => v !== value) : [...prev[field], value],
    }))
  }

  function loadTemplate(templateId: string) {
    const tmpl = templates.find((t) => t.id === templateId)
    if (tmpl) {
      setSelectedTemplateId(templateId)
      setQuestions(tmpl.questions || [])
    }
  }

  function removeQuestion(index: number) {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  async function saveDraft() {
    if (!project) return
    setSaving(true)

    // 코호트 저장
    await supabase.from('projects').update({ target_cohort: cohort }).eq('id', id)

    // 설문 upsert
    if (existingSurveyId) {
      await supabase.from('surveys').update({ questions }).eq('id', existingSurveyId)
    } else if (questions.length > 0) {
      const { data } = await supabase.from('surveys').insert({
        project_id: id,
        template_id: selectedTemplateId || null,
        title: `${project.product_name} 설문`,
        questions,
        day_checkpoint: [1, 3, 7, 14],
      }).select().single()
      if (data) setExistingSurveyId(data.id)
    }
    setSaving(false)
  }

  async function confirmSurvey() {
    if (!project || questions.length === 0) return
    setConfirming(true)

    // 설문 저장/생성
    if (existingSurveyId) {
      await supabase.from('surveys').update({ questions, status: 'draft' }).eq('id', existingSurveyId)
    } else {
      await supabase.from('surveys').insert({
        project_id: id,
        template_id: selectedTemplateId || null,
        title: `${project.product_name} 설문`,
        questions,
        day_checkpoint: [1, 3, 7, 14],
        status: 'draft',
      })
    }

    // 코호트 + 프로젝트 상태 변경
    await supabase.from('projects').update({ status: 'confirmed', target_cohort: cohort }).eq('id', id)

    setConfirming(false)
    window.location.reload()
  }

  if (!project) return <p className="text-text-muted p-6">로딩중...</p>

  const isDraft = project.status === 'draft'
  const isRejected = project.status === 'rejected'

  const stages = [
    { key: 'pending', label: '신청', desc: '서비스 신청이 접수되어 승인 대기 중입니다' },
    { key: 'draft', label: '설문 설정', desc: '코호트를 선택하고 설문을 설정해주세요' },
    { key: 'confirmed', label: '설문 확정', desc: '설문이 확정되어 패널 매칭 대기 중입니다' },
    { key: 'recruiting', label: '패널 모집', desc: '타겟에 맞는 패널을 선별 중입니다' },
    { key: 'testing', label: '테스트', desc: '패널이 제품을 사용하고 평가 중입니다' },
    { key: 'analyzing', label: '분석', desc: '수집된 데이터를 분석 중입니다' },
    { key: 'completed', label: '완료', desc: '분석이 완료되어 리포트를 확인할 수 있습니다' },
  ]
  const currentIdx = stages.findIndex((s) => s.key === project.status)

  const groupBadgeVariant = (color: string) => {
    const map: Record<string, 'nogo' | 'info' | 'go' | 'warning' | 'default'> = {
      nogo: 'nogo', info: 'info', go: 'go', warning: 'warning', default: 'default',
    }
    return map[color] || 'default'
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/client/projects" className="text-sm text-text-muted hover:text-text mb-1 inline-block">
            ← 프로젝트 목록
          </Link>
          <h1 className="text-2xl font-bold text-text">{project.product_name}</h1>
        </div>
        <StatusBadge status={project.status as ProjectStatus} />
      </div>

      {/* 진행 단계 */}
      <Card className="mb-6">
        <CardTitle>진행 현황</CardTitle>
        <div className="mt-4 flex items-center">
          {stages.map((stage, i) => (
            <div key={stage.key} className="flex-1 flex items-center">
              <div className="flex flex-col items-center text-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  i <= currentIdx ? 'bg-navy text-white' : 'bg-surface-dark text-text-muted'
                }`}>
                  {i < currentIdx ? '\u2713' : i + 1}
                </div>
                <span className={`text-xs mt-1 ${i <= currentIdx ? 'text-navy font-medium' : 'text-text-muted'}`}>
                  {stage.label}
                </span>
              </div>
              {i < stages.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 ${i < currentIdx ? 'bg-navy' : 'bg-surface-dark'}`} />
              )}
            </div>
          ))}
        </div>
        {isRejected && (
          <div className="mt-4 p-3 bg-nogo-bg text-nogo rounded-lg text-sm text-center">
            신청이 반려되었습니다. 자세한 내용은 관리자에게 문의해주세요.
          </div>
        )}
        {!isRejected && (
          <p className="text-sm text-text-muted mt-4 text-center">{stages[currentIdx]?.desc}</p>
        )}
      </Card>

      {/* 기본 정보 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card padding="sm"><p className="text-xs text-text-muted">플랜</p><p className="text-lg font-bold text-navy">{project.plan?.toUpperCase()}</p></Card>
        <Card padding="sm"><p className="text-xs text-text-muted">패널 규모</p><p className="text-lg font-bold text-text">{project.panel_size}명</p></Card>
        <Card padding="sm"><p className="text-xs text-text-muted">테스트 기간</p><p className="text-lg font-bold text-text">{project.test_duration}일</p></Card>
        <Card padding="sm"><p className="text-xs text-text-muted">응답 진행</p><p className="text-lg font-bold text-go">{surveyStats.responded} / {surveyStats.total}</p></Card>
      </div>

      {/* === draft 상태: 코호트 + 설문 편집 === */}
      {isDraft && (
        <>
          {/* 코호트 선택 */}
          <Card className="mb-6">
            <CardTitle>타겟 코호트 선택</CardTitle>
            <p className="text-xs text-text-muted mt-1 mb-4">원하는 패널 조건을 복수 선택해주세요</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-2">성별</label>
                <div className="flex gap-2">
                  {genderOptions.map((g) => (
                    <button key={g} type="button" onClick={() => toggleCohort('genders', g)}
                      className={`flex-1 py-2 rounded-lg border text-sm transition-all ${cohort.genders.includes(g) ? 'border-navy bg-navy/5 font-medium' : 'border-border hover:border-navy/30'}`}
                    >{g}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-2">연령대</label>
                <div className="flex flex-wrap gap-2">
                  {ageGroupOptions.map((a) => (
                    <button key={a} type="button" onClick={() => toggleCohort('ageGroups', a)}
                      className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${cohort.ageGroups.includes(a) ? 'border-navy bg-navy/5 font-medium' : 'border-border hover:border-navy/30'}`}
                    >{a}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-2">피부타입</label>
                <div className="flex flex-wrap gap-2">
                  {skinTypeOptions.map((s) => (
                    <button key={s} type="button" onClick={() => toggleCohort('skinTypes', s)}
                      className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${cohort.skinTypes.includes(s) ? 'border-navy bg-navy/5 font-medium' : 'border-border hover:border-navy/30'}`}
                    >{s}</button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* 설문 템플릿 선택 + 문항 편집 */}
          <Card className="mb-6">
            <CardTitle>설문 설정</CardTitle>
            <p className="text-xs text-text-muted mt-1 mb-4">템플릿을 선택하고 문항을 수정하세요</p>

            {/* 템플릿 선택 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-text mb-1.5">템플릿 불러오기</label>
              <select
                value={selectedTemplateId}
                onChange={(e) => loadTemplate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
              >
                <option value="">템플릿을 선택하세요</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.questions?.length || 0}문항){t.is_default ? ' [기본]' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 문항 목록 */}
            {questions.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {questions.map((q, i) => {
                  const gc = getGroupConfig(q.group)
                  return (
                    <div key={q.key} className="flex items-center gap-2 p-2 border border-border rounded-lg text-sm">
                      <span className="text-xs text-text-muted w-6">{i + 1}.</span>
                      <Badge variant={groupBadgeVariant(gc.color)} className="flex-shrink-0">{gc.label}</Badge>
                      <span className="flex-1 text-text">{q.label || '(문항 내용 없음)'}</span>
                      <span className="text-xs text-text-muted">{q.type === 'scale' ? '4점' : '주관식'}</span>
                      <button onClick={() => removeQuestion(i)} className="text-text-muted hover:text-nogo p-0.5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-text-muted py-4 text-center">
                위에서 템플릿을 선택하면 문항이 표시됩니다.
              </p>
            )}

            {/* 저장 / 확정 */}
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border">
              <Button variant="secondary" onClick={saveDraft} loading={saving} disabled={questions.length === 0}>
                임시 저장
              </Button>
              <Button onClick={confirmSurvey} loading={confirming} disabled={questions.length === 0}>
                설문 확정
              </Button>
              {questions.length === 0 && (
                <span className="text-xs text-text-muted">템플릿을 선택해야 확정할 수 있습니다</span>
              )}
            </div>
          </Card>
        </>
      )}

      {/* === confirmed 이후: 읽기 전용 === */}
      {!isDraft && !isRejected && project.status !== 'pending' && questions.length > 0 && (
        <Card className="mb-6">
          <CardTitle>설문 문항</CardTitle>
          <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
            {questions.map((q, i) => {
              const gc = getGroupConfig(q.group)
              return (
                <div key={q.key} className="flex items-center gap-2 p-2 border border-border rounded-lg text-sm">
                  <span className="text-xs text-text-muted w-6">{i + 1}.</span>
                  <Badge variant={groupBadgeVariant(gc.color)} className="flex-shrink-0">{gc.label}</Badge>
                  <span className="flex-1 text-text">{q.label}</span>
                  <span className="text-xs text-text-muted">{q.type === 'scale' ? '4점' : '주관식'}</span>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {project.status === 'completed' && (
        <Link
          href={`/client/projects/${id}/results`}
          className="block w-full text-center py-3 bg-navy text-white rounded-lg font-medium hover:bg-navy-dark transition-colors"
        >
          분석 결과 확인하기
        </Link>
      )}
    </div>
  )
}
