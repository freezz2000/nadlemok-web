'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Card, { CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { StatusBadge, MatchStatusBadge } from '@/components/ui/Badge'
import Badge from '@/components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import Modal from '@/components/ui/Modal'
import { DEFAULT_SCALE_LABELS, QUESTION_GROUPS } from '@/lib/template-constants'
import SurveyQuestionCard from '@/components/SurveyQuestionCard'
import type { Project, Survey, SurveyTemplate, SurveyQuestion, QuestionGroup, ProjectStatus, PanelMatchStatus } from '@/lib/types'

interface MatchedPanel {
  id: string
  status: string
  matched_at: string
  panel_id: string
  panel: {
    name: string
    panel_profiles: {
      gender: string
      age_group: string
      skin_type: string
      skin_concern: string
    } | null
  } | null
  responses_count: number
}

interface AvailablePanel {
  id: string
  name: string
  panel_profiles: {
    gender: string
    age_group: string
    skin_type: string
    skin_concern: string
    is_available: boolean
  } | null
}

interface PanelDetail {
  id: string
  name: string
  phone: string | null
  last_login_at: string | null
  created_at: string
  panel_profiles: {
    gender: string | null
    age_group: string | null
    skin_type: string | null
    skin_concern: string | null
    is_sensitive: boolean
    current_product: string | null
    tier: string
    is_available: boolean
    address: string | null
    address_detail: string | null
  } | null
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [project, setProject] = useState<Project | null>(null)
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [templates, setTemplates] = useState<SurveyTemplate[]>([])
  const [matchedPanels, setMatchedPanels] = useState<MatchedPanel[]>([])
  const [showCreateSurvey, setShowCreateSurvey] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [surveyTitle, setSurveyTitle] = useState('')

  // 설문 문항 편집 (draft 상태)
  const [editQuestions, setEditQuestions] = useState<SurveyQuestion[]>([])
  const [editTemplateId, setEditTemplateId] = useState('')
  const [savingSurvey, setSavingSurvey] = useState(false)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  // 설문 문항 토글 (문항 조회)
  const [expandedSurveyId, setExpandedSurveyId] = useState<string | null>(null)

  // 프로젝트 임계값 설정
  const [thresholds, setThresholds] = useState({ ks_warn: 5, ks_danger: 10, satisfaction: 3.0 })
  const [editingThresholds, setEditingThresholds] = useState(false)
  const [savingThresholds, setSavingThresholds] = useState(false)

  // 패널 매칭 (recruiting 상태)
  const [availablePanels, setAvailablePanels] = useState<AvailablePanel[]>([])
  const [selectedPanelIds, setSelectedPanelIds] = useState<Set<string>>(new Set())
  const [matchedPanelIds, setMatchedPanelIds] = useState<Set<string>>(new Set())
  const [panelFilter, setPanelFilter] = useState({ gender: '', age_group: '', skin_type: '' })
  const [savingMatching, setSavingMatching] = useState(false)

  // 패널별 응답 현황 (testing 상태)
  const [panelResponseMap, setPanelResponseMap] = useState<Record<string, number>>({})

  // 패널 교체 (testing 상태)
  const [testingEditMode, setTestingEditMode] = useState(false)
  const [testingAvailablePanels, setTestingAvailablePanels] = useState<AvailablePanel[]>([])
  const [testingDropIds, setTestingDropIds] = useState<Set<string>>(new Set())
  const [testingAddIds, setTestingAddIds] = useState<Set<string>>(new Set())
  const [testingFilter, setTestingFilter] = useState({ gender: '', age_group: '', skin_type: '' })
  const [savingTestingChange, setSavingTestingChange] = useState(false)

  // 패널 섹션 토글 (analyzing/completed 상태에서 접힘)
  const [panelSectionOpen, setPanelSectionOpen] = useState(true)

  // 분석 응답 데이터 (analyzing/completed 상태)
  const [surveyResponses, setSurveyResponses] = useState<{ panel_id: string; responses: Record<string, number>; open_weakness?: string; open_improvement?: string }[]>([])

  // 패널 상세 팝업
  const [panelDetail, setPanelDetail] = useState<PanelDetail | null>(null)
  const [loadingPanelDetail, setLoadingPanelDetail] = useState(false)

  // 패널 설문 응답 보기
  const [panelSurveyView, setPanelSurveyView] = useState<{
    panelId: string
    panelName: string
    responses: Record<string, number> | null
    open_weakness?: string
    open_improvement?: string
  } | null>(null)
  const [loadingPanelSurvey, setLoadingPanelSurvey] = useState(false)

  useEffect(() => { load() }, [id])

  async function load() {
    const [{ data: proj }, { data: survs }, { data: tmpls }] = await Promise.all([
      supabase.from('projects').select('*').eq('id', id).single(),
      supabase.from('surveys').select('*').eq('project_id', id).order('created_at'),
      supabase.from('survey_templates').select('*').order('is_default', { ascending: false }),
    ])
    setProject(proj)
    setSurveys(survs || [])
    setTemplates(tmpls || [])

    // 임계값 초기화
    if (proj) {
      setThresholds({
        ks_warn: Math.round((proj.ks_warn_threshold ?? 0.05) * 100),
        ks_danger: Math.round((proj.ks_danger_threshold ?? 0.10) * 100),
        satisfaction: proj.satisfaction_threshold ?? 3.0,
      })
    }

    // draft 상태에서 기존 설문 문항 로드
    if (proj?.status === 'draft' && survs?.length) {
      setEditQuestions((survs[0].questions || []).map((q: SurveyQuestion) => ({ ...q })))
    }

    // 매칭된 패널 조회
    if (survs?.length) {
      const surveyIds = survs.map((s) => s.id)
      const { data: panels } = await supabase
        .from('survey_panels')
        .select('id, status, matched_at, panel_id, panel:profiles!panel_id(name, panel_profiles(gender, age_group, skin_type, skin_concern))')
        .in('survey_id', surveyIds)
        .order('matched_at', { ascending: false })

      const panelData = (panels as unknown as MatchedPanel[]) || []
      setMatchedPanels(panelData)

      // 현재 매칭된 panel_id Set 구성
      const ids = new Set(panelData.map((p) => p.panel_id))
      setMatchedPanelIds(ids)
      setSelectedPanelIds(new Set(ids))
    } else {
      setMatchedPanelIds(new Set())
      setSelectedPanelIds(new Set())
    }

    // recruiting 상태: 전체 패널 목록 로드
    if (proj?.status === 'recruiting') {
      const { data: allPanels } = await supabase
        .from('profiles')
        .select('id, name, panel_profiles(*)')
        .eq('role', 'panel')
        .order('name')
      setAvailablePanels((allPanels as unknown as AvailablePanel[]) || [])
    }

    // testing 상태: 패널별 응답 횟수 로드 + 교체 가능 패널 목록
    if (proj?.status === 'testing' && survs?.length) {
      const surveyId = survs[0].id
      const { data: responses } = await supabase
        .from('survey_responses')
        .select('panel_id')
        .eq('survey_id', surveyId)

      const countMap: Record<string, number> = {}
      for (const r of responses || []) {
        countMap[r.panel_id] = (countMap[r.panel_id] ?? 0) + 1
      }
      setPanelResponseMap(countMap)

      // 전체 패널 중 현재 매칭되지 않은 패널만 교체 후보로
      const { data: allPanels } = await supabase
        .from('profiles')
        .select('id, name, panel_profiles(*)')
        .eq('role', 'panel')
        .order('name')
      setTestingAvailablePanels((allPanels as unknown as AvailablePanel[]) || [])
    }

    // analyzing/completed 상태: 전체 응답 로드 + 패널 섹션 접기
    if ((proj?.status === 'analyzing' || proj?.status === 'completed') && survs?.length) {
      const surveyId = survs[0].id
      const { data: responses } = await supabase
        .from('survey_responses')
        .select('panel_id, responses, open_weakness, open_improvement')
        .eq('survey_id', surveyId)
      setSurveyResponses(responses || [])
      setPanelSectionOpen(false)
    }
  }

  function togglePanelMatch(panelId: string) {
    const next = new Set(selectedPanelIds)
    if (next.has(panelId)) next.delete(panelId)
    else next.add(panelId)
    setSelectedPanelIds(next)
  }

  async function saveMatching() {
    if (!surveys.length) return
    setSavingMatching(true)
    const surveyId = surveys[0].id

    const toAdd = Array.from(selectedPanelIds).filter((pid) => !matchedPanelIds.has(pid))
    const toRemove = Array.from(matchedPanelIds).filter((pid) => !selectedPanelIds.has(pid))

    if (toAdd.length > 0) {
      await supabase.from('survey_panels').insert(
        toAdd.map((panel_id) => ({ survey_id: surveyId, panel_id }))
      )
    }
    if (toRemove.length > 0) {
      await supabase.from('survey_panels')
        .delete()
        .eq('survey_id', surveyId)
        .in('panel_id', toRemove)
    }

    setSavingMatching(false)
    load()
  }

  async function saveTestingChanges() {
    if (!surveys.length) return
    setSavingTestingChange(true)
    const surveyId = surveys[0].id

    if (testingDropIds.size > 0) {
      await supabase.from('survey_panels')
        .delete()
        .eq('survey_id', surveyId)
        .in('panel_id', Array.from(testingDropIds))
    }
    if (testingAddIds.size > 0) {
      await supabase.from('survey_panels').insert(
        Array.from(testingAddIds).map((panel_id) => ({ survey_id: surveyId, panel_id }))
      )
    }

    setSavingTestingChange(false)
    setTestingEditMode(false)
    setTestingDropIds(new Set())
    setTestingAddIds(new Set())
    load()
  }

  async function openPanelSurvey(panelId: string, panelName: string) {
    if (!surveys.length) return
    setLoadingPanelSurvey(true)
    setPanelSurveyView(null)
    const { data } = await supabase
      .from('survey_responses')
      .select('responses, open_weakness, open_improvement')
      .eq('survey_id', surveys[0].id)
      .eq('panel_id', panelId)
      .single()
    setPanelSurveyView({
      panelId,
      panelName,
      responses: data?.responses ?? null,
      open_weakness: data?.open_weakness,
      open_improvement: data?.open_improvement,
    })
    setLoadingPanelSurvey(false)
  }

  async function openPanelDetail(panelId: string) {
    setLoadingPanelDetail(true)
    setPanelDetail(null)
    const { data } = await supabase
      .from('profiles')
      .select('id, name, phone, last_login_at, created_at, panel_profiles(*)')
      .eq('id', panelId)
      .single()
    setPanelDetail(data as unknown as PanelDetail)
    setLoadingPanelDetail(false)
  }

  function computeAnalysis() {
    if (!project || !surveys.length || !surveyResponses.length) return null
    const questions: SurveyQuestion[] = surveys[0].questions || []
    const total = surveyResponses.length
    const warnT = project.ks_warn_threshold
    const dangerT = project.ks_danger_threshold
    const satT = project.satisfaction_threshold

    // KS 분석
    const ksQuestions = questions.filter((q) => q.isKillSignal && q.type === 'scale')
    const killSignals = ksQuestions.map((q) => {
      const vals = surveyResponses.map((r) => r.responses[q.key]).filter((v) => v != null)
      const triggered = vals.filter((v) => v >= 3).length
      const ratio = vals.length > 0 ? triggered / vals.length : 0
      const level = ratio >= dangerT ? 'danger' : ratio >= warnT ? 'warning' : 'safe'
      return { key: q.key, label: q.label, ratio, level, triggered, total: vals.length }
    })

    // 문항별 평균 (비KS 척도)
    const scaleQuestions = questions.filter((q) => q.type === 'scale' && !q.isKillSignal && q.group !== 'verification')
    const itemScores = scaleQuestions.map((q) => {
      const vals = surveyResponses.map((r) => r.responses[q.key]).filter((v) => v != null)
      const mean = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
      return { key: q.key, label: q.label, group: q.group, mean }
    })

    // 그룹별 평균
    const groupMean = (group: string) => {
      const items = itemScores.filter((s) => s.group === group)
      return items.length > 0 ? items.reduce((a, b) => a + b.mean, 0) / items.length : 0
    }

    const satisfactionMean = groupMean('overall') || itemScores.reduce((a, b) => a + b.mean, 0) / (itemScores.length || 1)
    const purchaseMean = itemScores.find((s) => s.key === '구매의향')?.mean ?? groupMean('overall')
    const recommendMean = itemScores.find((s) => s.key === '추천의향')?.mean ?? groupMean('overall')

    // 판정
    const hasDanger = killSignals.some((k) => k.level === 'danger')
    const hasWarning = killSignals.some((k) => k.level === 'warning')
    let verdict: 'GO' | 'CONDITIONAL GO' | 'NO-GO'
    if (satisfactionMean < satT) verdict = 'NO-GO'
    else if (hasDanger || hasWarning) verdict = 'CONDITIONAL GO'
    else verdict = 'GO'

    // 성공 확률
    const satScore = (satisfactionMean - 1) / 3  // 0~1 정규화
    const ksPenalty = killSignals.reduce((acc, k) => {
      if (k.level === 'danger') return acc - 0.15
      if (k.level === 'warning') return acc - 0.07
      return acc
    }, 0)
    const successProb = Math.max(5, Math.min(95, Math.round((satScore + ksPenalty) * 100)))

    // 주관식 피드백 샘플
    const weaknesses = surveyResponses.map((r) => r.open_weakness).filter(Boolean) as string[]
    const improvements = surveyResponses.map((r) => r.open_improvement).filter(Boolean) as string[]

    return { verdict, satisfactionMean, purchaseMean, recommendMean, killSignals, itemScores, successProb, total, weaknesses, improvements }
  }

  async function saveThresholds() {
    if (thresholds.ks_warn >= thresholds.ks_danger) return // 역전 방지
    setSavingThresholds(true)
    await supabase.from('projects').update({
      ks_warn_threshold: thresholds.ks_warn / 100,
      ks_danger_threshold: thresholds.ks_danger / 100,
      satisfaction_threshold: thresholds.satisfaction,
    }).eq('id', id)
    setSavingThresholds(false)
    setEditingThresholds(false)
    load()
  }

  async function createSurvey() {
    const template = templates.find((t) => t.id === selectedTemplate)
    await supabase.from('surveys').insert({
      project_id: id,
      template_id: selectedTemplate || null,
      title: surveyTitle || `${project?.product_name} 설문`,
      questions: template?.questions || [],
      day_checkpoint: [1],
    })
    setShowCreateSurvey(false)
    setSurveyTitle('')
    load()
  }

  function loadTemplateIntoSurvey(templateId: string) {
    const tmpl = templates.find((t) => t.id === templateId)
    if (tmpl) {
      setEditTemplateId(templateId)
      // 템플릿 원본을 수정하지 않도록 깊은 복사
      setEditQuestions(tmpl.questions.map((q) => ({ ...q })))
    }
  }

  function updateEditQuestion(index: number, updates: Partial<SurveyQuestion>) {
    const qs = [...editQuestions]
    qs[index] = { ...qs[index], ...updates }
    setEditQuestions(qs)
  }

  function removeEditQuestion(index: number) {
    setEditQuestions(editQuestions.filter((_, i) => i !== index))
  }

  function moveEditQuestion(index: number, direction: -1 | 1) {
    const qs = [...editQuestions]
    const next = index + direction
    if (next < 0 || next >= qs.length) return
    ;[qs[index], qs[next]] = [qs[next], qs[index]]
    setEditQuestions(qs)
  }

  function addEditQuestion(group: QuestionGroup) {
    const isKS = group === 'killsignal'
    const newQ: SurveyQuestion = {
      key: `${isKS ? 'KS_' : ''}q_${Date.now()}`,
      label: '',
      type: 'scale',
      scale: 4,
      scaleLabels: [...DEFAULT_SCALE_LABELS],
      isKillSignal: isKS,
      group,
      order: editQuestions.length + 1,
    }
    setEditQuestions([...editQuestions, newQ])
  }

  function addEditTextQuestion() {
    const newQ: SurveyQuestion = {
      key: `open_${Date.now()}`,
      label: '',
      type: 'text',
      isKillSignal: false,
      group: 'overall',
      order: editQuestions.length + 1,
    }
    setEditQuestions([...editQuestions, newQ])
  }

  function addEditChoiceQuestion() {
    const newQ: SurveyQuestion = {
      key: `choice_${Date.now()}`,
      label: '',
      type: 'choice',
      choices: ['예', '아니오'],
      isKillSignal: false,
      group: 'overall',
      order: editQuestions.length + 1,
    }
    setEditQuestions([...editQuestions, newQ])
  }

  async function saveSurveyDraft() {
    if (!surveys.length) return
    setSavingSurvey(true)
    await supabase.from('surveys').update({ questions: editQuestions }).eq('id', surveys[0].id)
    setSavingSurvey(false)
    load()
  }

  async function confirmSurveyByAdmin() {
    if (!surveys.length || editQuestions.length === 0) return
    setSavingSurvey(true)
    await supabase.from('surveys').update({ questions: editQuestions }).eq('id', surveys[0].id)
    await supabase.from('projects').update({ status: 'confirmed' }).eq('id', id)
    setSavingSurvey(false)
    load()
  }

  async function updateStatus(newStatus: string) {
    await supabase.from('projects').update({ status: newStatus }).eq('id', id)

    // testing 시작 시 설문도 active로 변경
    if (newStatus === 'testing' && surveys.length > 0) {
      await supabase.from('surveys').update({ status: 'active' }).eq('project_id', id)
    }
    // completed 시 설문도 closed로 변경
    if (newStatus === 'completed' && surveys.length > 0) {
      await supabase.from('surveys').update({ status: 'closed' }).eq('project_id', id)
    }

    load()
  }

  if (!project) return <p className="text-text-muted">로딩중...</p>

  const statusFlow: { from: string; to: string; label: string }[] = [
    { from: 'pending', to: 'draft', label: '승인' },
    { from: 'approved', to: 'recruiting', label: '패널 모집 시작' },
    { from: 'recruiting', to: 'testing', label: '테스트 시작' },
    { from: 'testing', to: 'analyzing', label: '분석 시작' },
    { from: 'analyzing', to: 'completed', label: '완료 처리' },
  ]
  const nextStatus = statusFlow.find((s) => s.from === project.status)
  const canReject = project.status === 'pending'

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/admin/projects')} className="text-text-muted hover:text-text">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-text">{project.product_name}</h1>
          <p className="text-sm text-text-muted mt-1">{project.plan?.toUpperCase()} / 패널 {project.panel_size}명 / {project.test_duration}일</p>
        </div>
        <StatusBadge status={project.status as ProjectStatus} />
        {canReject && (
          <Button size="sm" variant="danger" onClick={() => updateStatus('rejected')}>
            반려
          </Button>
        )}
        {nextStatus && (
          <Button size="sm" onClick={() => updateStatus(nextStatus.to)}>
            {nextStatus.label}
          </Button>
        )}
      </div>

      {/* 고객 승인 대기 안내 */}
      {project.status === 'confirmed' && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-blue-700">고객 설문 승인 대기 중</p>
            <p className="text-xs text-blue-600 mt-1">
              설문이 확정되었습니다. 고객이 설문 내용을 검토하고 승인하면 패널 모집을 시작할 수 있습니다.
            </p>
          </div>
        </div>
      )}

      {/* 프로젝트 설정 */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <CardTitle>프로젝트 설정</CardTitle>
          {!editingThresholds ? (
            <button
              onClick={() => setEditingThresholds(true)}
              className="text-xs px-3 py-1.5 border border-border rounded-lg text-text-muted hover:border-navy/30 hover:text-navy transition-all"
            >
              편집
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => { setEditingThresholds(false); load() }}
                className="text-xs px-3 py-1.5 border border-border rounded-lg text-text-muted hover:border-border transition-all"
              >
                취소
              </button>
              <Button size="sm" onClick={saveThresholds} loading={savingThresholds}>
                저장
              </Button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {/* 카테고리 — 읽기 전용 */}
          <div>
            <span className="text-text-muted text-xs">카테고리</span>
            <p className="font-medium mt-1">{project.product_category || '-'}</p>
          </div>

          {/* KS 경고 임계값 */}
          <div>
            <label className="text-text-muted text-xs">KS 경고 임계값</label>
            {editingThresholds ? (
              <div className="flex items-center gap-1 mt-1">
                <input
                  type="number"
                  min={1} max={99} step={1}
                  value={thresholds.ks_warn}
                  onChange={(e) => setThresholds({ ...thresholds, ks_warn: Number(e.target.value) })}
                  className="w-16 px-2 py-1 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 text-right"
                />
                <span className="text-text-muted">%</span>
              </div>
            ) : (
              <p className="font-medium mt-1">{thresholds.ks_warn}%</p>
            )}
          </div>

          {/* KS 위험 임계값 */}
          <div>
            <label className="text-text-muted text-xs">KS 위험 임계값</label>
            {editingThresholds ? (
              <div className="flex items-center gap-1 mt-1">
                <input
                  type="number"
                  min={1} max={99} step={1}
                  value={thresholds.ks_danger}
                  onChange={(e) => setThresholds({ ...thresholds, ks_danger: Number(e.target.value) })}
                  className="w-16 px-2 py-1 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 text-right"
                />
                <span className="text-text-muted">%</span>
              </div>
            ) : (
              <p className="font-medium mt-1">{thresholds.ks_danger}%</p>
            )}
          </div>

          {/* 만족도 기준 */}
          <div>
            <label className="text-text-muted text-xs">만족도 기준</label>
            {editingThresholds ? (
              <div className="flex items-center gap-1 mt-1">
                <input
                  type="number"
                  min={1} max={4} step={0.1}
                  value={thresholds.satisfaction}
                  onChange={(e) => setThresholds({ ...thresholds, satisfaction: Number(e.target.value) })}
                  className="w-16 px-2 py-1 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 text-right"
                />
                <span className="text-text-muted">점</span>
              </div>
            ) : (
              <p className="font-medium mt-1">{thresholds.satisfaction}점</p>
            )}
          </div>
        </div>

        {/* 편집 중 유효성 안내 */}
        {editingThresholds && thresholds.ks_warn >= thresholds.ks_danger && (
          <p className="mt-3 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            ⚠ KS 경고 임계값은 위험 임계값보다 낮아야 합니다.
          </p>
        )}
      </Card>

      {/* 설문 목록 */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <CardTitle>설문</CardTitle>
          {project.status !== 'confirmed' && project.status !== 'approved' && project.status !== 'recruiting' && project.status !== 'testing' && project.status !== 'analyzing' && project.status !== 'completed' && (
            <Button size="sm" variant="secondary" onClick={() => setShowCreateSurvey(true)}>설문 추가</Button>
          )}
        </div>

        {surveys.length === 0 ? (
          project.status === 'draft' ? (
            <p className="text-sm text-text-muted py-4 text-center">고객이 설문을 설정 중입니다. 설문 확정 → 고객 승인 후 패널 매칭이 가능합니다.</p>
          ) : (
            <p className="text-sm text-text-muted py-4">아직 설문이 없습니다. 설문을 추가해주세요.</p>
          )
        ) : (
          <div className="space-y-2">
            {surveys.map((s) => {
              const isOpen = expandedSurveyId === s.id
              const groupMap: Record<string, string> = {
                killsignal: 'Kill Signal', usage: '사용감', function: '기능성',
                claim_risk: 'Claim Risk', verification: '검증문항', overall: '종합평가',
              }
              return (
                <div key={s.id} className="border border-border rounded-lg overflow-hidden">
                  {/* 헤더 행 — 클릭으로 토글 */}
                  <button
                    type="button"
                    onClick={() => setExpandedSurveyId(isOpen ? null : s.id)}
                    className="w-full flex items-center gap-4 px-4 py-3 bg-white hover:bg-surface/60 transition-colors text-left"
                  >
                    <svg
                      className={`w-4 h-4 text-text-muted flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    <span className="flex-1 text-sm font-medium text-text">{s.title}</span>
                    <span className="text-xs text-text-muted">{s.questions?.length || 0}문항</span>
                    <span className="text-xs text-text-muted">1회 응답</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      s.status === 'active' ? 'bg-go-bg text-go' :
                      s.status === 'closed' ? 'bg-surface-dark text-text-muted' :
                      'bg-cgo-bg text-cgo'
                    }`}>
                      {s.status === 'active' ? '진행중' : s.status === 'closed' ? '종료' : '초안'}
                    </span>
                  </button>

                  {/* 문항 목록 — 토글 */}
                  {isOpen && (
                    <div className="border-t border-border bg-surface/40 px-4 py-3">
                      {(!s.questions || s.questions.length === 0) ? (
                        <p className="text-sm text-text-muted text-center py-4">문항이 없습니다.</p>
                      ) : (
                        <div className="space-y-1">
                          {s.questions.map((q, qi) => (
                            <div key={q.key} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
                              <span className="text-xs text-text-muted w-6 flex-shrink-0 pt-0.5">{qi + 1}.</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-text leading-snug">{q.label || '(내용 없음)'}</p>
                                {q.type === 'scale' && q.scaleLabels && (
                                  <div className="flex gap-2 mt-1 flex-wrap">
                                    {q.scaleLabels.map((lbl, li) => (
                                      <span key={li} className="text-xs text-text-muted bg-surface-dark px-1.5 py-0.5 rounded">
                                        {li + 1}. {lbl}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {q.type === 'choice' && q.choices && (
                                  <div className="flex gap-2 mt-1 flex-wrap">
                                    {q.choices.map((ch, ci) => (
                                      <span key={ci} className="text-xs text-text-muted bg-surface-dark px-1.5 py-0.5 rounded">
                                        {ch}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {q.isKillSignal && (
                                  <span className="text-xs px-1.5 py-0.5 bg-nogo-bg text-nogo rounded font-medium">KS</span>
                                )}
                                {q.group && (
                                  <span className="text-xs text-text-muted bg-surface-dark px-1.5 py-0.5 rounded">
                                    {groupMap[q.group] || q.group}
                                  </span>
                                )}
                                <span className="text-xs text-text-muted">
                                  {q.type === 'scale' ? '4점' : q.type === 'choice' ? '객관식' : '주관식'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* 설문 문항 편집 (draft 상태에서 설문이 존재할 때) */}
      {project.status === 'draft' && surveys.length > 0 && (
        <Card className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <CardTitle>설문 문항 편집</CardTitle>
            <span className="text-sm text-text-muted">{editQuestions.length}개 문항</span>
          </div>

          {/* 템플릿 불러오기 */}
          <div className="mb-5 p-3 bg-surface rounded-lg">
            <p className="text-xs font-medium text-text mb-2">템플릿으로 초기화</p>
            <div className="flex gap-2">
              <select
                value={editTemplateId}
                onChange={(e) => setEditTemplateId(e.target.value)}
                className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
              >
                <option value="">템플릿 선택...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.questions?.length || 0}문항){t.is_default ? ' [기본]' : ''}
                  </option>
                ))}
              </select>
              <Button size="sm" variant="secondary" onClick={() => loadTemplateIntoSurvey(editTemplateId)} disabled={!editTemplateId}>
                불러오기
              </Button>
            </div>
            <p className="text-xs text-text-muted mt-1.5">불러오면 현재 문항이 교체됩니다. 원본 템플릿은 변경되지 않습니다.</p>
          </div>

          {/* 문항 목록 (편집 가능) */}
          {editQuestions.length > 0 ? (
            <div className="space-y-2 mb-4">
              {editQuestions.map((q, i) => (
                <SurveyQuestionCard
                  key={`${q.key}-${i}`}
                  question={{ ...q, _index: i }}
                  index={i}
                  total={editQuestions.length}
                  expandedKey={expandedKey}
                  onToggleExpand={(key) => setExpandedKey(expandedKey === key ? null : key)}
                  onUpdate={updateEditQuestion}
                  onRemove={removeEditQuestion}
                  onMove={moveEditQuestion}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted py-4 text-center mb-4">
              위에서 템플릿을 불러오거나 문항을 직접 추가하세요.
            </p>
          )}

          {/* 문항 추가 */}
          <div className="mb-4 p-3 border border-dashed border-border rounded-lg">
            <p className="text-xs font-medium text-text-muted mb-2">문항 추가</p>
            <div className="flex flex-wrap gap-2">
              {QUESTION_GROUPS.map((g) => (
                <button
                  key={g.key}
                  onClick={() => addEditQuestion(g.key)}
                  className="text-xs px-2.5 py-1 border border-border rounded-lg hover:border-navy/30 hover:bg-surface/50 transition-all"
                >
                  + {g.label}
                </button>
              ))}
              <button
                onClick={addEditTextQuestion}
                className="text-xs px-2.5 py-1 border border-border rounded-lg hover:border-navy/30 hover:bg-surface/50 transition-all"
              >
                + 주관식
              </button>
              <button
                onClick={addEditChoiceQuestion}
                className="text-xs px-2.5 py-1 border border-border rounded-lg hover:border-navy/30 hover:bg-surface/50 transition-all"
              >
                + 객관식
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-3 border-t border-border">
            <Button size="sm" variant="secondary" onClick={saveSurveyDraft} loading={savingSurvey} disabled={editQuestions.length === 0}>
              임시 저장
            </Button>
            <Button size="sm" onClick={confirmSurveyByAdmin} loading={savingSurvey} disabled={editQuestions.length === 0}>
              설문 확정
            </Button>
            {editQuestions.length === 0 && (
              <span className="text-xs text-text-muted self-center">문항이 있어야 확정할 수 있습니다</span>
            )}
          </div>
        </Card>
      )}

      {/* 패널 매칭 — recruiting 상태일 때 인라인 매칭 UI */}
      {project.status === 'recruiting' && (() => {
        const tc = (project as unknown as { target_cohort?: { genders: string[]; ageGroups: string[]; skinTypes: string[] } })?.target_cohort

        // 필터 적용
        const filtered = availablePanels.filter((p) => {
          const pp = p.panel_profiles
          if (!pp?.is_available) return false
          if (panelFilter.gender && pp.gender !== panelFilter.gender) return false
          if (panelFilter.age_group && pp.age_group !== panelFilter.age_group) return false
          if (panelFilter.skin_type && pp.skin_type !== panelFilter.skin_type) return false
          return true
        })
        const selectedList = filtered.filter((p) => selectedPanelIds.has(p.id))
        const unselectedList = filtered.filter((p) => !selectedPanelIds.has(p.id))
        const toAdd = Array.from(selectedPanelIds).filter((pid) => !matchedPanelIds.has(pid)).length
        const toRemove = Array.from(matchedPanelIds).filter((pid) => !selectedPanelIds.has(pid)).length
        const hasChanges = toAdd > 0 || toRemove > 0

        return (
          <Card className="mt-6">
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <CardTitle>패널 매칭</CardTitle>
                <Badge variant={selectedPanelIds.size >= project.panel_size ? 'go' : 'warning'}>
                  {selectedPanelIds.size} / {project.panel_size}명
                </Badge>
              </div>
              <Button
                size="sm"
                onClick={saveMatching}
                loading={savingMatching}
                disabled={!hasChanges}
              >
                매칭 저장
              </Button>
            </div>

            {/* 변경 미리보기 */}
            {hasChanges && (
              <div className="mb-4 px-3 py-2 bg-surface rounded-lg text-xs flex gap-3">
                {toAdd > 0 && <span className="text-go font-medium">+ {toAdd}명 추가</span>}
                {toRemove > 0 && <span className="text-nogo font-medium">− {toRemove}명 해제</span>}
                <span className="text-text-muted ml-auto">저장 전까지 반영되지 않습니다</span>
              </div>
            )}

            {/* 고객 요청 코호트 */}
            {tc && (tc.genders?.length > 0 || tc.ageGroups?.length > 0 || tc.skinTypes?.length > 0) && (
              <div className="mb-4 px-3 py-2 bg-navy/5 border border-navy/10 rounded-lg">
                <p className="text-xs font-medium text-navy mb-1.5">고객 요청 코호트</p>
                <div className="flex flex-wrap gap-2">
                  {tc.genders?.length > 0 && (
                    <span className="text-xs px-2 py-0.5 bg-white border border-border rounded-full">성별: {tc.genders.join(', ')}</span>
                  )}
                  {tc.ageGroups?.length > 0 && (
                    <span className="text-xs px-2 py-0.5 bg-white border border-border rounded-full">연령: {tc.ageGroups.join(', ')}</span>
                  )}
                  {tc.skinTypes?.length > 0 && (
                    <span className="text-xs px-2 py-0.5 bg-white border border-border rounded-full">피부: {tc.skinTypes.join(', ')}</span>
                  )}
                </div>
              </div>
            )}

            {/* 필터 */}
            <div className="mb-4 flex flex-wrap gap-2">
              <select
                value={panelFilter.gender}
                onChange={(e) => setPanelFilter({ ...panelFilter, gender: e.target.value })}
                className="px-3 py-1.5 border border-border rounded-lg text-sm"
              >
                <option value="">전체 성별</option>
                <option>여성</option><option>남성</option>
              </select>
              <select
                value={panelFilter.age_group}
                onChange={(e) => setPanelFilter({ ...panelFilter, age_group: e.target.value })}
                className="px-3 py-1.5 border border-border rounded-lg text-sm"
              >
                <option value="">전체 연령</option>
                {['10대','20대','30대','40대','50대 이상'].map((a) => <option key={a}>{a}</option>)}
              </select>
              <select
                value={panelFilter.skin_type}
                onChange={(e) => setPanelFilter({ ...panelFilter, skin_type: e.target.value })}
                className="px-3 py-1.5 border border-border rounded-lg text-sm"
              >
                <option value="">전체 피부타입</option>
                {['건성','복합성','지성','중성','민감성'].map((s) => <option key={s}>{s}</option>)}
              </select>
              <span className="ml-auto self-center text-xs text-text-muted">{filtered.length}명 검색됨</span>
            </div>

            {/* 선택된 패널 */}
            {selectedList.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-go">선택됨 ({selectedList.length}명)</span>
                  <button
                    onClick={() => {
                      const next = new Set(selectedPanelIds)
                      filtered.forEach((p) => next.delete(p.id))
                      setSelectedPanelIds(next)
                    }}
                    className="text-xs text-text-muted hover:text-nogo"
                  >
                    필터 내 전체 해제
                  </button>
                </div>
                <div className="space-y-1 max-h-52 overflow-y-auto">
                  {selectedList.map((p) => {
                    const isNew = !matchedPanelIds.has(p.id)
                    const pp = p.panel_profiles
                    return (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 p-2.5 rounded-lg border border-navy/20 bg-navy/5 hover:bg-navy/10 transition-all"
                      >
                        <input type="checkbox" checked readOnly onClick={() => togglePanelMatch(p.id)} className="w-4 h-4 rounded accent-navy cursor-pointer" />
                        <button onClick={() => openPanelDetail(p.id)} className="text-sm font-medium flex-1 text-left text-navy hover:underline">
                          {p.name}
                        </button>
                        <span className="text-xs text-text-muted">
                          {pp?.gender} / {pp?.age_group} / {pp?.skin_type}
                        </span>
                        {pp?.skin_concern && (
                          <span className="text-xs text-text-muted">{pp.skin_concern}</span>
                        )}
                        {isNew && <Badge variant="info">NEW</Badge>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 미선택 패널 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-text-muted">사용 가능한 패널 ({unselectedList.length}명)</span>
                <button
                  onClick={() => {
                    const next = new Set(selectedPanelIds)
                    filtered.forEach((p) => next.add(p.id))
                    setSelectedPanelIds(next)
                  }}
                  className="text-xs text-navy hover:underline"
                >
                  필터 내 전체 선택
                </button>
              </div>
              {unselectedList.length === 0 ? (
                <p className="text-sm text-text-muted py-4 text-center">
                  {filtered.length === 0 ? '필터 조건에 맞는 패널이 없습니다.' : '모든 패널이 선택되었습니다.'}
                </p>
              ) : (
                <div className="space-y-1 max-h-72 overflow-y-auto">
                  {unselectedList.map((p) => {
                    const pp = p.panel_profiles
                    return (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:border-navy/30 hover:bg-surface/50 transition-all"
                      >
                        <input type="checkbox" checked={false} readOnly onClick={() => togglePanelMatch(p.id)} className="w-4 h-4 rounded cursor-pointer" />
                        <button onClick={() => openPanelDetail(p.id)} className="text-sm font-medium flex-1 text-left hover:text-navy hover:underline">
                          {p.name}
                        </button>
                        <span className="text-xs text-text-muted">
                          {pp?.gender} / {pp?.age_group} / {pp?.skin_type}
                        </span>
                        {pp?.skin_concern && (
                          <span className="text-xs text-text-muted">{pp.skin_concern}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </Card>
        )
      })()}

      {/* 매칭된 패널 목록 — recruiting 외 상태에서 조회용 */}
      {project.status !== 'recruiting' && matchedPanels.length > 0 && (() => {
        const isTesting = project.status === 'testing'
        const isAnalyzing = project.status === 'analyzing' || project.status === 'completed'

        // 전체 설문 진행률 계산 (1회 이상 응답한 패널 수)
        const respondedCount = isTesting
          ? matchedPanels.filter((mp) => (panelResponseMap[mp.panel_id] ?? 0) > 0).length
          : 0
        const progressPct = matchedPanels.length > 0 ? Math.round((respondedCount / matchedPanels.length) * 100) : 0

        return (
          <Card className="mt-6">
            {/* 헤더 */}
            <div className="flex items-center gap-2 mb-4">
              <button
                type="button"
                onClick={() => setPanelSectionOpen(!panelSectionOpen)}
                className="flex items-center gap-2 flex-1 text-left"
              >
                <svg
                  className={`w-4 h-4 text-text-muted flex-shrink-0 transition-transform ${panelSectionOpen ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                <span className="text-base font-semibold text-text">매칭된 패널</span>
                <span className="text-sm text-text-muted">{matchedPanels.length}명</span>
                {isAnalyzing && (
                  <span className="text-xs px-2 py-0.5 bg-surface rounded-full text-text-muted border border-border">
                    {panelSectionOpen ? '접기' : '펼치기'}
                  </span>
                )}
              </button>
              {isTesting && !testingEditMode && (
                <button
                  onClick={() => setTestingEditMode(true)}
                  className="text-xs px-3 py-1.5 border border-border rounded-lg text-text-muted hover:border-navy/30 hover:text-navy transition-all flex-shrink-0"
                >
                  패널 교체
                </button>
              )}
              {isTesting && testingEditMode && (
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => { setTestingEditMode(false); setTestingDropIds(new Set()); setTestingAddIds(new Set()) }}
                    className="text-xs px-3 py-1.5 border border-border rounded-lg text-text-muted transition-all"
                  >
                    취소
                  </button>
                  <Button
                    size="sm"
                    onClick={saveTestingChanges}
                    loading={savingTestingChange}
                    disabled={testingDropIds.size === 0 && testingAddIds.size === 0}
                  >
                    저장
                  </Button>
                </div>
              )}
            </div>

            {/* 패널 교체 모드: 변경 미리보기 */}
            {isTesting && testingEditMode && (testingDropIds.size > 0 || testingAddIds.size > 0) && (
              <div className="mb-4 px-3 py-2 bg-surface rounded-lg text-xs flex gap-3">
                {testingDropIds.size > 0 && <span className="text-nogo font-medium">− {testingDropIds.size}명 제거</span>}
                {testingAddIds.size > 0 && <span className="text-go font-medium">+ {testingAddIds.size}명 추가</span>}
                <span className="text-text-muted ml-auto">저장 전까지 반영되지 않습니다</span>
              </div>
            )}

            {/* 패널 내용 — 토글 */}
            {panelSectionOpen && <>

            {/* testing 상태: 전체 진행률 요약 */}
            {isTesting && (
              <div className="mb-5 p-4 bg-surface rounded-xl border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-text">전체 설문 진행률</span>
                  <span className="text-sm font-bold text-navy">{respondedCount} / {matchedPanels.length}명 응답</span>
                </div>
                {/* 진행률 바 */}
                <div className="w-full h-2.5 bg-surface-dark rounded-full overflow-hidden">
                  <div
                    className="h-full bg-navy rounded-full transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-xs text-text-muted">0%</span>
                  <span className="text-xs font-medium text-navy">{progressPct}%</span>
                  <span className="text-xs text-text-muted">100%</span>
                </div>
                {/* 체크포인트 응답 요약 통계 */}
                <div className="mt-3 grid grid-cols-2 gap-3 text-center">
                  <div className="p-2 bg-white rounded-lg border border-border">
                    <p className="text-xs text-text-muted">응답 완료</p>
                    <p className="text-base font-bold text-go">{respondedCount}명</p>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-border">
                    <p className="text-xs text-text-muted">미응답</p>
                    <p className="text-base font-bold text-nogo">{matchedPanels.length - respondedCount}명</p>
                  </div>
                </div>
              </div>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>성별</TableHead>
                  <TableHead>연령대</TableHead>
                  <TableHead>피부타입</TableHead>
                  <TableHead>피부고민</TableHead>
                  <TableHead>매칭일</TableHead>
                  <TableHead>상태</TableHead>
                  {isTesting && <TableHead className="text-center">설문 진행</TableHead>}
                  {isTesting && testingEditMode && <TableHead className="text-center">제거</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {matchedPanels.map((mp) => {
                  const p = mp.panel
                  const pp = p?.panel_profiles
                  const responseCount = isTesting ? (panelResponseMap[mp.panel_id] ?? 0) : 0
                  const hasResponded = responseCount > 0
                  const isComplete = responseCount >= 1

                  const isDropped = testingDropIds.has(mp.panel_id)

                  return (
                    <TableRow key={mp.id} className={
                      isDropped ? 'opacity-40 line-through bg-nogo-bg/20' :
                      isTesting && !hasResponded ? 'bg-nogo-bg/30' : ''
                    }>
                      <TableCell>
                        <button
                          onClick={() => openPanelDetail(mp.panel_id)}
                          className="font-medium text-navy hover:underline text-left"
                        >
                          {p?.name || '-'}
                        </button>
                      </TableCell>
                      <TableCell>{pp?.gender || '-'}</TableCell>
                      <TableCell>{pp?.age_group || '-'}</TableCell>
                      <TableCell>{pp?.skin_type || '-'}</TableCell>
                      <TableCell>{pp?.skin_concern || '-'}</TableCell>
                      <TableCell className="text-text-muted">{new Date(mp.matched_at).toLocaleDateString('ko')}</TableCell>
                      <TableCell>
                        <MatchStatusBadge status={mp.status as PanelMatchStatus} />
                      </TableCell>
                      {isTesting && (
                        <TableCell className="text-center">
                          {hasResponded ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-go">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              응답 완료
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-nogo">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              미응답
                            </span>
                          )}
                        </TableCell>
                      )}
                      {isTesting && testingEditMode && (
                        <TableCell className="text-center">
                          <button
                            onClick={() => {
                              const next = new Set(testingDropIds)
                              if (next.has(mp.panel_id)) next.delete(mp.panel_id)
                              else next.add(mp.panel_id)
                              setTestingDropIds(next)
                            }}
                            className={`text-xs px-2 py-1 rounded-lg border transition-all ${
                              isDropped
                                ? 'border-nogo bg-nogo text-white'
                                : 'border-border text-nogo hover:border-nogo hover:bg-nogo-bg'
                            }`}
                          >
                            {isDropped ? '취소' : '제거'}
                          </button>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>

            {/* 패널 교체 모드: 추가 가능 패널 목록 */}
            {isTesting && testingEditMode && (() => {
              const currentPanelIds = new Set(matchedPanels.map((mp) => mp.panel_id))
              const candidates = testingAvailablePanels.filter((p) => {
                if (currentPanelIds.has(p.id)) return false
                const pp = p.panel_profiles
                if (!pp?.is_available) return false
                if (testingFilter.gender && pp.gender !== testingFilter.gender) return false
                if (testingFilter.age_group && pp.age_group !== testingFilter.age_group) return false
                if (testingFilter.skin_type && pp.skin_type !== testingFilter.skin_type) return false
                return true
              })
              const adding = candidates.filter((p) => testingAddIds.has(p.id))
              const notAdding = candidates.filter((p) => !testingAddIds.has(p.id))

              return (
                <div className="mt-5 pt-5 border-t border-border">
                  <p className="text-sm font-semibold text-text mb-3">교체 패널 추가</p>

                  {/* 필터 */}
                  <div className="mb-3 flex flex-wrap gap-2">
                    <select
                      value={testingFilter.gender}
                      onChange={(e) => setTestingFilter({ ...testingFilter, gender: e.target.value })}
                      className="px-3 py-1.5 border border-border rounded-lg text-sm"
                    >
                      <option value="">전체 성별</option>
                      <option>여성</option><option>남성</option>
                    </select>
                    <select
                      value={testingFilter.age_group}
                      onChange={(e) => setTestingFilter({ ...testingFilter, age_group: e.target.value })}
                      className="px-3 py-1.5 border border-border rounded-lg text-sm"
                    >
                      <option value="">전체 연령</option>
                      {['10대','20대','30대','40대','50대 이상'].map((a) => <option key={a}>{a}</option>)}
                    </select>
                    <select
                      value={testingFilter.skin_type}
                      onChange={(e) => setTestingFilter({ ...testingFilter, skin_type: e.target.value })}
                      className="px-3 py-1.5 border border-border rounded-lg text-sm"
                    >
                      <option value="">전체 피부타입</option>
                      {['건성','복합성','지성','중성','민감성'].map((s) => <option key={s}>{s}</option>)}
                    </select>
                    <span className="ml-auto self-center text-xs text-text-muted">{candidates.length}명 검색됨</span>
                  </div>

                  {/* 추가 예정 패널 */}
                  {adding.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-go mb-1.5">추가 예정 ({adding.length}명)</p>
                      <div className="space-y-1 max-h-36 overflow-y-auto">
                        {adding.map((p) => {
                          const pp = p.panel_profiles
                          return (
                            <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-go/30 bg-go-bg">
                              <button onClick={() => openPanelDetail(p.id)} className="text-sm font-medium flex-1 text-left text-navy hover:underline">
                                {p.name}
                              </button>
                              <span className="text-xs text-text-muted">{pp?.gender} / {pp?.age_group} / {pp?.skin_type}</span>
                              <button
                                onClick={() => { const n = new Set(testingAddIds); n.delete(p.id); setTestingAddIds(n) }}
                                className="text-xs px-2 py-1 rounded-lg border border-go text-go hover:bg-go hover:text-white transition-all"
                              >
                                취소
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* 추가 가능 패널 */}
                  {notAdding.length === 0 ? (
                    <p className="text-sm text-text-muted py-4 text-center">
                      {candidates.length === 0 ? '필터 조건에 맞는 추가 가능 패널이 없습니다.' : '모든 후보 패널이 추가 예정입니다.'}
                    </p>
                  ) : (
                    <div className="space-y-1 max-h-56 overflow-y-auto">
                      {notAdding.map((p) => {
                        const pp = p.panel_profiles
                        return (
                          <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:border-navy/30 hover:bg-surface/50 transition-all">
                            <button onClick={() => openPanelDetail(p.id)} className="text-sm font-medium flex-1 text-left hover:text-navy hover:underline">
                              {p.name}
                            </button>
                            <span className="text-xs text-text-muted">{pp?.gender} / {pp?.age_group} / {pp?.skin_type}</span>
                            {pp?.skin_concern && <span className="text-xs text-text-muted">{pp.skin_concern}</span>}
                            <button
                              onClick={() => { const n = new Set(testingAddIds); n.add(p.id); setTestingAddIds(n) }}
                              className="text-xs px-2 py-1 rounded-lg border border-navy text-navy hover:bg-navy hover:text-white transition-all flex-shrink-0"
                            >
                              추가
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })()}

            </>}
          </Card>
        )
      })()}

      {/* 분석 결과 — analyzing/completed 상태 */}
      {(project.status === 'analyzing' || project.status === 'completed') && surveys.length > 0 && (() => {
        const analysis = computeAnalysis()
        if (!analysis) {
          return (
            <Card className="mt-6">
              <p className="text-sm text-text-muted text-center py-6">응답 데이터를 불러오는 중입니다...</p>
            </Card>
          )
        }

        const { verdict, satisfactionMean, purchaseMean, recommendMean, killSignals, itemScores, successProb, total, weaknesses, improvements } = analysis

        const verdictStyle = verdict === 'GO'
          ? { bg: 'bg-go-bg', border: 'border-go/30', text: 'text-go', label: 'GO', sub: '출시 적합' }
          : verdict === 'CONDITIONAL GO'
          ? { bg: 'bg-cgo-bg', border: 'border-cgo/30', text: 'text-cgo', label: 'CONDITIONAL GO', sub: '조건부 출시 가능' }
          : { bg: 'bg-nogo-bg', border: 'border-nogo/30', text: 'text-nogo', label: 'NO-GO', sub: '출시 보류' }

        const groupLabel: Record<string, string> = {
          killsignal: 'Kill Signal', usage: '사용감', function: '기능성',
          claim_risk: 'Claim Risk', verification: '검증', overall: '종합평가',
        }

        // 그룹별로 itemScores 묶기
        const groups = ['usage', 'function', 'overall', 'claim_risk']
        const groupedItems = groups.map((g) => ({
          group: g,
          label: groupLabel[g] ?? g,
          items: itemScores.filter((s) => s.group === g),
        })).filter((g) => g.items.length > 0)
        const ungrouped = itemScores.filter((s) => !groups.includes(s.group ?? ''))

        return (
          <div className="mt-6 space-y-4">
            {/* 판정 배너 */}
            <div className={`p-5 rounded-xl border ${verdictStyle.bg} ${verdictStyle.border}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">최종 판정</p>
                  <p className={`text-2xl font-bold ${verdictStyle.text}`}>{verdictStyle.label}</p>
                  <p className="text-sm text-text-muted mt-0.5">{verdictStyle.sub}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-text-muted mb-1">성공 확률</p>
                  <p className={`text-4xl font-bold ${verdictStyle.text}`}>{successProb}%</p>
                  <p className="text-xs text-text-muted mt-0.5">응답자 {total}명 기준</p>
                </div>
              </div>
              {/* 성공확률 바 */}
              <div className="w-full h-2.5 bg-white/60 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${
                  verdict === 'GO' ? 'bg-go' : verdict === 'CONDITIONAL GO' ? 'bg-cgo' : 'bg-nogo'
                }`} style={{ width: `${successProb}%` }} />
              </div>
              {/* 핵심 지표 요약 */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { label: '전반 만족도', value: satisfactionMean.toFixed(2), suffix: '/ 4.0' },
                  { label: '구매 의향', value: purchaseMean.toFixed(2), suffix: '/ 4.0' },
                  { label: '추천 의향', value: recommendMean.toFixed(2), suffix: '/ 4.0' },
                ].map((s) => (
                  <div key={s.label} className="bg-white/60 rounded-lg p-3 text-center">
                    <p className="text-xs text-text-muted">{s.label}</p>
                    <p className={`text-xl font-bold mt-0.5 ${verdictStyle.text}`}>{s.value}</p>
                    <p className="text-xs text-text-muted">{s.suffix}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Kill Signal 모니터 */}
            {killSignals.length > 0 && (
              <Card>
                <CardTitle>Kill Signal 모니터</CardTitle>
                <div className="mt-4 space-y-3">
                  {killSignals.map((ks) => (
                    <div key={ks.key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-text truncate flex-1 mr-2">{ks.label}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-sm font-semibold">{(ks.ratio * 100).toFixed(1)}%</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            ks.level === 'danger'  ? 'bg-nogo-bg text-nogo' :
                            ks.level === 'warning' ? 'bg-cgo-bg text-cgo' :
                                                     'bg-go-bg text-go'
                          }`}>
                            {ks.level === 'danger' ? '위험' : ks.level === 'warning' ? '경고' : '안전'}
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-surface-dark rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${
                          ks.level === 'danger'  ? 'bg-nogo' :
                          ks.level === 'warning' ? 'bg-cgo' : 'bg-go'
                        }`} style={{ width: `${Math.min(ks.ratio * 100, 100)}%` }} />
                      </div>
                      <div className="flex justify-between mt-0.5">
                        <span className="text-xs text-text-muted">{ks.triggered}명 트리거</span>
                        <span className="text-xs text-text-muted">경고 {(project.ks_warn_threshold * 100).toFixed(0)}% / 위험 {(project.ks_danger_threshold * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* 문항별 점수 */}
            {itemScores.length > 0 && (
              <Card>
                <CardTitle>문항별 점수</CardTitle>
                <div className="mt-4 space-y-5">
                  {[...groupedItems, ...(ungrouped.length > 0 ? [{ group: 'etc', label: '기타', items: ungrouped }] : [])].map((g) => (
                    <div key={g.group}>
                      <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">{g.label}</p>
                      <div className="space-y-2">
                        {g.items.map((item) => (
                          <div key={item.key}>
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-sm text-text flex-1 mr-2 truncate">{item.label}</span>
                              <span className={`text-sm font-semibold flex-shrink-0 ${
                                item.mean >= 3.5 ? 'text-go' : item.mean >= 3.0 ? 'text-navy' : item.mean >= 2.5 ? 'text-cgo' : 'text-nogo'
                              }`}>{item.mean.toFixed(2)}</span>
                            </div>
                            <div className="w-full h-1.5 bg-surface-dark rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${
                                item.mean >= 3.5 ? 'bg-go' : item.mean >= 3.0 ? 'bg-navy' : item.mean >= 2.5 ? 'bg-cgo' : 'bg-nogo'
                              }`} style={{ width: `${(item.mean / 4) * 100}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* 주관식 피드백 */}
            {(weaknesses.length > 0 || improvements.length > 0) && (
              <Card>
                <CardTitle>주관식 피드백</CardTitle>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {weaknesses.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-text-muted mb-2">아쉬운 점 ({weaknesses.length}건)</p>
                      <ul className="space-y-1.5">
                        {weaknesses.slice(0, 6).map((w, i) => (
                          <li key={i} className="text-sm text-text bg-surface px-3 py-1.5 rounded-lg">· {w}</li>
                        ))}
                        {weaknesses.length > 6 && (
                          <li className="text-xs text-text-muted pl-3">외 {weaknesses.length - 6}건...</li>
                        )}
                      </ul>
                    </div>
                  )}
                  {improvements.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-text-muted mb-2">개선 제안 ({improvements.length}건)</p>
                      <ul className="space-y-1.5">
                        {improvements.slice(0, 6).map((w, i) => (
                          <li key={i} className="text-sm text-text bg-surface px-3 py-1.5 rounded-lg">· {w}</li>
                        ))}
                        {improvements.length > 6 && (
                          <li className="text-xs text-text-muted pl-3">외 {improvements.length - 6}건...</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        )
      })()}

      {/* 패널 상세 팝업 */}
      <Modal
        open={panelDetail !== null || loadingPanelDetail}
        onClose={() => { setPanelDetail(null); setLoadingPanelDetail(false) }}
        title="패널 상세 정보"
        size="md"
      >
        {loadingPanelDetail ? (
          <p className="text-sm text-text-muted text-center py-8">불러오는 중...</p>
        ) : panelDetail ? (() => {
          const pp = panelDetail.panel_profiles
          const tierLabel: Record<string, string> = { basic: 'Basic', standard: 'Standard', premium: 'Premium' }
          const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'
          const fmtTime = (d: string | null) => d ? new Date(d).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'

          return (
            <div className="space-y-5">
              {/* 기본 정보 */}
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">기본 정보</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div>
                    <span className="text-text-muted block text-xs mb-0.5">이름</span>
                    <span className="font-medium">{panelDetail.name}</span>
                  </div>
                  <div>
                    <span className="text-text-muted block text-xs mb-0.5">휴대폰번호</span>
                    <span className="font-medium">{panelDetail.phone || '-'}</span>
                  </div>
                  <div>
                    <span className="text-text-muted block text-xs mb-0.5">가입일</span>
                    <span>{fmt(panelDetail.created_at)}</span>
                  </div>
                  <div>
                    <span className="text-text-muted block text-xs mb-0.5">마지막 접속</span>
                    <span>{fmtTime(panelDetail.last_login_at)}</span>
                  </div>
                </div>
              </div>

              <hr className="border-border" />

              {/* 피부 정보 */}
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">피부 정보</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div>
                    <span className="text-text-muted block text-xs mb-0.5">성별</span>
                    <span>{pp?.gender || '-'}</span>
                  </div>
                  <div>
                    <span className="text-text-muted block text-xs mb-0.5">연령대</span>
                    <span>{pp?.age_group || '-'}</span>
                  </div>
                  <div>
                    <span className="text-text-muted block text-xs mb-0.5">피부타입</span>
                    <span>{pp?.skin_type || '-'}</span>
                  </div>
                  <div>
                    <span className="text-text-muted block text-xs mb-0.5">피부고민</span>
                    <span>{pp?.skin_concern || '-'}</span>
                  </div>
                  <div>
                    <span className="text-text-muted block text-xs mb-0.5">민감성</span>
                    <span>{pp?.is_sensitive ? '민감성' : '해당 없음'}</span>
                  </div>
                  <div>
                    <span className="text-text-muted block text-xs mb-0.5">현재 사용 제품</span>
                    <span>{pp?.current_product || '-'}</span>
                  </div>
                </div>
              </div>

              <hr className="border-border" />

              {/* 샘플 수취 주소 */}
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">샘플 수취 주소</p>
                {pp?.address ? (
                  <div className="p-3 bg-surface rounded-lg text-sm">
                    <p className="font-medium">{pp.address}</p>
                    {pp.address_detail && (
                      <p className="text-text-muted mt-0.5">{pp.address_detail}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-text-muted">등록된 주소가 없습니다.</p>
                )}
              </div>

              <hr className="border-border" />

              {/* 패널 등급 */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">패널 등급</p>
                  <span className={`text-sm font-semibold ${
                    pp?.tier === 'premium' ? 'text-gold' : pp?.tier === 'standard' ? 'text-navy' : 'text-text-muted'
                  }`}>
                    {tierLabel[pp?.tier ?? 'basic'] ?? 'Basic'}
                  </span>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                  pp?.is_available
                    ? 'bg-go-bg text-go border-go/20'
                    : 'bg-surface-dark text-text-muted border-border'
                }`}>
                  {pp?.is_available ? '활동 가능' : '활동 불가'}
                </span>
              </div>

              {/* 설문 응답 보기 버튼 — testing/analyzing/completed 상태일 때만 */}
              {(project.status === 'testing' || project.status === 'analyzing' || project.status === 'completed') && surveys.length > 0 && (
                <>
                  <hr className="border-border" />
                  <button
                    onClick={() => {
                      setPanelDetail(null)
                      openPanelSurvey(panelDetail.id, panelDetail.name)
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-navy text-navy text-sm font-medium hover:bg-navy hover:text-white transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    실시간 설문보기
                  </button>
                </>
              )}
            </div>
          )
        })() : null}
      </Modal>

      {/* 패널 설문 응답 모달 */}
      <Modal
        open={panelSurveyView !== null || loadingPanelSurvey}
        onClose={() => { setPanelSurveyView(null); setLoadingPanelSurvey(false) }}
        title={panelSurveyView ? `${panelSurveyView.panelName} — 설문 응답` : '설문 응답 불러오는 중'}
        size="lg"
      >
        {loadingPanelSurvey ? (
          <p className="text-sm text-text-muted text-center py-8">불러오는 중...</p>
        ) : panelSurveyView ? (() => {
          const questions: SurveyQuestion[] = surveys[0]?.questions || []
          const resp: Record<string, number> = panelSurveyView.responses ?? {}
          const hasAnyResponse = panelSurveyView.responses !== null

          const scaleQuestions = questions.filter((q) => q.type === 'scale')
          const textQuestions = questions.filter((q) => q.type === 'text')
          const scaleLabels = ['', '매우 아니다', '아니다', '그렇다', '매우 그렇다']
          const answeredCount = scaleQuestions.filter((q) => resp[q.key] != null).length

          return (
            <div className="space-y-5">
              {/* 응답 요약 — sticky 고정 */}
              <div className={`sticky top-[-1rem] z-10 -mx-6 px-6 pt-4 pb-3 bg-white border-b border-border`}>
              <div className={`flex items-center gap-3 p-3 rounded-lg border ${hasAnyResponse ? 'bg-surface border-border' : 'bg-nogo-bg/20 border-nogo/20'}`}>
                {!hasAnyResponse && (
                  <svg className="w-4 h-4 text-nogo flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <div className="flex-1">
                  <p className="text-xs text-text-muted mb-1">{hasAnyResponse ? '응답 완료 문항' : '아직 설문을 제출하지 않았습니다 — 전체 문항을 미응답으로 표시합니다'}</p>
                  {hasAnyResponse && (
                    <div className="w-full h-1.5 bg-surface-dark rounded-full overflow-hidden">
                      <div
                        className="h-full bg-navy rounded-full"
                        style={{ width: `${scaleQuestions.length > 0 ? (answeredCount / scaleQuestions.length) * 100 : 0}%` }}
                      />
                    </div>
                  )}
                </div>
                {hasAnyResponse && (
                  <span className="text-sm font-bold text-navy flex-shrink-0">
                    {answeredCount} / {scaleQuestions.length}문항
                  </span>
                )}
              </div>
              </div>{/* /sticky wrapper */}

              {/* 척도 문항 응답 */}
              {scaleQuestions.length > 0 && (
                <div className="space-y-3">
                  {scaleQuestions.map((q) => {
                    const val = resp[q.key]
                    const hasResponse = val != null
                    return (
                      <div key={q.key} className={`p-3 rounded-lg border ${
                        q.isKillSignal
                          ? hasResponse && val >= 3 ? 'border-nogo/40 bg-nogo-bg/30' : 'border-orange-200 bg-orange-50/30'
                          : 'border-border bg-surface'
                      }`}>
                        <div className="flex items-start gap-2 mb-2">
                          {q.isKillSignal && (
                            <span className="text-xs px-1.5 py-0.5 bg-nogo-bg text-nogo border border-nogo/20 rounded font-medium flex-shrink-0">KS</span>
                          )}
                          <p className="text-sm text-text leading-snug">{q.label}</p>
                        </div>
                        {hasResponse ? (
                          <div className="flex gap-1.5">
                            {[1, 2, 3, 4].map((n) => (
                              <div
                                key={n}
                                className={`flex-1 py-1.5 rounded text-center text-xs font-medium transition-all ${
                                  val === n
                                    ? n >= 3 && q.isKillSignal
                                      ? 'bg-nogo text-white'
                                      : 'bg-navy text-white'
                                    : 'bg-white border border-border text-text-muted'
                                }`}
                              >
                                <span className="block text-[10px] leading-none mb-0.5 opacity-70">{n}</span>
                                <span className="hidden sm:block text-[10px] leading-tight">{scaleLabels[n]}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-text-muted italic">미응답</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* 주관식 응답 */}
              {textQuestions.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">주관식 응답</p>
                  {panelSurveyView.open_weakness ? (
                    <div className="p-3 rounded-lg border border-border bg-surface">
                      <p className="text-xs text-text-muted mb-1">아쉬운 점</p>
                      <p className="text-sm text-text">{panelSurveyView.open_weakness}</p>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg border border-border bg-surface">
                      <p className="text-xs text-text-muted mb-1">아쉬운 점</p>
                      <p className="text-xs text-text-muted italic">미응답</p>
                    </div>
                  )}
                  {panelSurveyView.open_improvement ? (
                    <div className="p-3 rounded-lg border border-border bg-surface">
                      <p className="text-xs text-text-muted mb-1">개선 제안</p>
                      <p className="text-sm text-text">{panelSurveyView.open_improvement}</p>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg border border-border bg-surface">
                      <p className="text-xs text-text-muted mb-1">개선 제안</p>
                      <p className="text-xs text-text-muted italic">미응답</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })() : null}
      </Modal>

      {/* 설문 생성 모달 */}
      <Modal open={showCreateSurvey} onClose={() => setShowCreateSurvey(false)} title="설문 추가">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">설문 제목</label>
            <input
              type="text"
              value={surveyTitle}
              onChange={(e) => setSurveyTitle(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
              placeholder={`${project.product_name} 설문`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">템플릿 선택</label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
            >
              <option value="">빈 설문으로 시작</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.questions?.length || 0}문항){t.is_default ? ' [기본]' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowCreateSurvey(false)}>취소</Button>
            <Button onClick={createSurvey}>생성</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
