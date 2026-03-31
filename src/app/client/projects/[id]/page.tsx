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
import SurveyQuestionCard from '@/components/SurveyQuestionCard'
import type { Project, ProjectStatus, SurveyTemplate, SurveyQuestion, QuestionGroup } from '@/lib/types'

const genderOptions = ['여성', '남성']
const ageGroupOptions = ['10대', '20대', '30대', '40대', '50대 이상']
const skinTypeOptions = ['건성', '복합성', '지성', '중성', '민감성']

export default function ClientProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const [project, setProject] = useState<Project | null>(null)
  const [surveyStats, setSurveyStats] = useState({ total: 0, responded: 0 })

  // 코호트 설정
  const [cohort, setCohort] = useState({ genders: [] as string[], ageGroups: [] as string[], skinTypes: [] as string[] })

  // 설문 설정
  const [templates, setTemplates] = useState<SurveyTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [questions, setQuestions] = useState<SurveyQuestion[]>([])
  const [existingSurveyId, setExistingSurveyId] = useState<string | null>(null)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [approving, setApproving] = useState(false)
  const [showSurveyQuestions, setShowSurveyQuestions] = useState(true)

  useEffect(() => { load() }, [id])

  async function load() {
    const { data: proj } = await supabase.from('projects').select('*').eq('id', id).single()
    setProject(proj)

    if (proj?.target_cohort) setCohort(proj.target_cohort)

    // 기존 설문 로드
    const { data: surveys } = await supabase.from('surveys').select('*').eq('project_id', id)
    if (surveys?.length) {
      const survey = surveys[0]
      setExistingSurveyId(survey.id)
      setQuestions((survey.questions || []).map((q: SurveyQuestion) => ({ ...q })))
      // 연결된 템플릿 ID 복원
      if (survey.template_id) setSelectedTemplateId(survey.template_id)

      const { count: totalPanels } = await supabase
        .from('survey_panels').select('*', { count: 'exact', head: true }).eq('survey_id', survey.id)
      const { count: responded } = await supabase
        .from('survey_responses').select('*', { count: 'exact', head: true }).eq('survey_id', survey.id)
      setSurveyStats({ total: totalPanels || 0, responded: responded || 0 })
    }

    if (proj?.status === 'draft') {
      const { data: tmpls } = await supabase
        .from('survey_templates').select('*').order('is_default', { ascending: false })
      setTemplates(tmpls || [])
    }
  }

  function toggleCohort(field: 'genders' | 'ageGroups' | 'skinTypes', value: string) {
    setCohort((prev) => ({
      ...prev,
      [field]: prev[field].includes(value) ? prev[field].filter((v) => v !== value) : [...prev[field], value],
    }))
  }

  // 템플릿 불러오기 — 원본 템플릿은 절대 수정하지 않음 (깊은 복사)
  function loadTemplate(templateId: string) {
    const tmpl = templates.find((t) => t.id === templateId)
    if (tmpl) {
      setSelectedTemplateId(templateId)
      setQuestions(tmpl.questions.map((q) => ({ ...q })))
    }
  }

  // 템플릿 선택 취소 — 템플릿 연결만 해제, 현재 편집 문항은 유지
  function clearTemplate() {
    setSelectedTemplateId('')
  }

  // 문항 편집
  function updateQuestion(index: number, updates: Partial<SurveyQuestion>) {
    const qs = [...questions]
    qs[index] = { ...qs[index], ...updates }
    setQuestions(qs)
  }

  function removeQuestion(index: number) {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    const qs = [...questions]
    const next = index + direction
    if (next < 0 || next >= qs.length) return
    ;[qs[index], qs[next]] = [qs[next], qs[index]]
    setQuestions(qs)
  }

  // 문항 추가
  function addQuestion(group: QuestionGroup) {
    const isKS = group === 'killsignal'
    const newQ: SurveyQuestion = {
      key: `${isKS ? 'KS_' : ''}q_${Date.now()}`,
      label: '',
      type: 'scale',
      scale: 4,
      scaleLabels: [...DEFAULT_SCALE_LABELS],
      isKillSignal: isKS,
      group,
      order: questions.length + 1,
    }
    setQuestions([...questions, newQ])
  }

  function addTextQuestion() {
    const newQ: SurveyQuestion = {
      key: `open_${Date.now()}`,
      label: '',
      type: 'text',
      isKillSignal: false,
      group: 'overall',
      order: questions.length + 1,
    }
    setQuestions([...questions, newQ])
  }

  function addChoiceQuestion() {
    const newQ: SurveyQuestion = {
      key: `choice_${Date.now()}`,
      label: '',
      type: 'choice',
      choices: ['예', '아니오'],
      isKillSignal: false,
      group: 'overall',
      order: questions.length + 1,
    }
    setQuestions([...questions, newQ])
  }

  async function saveDraft() {
    if (!project) return
    setSaving(true)

    await supabase.from('projects').update({ target_cohort: cohort }).eq('id', id)

    if (existingSurveyId) {
      await supabase.from('surveys').update({
        questions,
        template_id: selectedTemplateId || null,
      }).eq('id', existingSurveyId)
    } else if (questions.length > 0) {
      const { data } = await supabase.from('surveys').insert({
        project_id: id,
        template_id: selectedTemplateId || null,
        title: `${project.product_name} 설문`,
        questions,
        day_checkpoint: [1],
      }).select().single()
      if (data) setExistingSurveyId(data.id)
    }
    setSaving(false)
  }

  async function approveProject() {
    if (!project) return
    setApproving(true)
    const { error } = await supabase
      .from('projects')
      .update({ status: 'approved' })
      .eq('id', id)
      .eq('status', 'confirmed') // 확정 상태일 때만 승인 가능
    if (error) {
      alert(`승인 처리 중 오류가 발생했습니다: ${error.message}`)
      setApproving(false)
      return
    }
    setApproving(false)
    window.location.reload()
  }

  async function confirmSurvey() {
    if (!project || questions.length === 0) return
    setConfirming(true)

    if (existingSurveyId) {
      await supabase.from('surveys').update({
        questions,
        template_id: selectedTemplateId || null,
        status: 'draft',
      }).eq('id', existingSurveyId)
    } else {
      await supabase.from('surveys').insert({
        project_id: id,
        template_id: selectedTemplateId || null,
        title: `${project.product_name} 설문`,
        questions,
        day_checkpoint: [1],
        status: 'draft',
      })
    }

    await supabase.from('projects').update({ status: 'confirmed', target_cohort: cohort }).eq('id', id)
    setConfirming(false)
    window.location.reload()
  }

  if (!project) return <p className="text-text-muted p-6">로딩중...</p>

  const isDraft = project.status === 'draft'
  const isConfirmed = project.status === 'confirmed'
  const isRejected = project.status === 'rejected'
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId)

  const stages = [
    { key: 'pending', label: '신청', desc: '서비스 신청이 접수되어 승인 대기 중입니다' },
    { key: 'draft', label: '설문 설정', desc: '코호트를 선택하고 설문을 설정해주세요' },
    { key: 'confirmed', label: '관리자 확정', desc: '관리자가 설문을 확정했습니다. 내용을 검토하고 승인해주세요' },
    { key: 'approved', label: '승인 완료', desc: '설문이 승인되어 패널 모집 대기 중입니다' },
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
                  {i < currentIdx ? '✓' : i + 1}
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

          {/* 설문 설정 */}
          <Card className="mb-6">
            <div className="flex items-center justify-between mb-1">
              <CardTitle>설문 설정</CardTitle>
              <span className="text-sm text-text-muted">{questions.length}개 문항</span>
            </div>
            <p className="text-xs text-text-muted mb-4">템플릿을 불러온 후 문항을 자유롭게 수정하세요. 원본 템플릿은 변경되지 않습니다.</p>

            {/* 템플릿 선택/표시
                selectedTemplateId(string)로 판단 — 비동기 templates 로드 완료 전에
                select가 잠깐 보여서 사용자가 재선택하면 수정 문항이 덮어씌워지는 버그 방지 */}
            <div className="mb-5 p-3 bg-surface rounded-lg">
              {selectedTemplateId ? (
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text">
                      템플릿: {selectedTemplate?.name ?? '로딩 중...'}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      현재 {questions.length}개 문항 (템플릿 연결 해제해도 문항은 유지됩니다)
                    </p>
                  </div>
                  <button
                    onClick={clearTemplate}
                    className="text-xs px-2.5 py-1 border border-border rounded-lg text-text-muted hover:border-nogo/30 hover:text-nogo transition-all"
                  >
                    연결 해제
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-medium text-text-muted mb-2">템플릿 불러오기</p>
                  <select
                    value=""
                    onChange={(e) => {
                      if (!e.target.value) return
                      if (questions.length > 0) {
                        if (!window.confirm('현재 문항이 템플릿으로 교체됩니다. 계속하시겠습니까?')) return
                      }
                      loadTemplate(e.target.value)
                    }}
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
              )}
            </div>

            {/* 문항 목록 (전체 편집 가능) */}
            {questions.length > 0 ? (
              <div className="space-y-2 mb-4">
                {questions.map((q, i) => (
                  <SurveyQuestionCard
                    key={`${q.key}-${i}`}
                    question={{ ...q, _index: i }}
                    index={i}
                    total={questions.length}
                    expandedKey={expandedKey}
                    onToggleExpand={(key) => setExpandedKey(expandedKey === key ? null : key)}
                    onUpdate={updateQuestion}
                    onRemove={removeQuestion}
                    onMove={moveQuestion}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted py-4 text-center mb-4">
                {selectedTemplateId
                  ? '모든 문항이 삭제되었습니다. 아래에서 문항을 추가하세요.'
                  : '위에서 템플릿을 선택하거나 문항을 직접 추가하세요.'}
              </p>
            )}

            {/* 문항 추가 */}
            <div className="mb-4 p-3 border border-dashed border-border rounded-lg">
              <p className="text-xs font-medium text-text-muted mb-2">문항 추가</p>
              <div className="flex flex-wrap gap-2">
                {QUESTION_GROUPS.map((g) => (
                  <button
                    key={g.key}
                    onClick={() => addQuestion(g.key)}
                    className="text-xs px-2.5 py-1 border border-border rounded-lg hover:border-navy/30 hover:bg-surface/50 transition-all"
                  >
                    + {g.label}
                  </button>
                ))}
                <button
                  onClick={addTextQuestion}
                  className="text-xs px-2.5 py-1 border border-border rounded-lg hover:border-navy/30 hover:bg-surface/50 transition-all"
                >
                  + 주관식
                </button>
                <button
                  onClick={addChoiceQuestion}
                  className="text-xs px-2.5 py-1 border border-border rounded-lg hover:border-navy/30 hover:bg-surface/50 transition-all"
                >
                  + 객관식
                </button>
              </div>
            </div>

            {/* 저장 / 확정 */}
            <div className="flex items-center gap-3 pt-3 border-t border-border">
              <Button variant="secondary" onClick={saveDraft} loading={saving} disabled={questions.length === 0}>
                임시 저장
              </Button>
              <Button onClick={confirmSurvey} loading={confirming} disabled={questions.length === 0}>
                설문 확정
              </Button>
              {questions.length === 0 && (
                <span className="text-xs text-text-muted">문항이 있어야 확정할 수 있습니다</span>
              )}
            </div>
          </Card>
        </>
      )}

      {/* === confirmed 상태: 고객 승인 요청 === */}
      {isConfirmed && (
        <Card className="mb-6 border-blue-200 bg-blue-50/40">
          <div className="flex items-start gap-3 mb-4">
            <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <CardTitle>설문 승인 요청</CardTitle>
              <p className="text-sm text-text-muted mt-1">
                관리자가 설문을 확정했습니다. 아래 문항을 검토한 후 승인해주세요.
                승인하시면 패널 모집이 시작됩니다.
              </p>
            </div>
          </div>

          {/* 설문 문항 토글 */}
          <div className="border border-blue-200 rounded-xl overflow-hidden mb-4">
            <button
              type="button"
              onClick={() => setShowSurveyQuestions(!showSurveyQuestions)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-white/70 hover:bg-white transition-colors text-left"
            >
              <svg
                className={`w-4 h-4 text-blue-400 flex-shrink-0 transition-transform ${showSurveyQuestions ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              <span className="flex-1 text-sm font-medium text-text">설문 문항 목록</span>
              <span className="text-xs text-text-muted">{questions.length}문항</span>
            </button>
            {showSurveyQuestions && (
              <div className="border-t border-blue-200 bg-white px-4 py-3">
                {questions.length === 0 ? (
                  <p className="text-sm text-text-muted text-center py-4">문항을 불러오는 중입니다...</p>
                ) : (
                  <div className="space-y-0">
                    {questions.map((q, i) => {
                      const gc = getGroupConfig(q.group)
                      return (
                        <div key={q.key} className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0">
                          <span className="text-xs text-text-muted w-6 flex-shrink-0 pt-0.5">{i + 1}.</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-text leading-snug">{q.label || '(내용 없음)'}</p>
                            {q.type === 'scale' && q.scaleLabels && (
                              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                                {q.scaleLabels.map((lbl, li) => (
                                  <span key={li} className="text-xs text-text-muted bg-surface-dark px-1.5 py-0.5 rounded">
                                    {li + 1}. {lbl}
                                  </span>
                                ))}
                              </div>
                            )}
                            {q.type === 'choice' && q.choices && (
                              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                                {q.choices.map((ch, ci) => (
                                  <span key={ci} className="text-xs text-text-muted bg-surface-dark px-1.5 py-0.5 rounded">
                                    {ch}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
                            {q.isKillSignal && (
                              <span className="text-xs px-1.5 py-0.5 bg-nogo-bg text-nogo rounded font-medium">KS</span>
                            )}
                            <Badge variant={groupBadgeVariant(gc.color)}>{gc.label}</Badge>
                            <span className="text-xs text-text-muted">
                              {q.type === 'scale' ? '4점' : q.type === 'choice' ? '객관식' : '주관식'}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-text-muted">총 {questions.length}개 문항</p>
            <Button onClick={approveProject} loading={approving}>
              설문 승인하기
            </Button>
          </div>
        </Card>
      )}

      {/* === approved 이후: 읽기 전용 === */}
      {!isDraft && !isConfirmed && !isRejected && project.status !== 'pending' && questions.length > 0 && (
        <Card className="mb-6">
          {/* 토글 헤더 */}
          <button
            type="button"
            onClick={() => setShowSurveyQuestions(!showSurveyQuestions)}
            className="w-full flex items-center gap-3 text-left"
          >
            <svg
              className={`w-4 h-4 text-text-muted flex-shrink-0 transition-transform ${showSurveyQuestions ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            <span className="flex-1 text-base font-semibold text-text">설문 문항</span>
            <span className="text-xs text-text-muted">{questions.length}문항</span>
          </button>

          {/* 문항 목록 */}
          {showSurveyQuestions && (
            <div className="mt-4 border border-border rounded-xl overflow-hidden">
              {questions.map((q, i) => {
                const gc = getGroupConfig(q.group)
                return (
                  <div key={q.key} className="flex items-start gap-3 px-4 py-3 border-b border-border/60 last:border-0 bg-white hover:bg-surface/40 transition-colors">
                    <span className="text-xs text-text-muted w-6 flex-shrink-0 pt-0.5">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text leading-snug">{q.label || '(내용 없음)'}</p>
                      {q.type === 'scale' && q.scaleLabels && (
                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                          {q.scaleLabels.map((lbl, li) => (
                            <span key={li} className="text-xs text-text-muted bg-surface-dark px-1.5 py-0.5 rounded">
                              {li + 1}. {lbl}
                            </span>
                          ))}
                        </div>
                      )}
                      {q.type === 'choice' && q.choices && (
                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                          {q.choices.map((ch, ci) => (
                            <span key={ci} className="text-xs text-text-muted bg-surface-dark px-1.5 py-0.5 rounded">
                              {ch}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
                      {q.isKillSignal && (
                        <span className="text-xs px-1.5 py-0.5 bg-nogo-bg text-nogo rounded font-medium">KS</span>
                      )}
                      <Badge variant={groupBadgeVariant(gc.color)}>{gc.label}</Badge>
                      <span className="text-xs text-text-muted">
                        {q.type === 'scale' ? '4점' : q.type === 'choice' ? '객관식' : '주관식'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
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
