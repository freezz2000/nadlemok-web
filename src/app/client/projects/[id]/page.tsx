'use client'

import { useEffect, useRef, useState } from 'react'
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

export default function ClientProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const [project, setProject] = useState<Project | null>(null)

  // 설문 설정
  const [templates, setTemplates] = useState<SurveyTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [questions, setQuestions] = useState<SurveyQuestion[]>([])
  const [existingSurveyId, setExistingSurveyId] = useState<string | null>(null)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [showSurveyQuestions, setShowSurveyQuestions] = useState(true)

  // AI 모드
  const [surveyMode, setSurveyMode] = useState<'template' | 'ai'>('template')
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiGenCount, setAiGenCount] = useState(0)       // 사용 횟수
  const [aiCooldown, setAiCooldown] = useState(0)       // 쿨다운 남은 초
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 개발의뢰서 업로드
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [devRequestFilename, setDevRequestFilename] = useState('')
  const [fileUploading, setFileUploading] = useState(false)
  const [fileError, setFileError] = useState('')

  // 테스트 진행 현황 (isTesting)
  interface TestingPanel {
    panel_id: string; name: string; gender: string; age_group: string
    skin_type: string; skin_concern: string; matched_at: string
    status: string; has_responded: boolean
  }
  const [testingPanels, setTestingPanels] = useState<TestingPanel[]>([])
  const [testingRespondedCount, setTestingRespondedCount] = useState(0)
  const [testingSurveyInfo, setTestingSurveyInfo] = useState<{ id: string; status: string; questions_count: number } | null>(null)
  const [endingTest, setEndingTest] = useState(false)
  const [showEndTestConfirm, setShowEndTestConfirm] = useState(false)

  // 패널 응답 결과 (completed / analyzing)
  interface PanelResponseItem {
    panel_id: string; name: string; status: string; matched_at: string
    has_responded: boolean; answered_count: number; total_questions: number
    avg_score: number | null
    response: {
      responses: Record<string, number | string>  // scale: number, choice: string
      open_weakness: string | null; open_improvement: string | null
      responded_at: string | null; response_duration_sec: number | null
    } | null
  }
  interface ResponseReport {
    questions: SurveyQuestion[]
    panels: PanelResponseItem[]
    total_questions: number
  }
  const [responseReport, setResponseReport] = useState<ResponseReport | null>(null)
  const [expandedRespPanelId, setExpandedRespPanelId] = useState<string | null>(null)
  const [detailPanelId, setDetailPanelId] = useState<string | null>(null)

  useEffect(() => { load() }, [id])

  async function load() {
    const { data: proj } = await supabase.from('projects').select('*').eq('id', id).single()
    setProject(proj)

    // 기존 개발의뢰서 로드
    if (proj?.dev_request_filename) {
      setDevRequestFilename(proj.dev_request_filename)
      if (proj.dev_request_text) setAiInput(proj.dev_request_text)
    }

    // AI 생성 횟수 및 쿨다운 복원
    if (proj?.ai_generation_count != null) setAiGenCount(proj.ai_generation_count)
    if (proj?.ai_generated_at) {
      const elapsed = (Date.now() - new Date(proj.ai_generated_at).getTime()) / 1000
      if (elapsed < 30) startCooldown(Math.ceil(30 - elapsed))
    }

    // 기존 설문 로드
    const { data: surveys } = await supabase.from('surveys').select('*').eq('project_id', id)
    if (surveys?.length) {
      const survey = surveys[0]
      setExistingSurveyId(survey.id)
      setQuestions((survey.questions || []).map((q: SurveyQuestion) => ({ ...q, type: (q.type || 'scale') as SurveyQuestion['type'] })))
      // 연결된 템플릿 ID 복원
      if (survey.template_id) setSelectedTemplateId(survey.template_id)

    }

    if (proj?.status === 'draft') {
      const { data: tmpls } = await supabase
        .from('survey_templates').select('*').order('is_default', { ascending: false })
      setTemplates(tmpls || [])
    }

    // testing 상태: 패널 응답 현황 로드
    if (proj?.status === 'testing') {
      const res = await fetch(`/api/projects/${id}/testing-status`)
      if (res.ok) {
        const data = await res.json()
        setTestingPanels(data.panels || [])
        setTestingRespondedCount(data.responded_count ?? 0)
        setTestingSurveyInfo(data.survey ?? null)
      }
    }

    // completed / analyzing 상태: 패널 응답 결과 로드
    if (proj?.status === 'completed' || proj?.status === 'analyzing') {
      const res = await fetch(`/api/projects/${id}/panel-responses`)
      if (res.ok) {
        const data = await res.json()
        setResponseReport(data)
      }
    }
  }

  // 템플릿 불러오기 — 원본 템플릿은 절대 수정하지 않음 (깊은 복사)
  function loadTemplate(templateId: string) {
    const tmpl = templates.find((t) => t.id === templateId)
    if (tmpl) {
      setSelectedTemplateId(templateId)
      // type이 없는 구형 템플릿 문항은 기본값 'scale'로 정규화
      setQuestions(tmpl.questions.map((q) => ({ ...q, type: (q.type || 'scale') as SurveyQuestion['type'] })))
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
    if (!project || questions.length === 0) return
    setSaving(true)
    try {
      const res = await fetch('/api/surveys/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: id,
          questions,
          templateId: selectedTemplateId || undefined,
        }),
      })
      const data = await res.json()
      if (res.ok && data.surveyId) {
        setExistingSurveyId(data.surveyId)
      } else {
        alert(data.error || '설문 저장에 실패했습니다.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function advanceSurvey() {
    if (!project || questions.length === 0) return
    setConfirming(true)

    try {
      // 1. 설문 저장 (service role API — surveys RLS에 클라이언트 INSERT/UPDATE 정책 없음)
      const saveRes = await fetch('/api/surveys/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: id,
          questions,
          templateId: selectedTemplateId || undefined,
          status: 'draft',
        }),
      })
      const saveData = await saveRes.json()
      if (!saveRes.ok) {
        alert(saveData.error || '설문 저장에 실패했습니다.')
        return
      }
      if (saveData.surveyId) setExistingSurveyId(saveData.surveyId)

      // 2. 프로젝트 상태 전진 (내부: testing / 외부: matching)
      const advRes = await fetch('/api/projects/advance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: id }),
      })
      const advData = await advRes.json()
      if (advRes.ok) {
        const { data: updated } = await supabase.from('projects').select('*').eq('id', id).single()
        if (updated) setProject(updated)
      } else {
        alert(advData.error || '오류가 발생했습니다. 다시 시도해주세요.')
      }
    } finally {
      setConfirming(false)
    }
  }

  function handleEndTest() {
    setShowEndTestConfirm(true)
  }

  async function confirmEndTest() {
    setShowEndTestConfirm(false)
    setEndingTest(true)
    try {
      const res = await fetch('/api/projects/end-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: id }),
      })
      const data = await res.json()
      if (res.ok) {
        const { data: updated } = await supabase.from('projects').select('*').eq('id', id).single()
        if (updated) setProject(updated)
      } else {
        alert(data.error || '테스트 종료에 실패했습니다.')
      }
    } finally {
      setEndingTest(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileUploading(true)
    setFileError('')

    const form = new FormData()
    form.append('file', file)

    try {
      const res = await fetch(`/api/projects/${id}/dev-request`, { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '파일 처리 중 오류가 발생했습니다')
      setAiInput(data.text)
      setDevRequestFilename(data.filename)
    } catch (err) {
      setFileError(err instanceof Error ? err.message : '파일 처리 중 오류가 발생했습니다')
    } finally {
      setFileUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function startCooldown(seconds: number) {
    setAiCooldown(seconds)
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current)
    cooldownTimerRef.current = setInterval(() => {
      setAiCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownTimerRef.current!)
          cooldownTimerRef.current = null
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  async function generateWithAI() {
    if (!aiInput.trim()) return
    setAiLoading(true)
    setAiError('')
    try {
      const res = await fetch('/api/surveys/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productInfo: aiInput, category: project?.product_category, projectId: id }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.cooldownRemaining) startCooldown(data.cooldownRemaining)
        throw new Error(data.error || 'AI 생성 실패')
      }
      if (questions.length > 0) {
        if (!window.confirm('현재 문항이 AI 생성 문항으로 교체됩니다. 계속하시겠습니까?')) return
      }
      setQuestions(data.questions)
      setSelectedTemplateId('')
      setAiGenCount(prev => prev + 1)
      startCooldown(30)
      if (data.truncated) {
        setAiError('파일이 길어 앞부분(6,000자)만 분석했습니다. 결과를 확인하고 필요 시 내용을 직접 수정해주세요.')
      }
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'AI 문항 생성에 실패했습니다')
    } finally {
      setAiLoading(false)
    }
  }

  if (!project) return <p className="text-text-muted p-6">로딩중...</p>

  const isPending = project.status === 'pending'
  const isDraft = project.status === 'draft'
  const isRejected = project.status === 'rejected'
  const isMatching = project.status === 'matching' || project.status === 'recruiting'
  const isTesting = project.status === 'testing'
  const isAnalyzing = project.status === 'analyzing'
  const isCompleted = project.status === 'completed'
  const isInternal = project.panel_source === 'internal'
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId)

  // 내부 패널: 패널 모집 단계 없음 (6단계)
  // 외부 패널: 패널 모집 포함 (7단계)
  const stages = isInternal
    ? [
        { label: '패널 설정',   desc: '패널 유형과 규모를 설정해주세요' },
        { label: '설문 설정',   desc: '설문 문항을 설정하고 완료해주세요' },
        { label: '테스트 진행', desc: '패널에게 초대 링크를 보내고 테스트를 시작하세요' },
        { label: '테스트 종료', desc: '테스트가 완료되었습니다' },
        { label: '분석',        desc: '수집된 데이터를 분석 중입니다' },
        { label: '리포트 제공', desc: '분석이 완료되어 리포트를 확인할 수 있습니다' },
      ]
    : [
        { label: '패널 설정',   desc: '패널 유형과 규모를 설정해주세요' },
        { label: '설문 설정',   desc: '설문 문항을 설정하고 완료해주세요' },
        { label: '패널 모집',   desc: '외부 패널을 모집하는 중입니다' },
        { label: '테스트 진행', desc: '패널들이 제품을 테스트하는 중입니다' },
        { label: '테스트 종료', desc: '테스트가 완료되었습니다' },
        { label: '분석',        desc: '수집된 데이터를 분석 중입니다' },
        { label: '리포트 제공', desc: '분석이 완료되어 리포트를 확인할 수 있습니다' },
      ]

  const statusToIndex: Record<string, number> = isInternal
    ? {
        pending: 0,
        draft: 1,
        confirmed: 1, approved: 1,
        testing: 2,
        analyzing: 4,
        completed: 5,
      }
    : {
        pending: 0,
        draft: 1,
        confirmed: 1, approved: 1,
        matching: 2,  recruiting: 2,
        testing: 3,
        analyzing: 5,
        completed: 6,
      }
  const currentIdx = statusToIndex[project.status] ?? 0

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
        <div className="mt-4 flex items-center overflow-x-auto pb-1">
          {stages.map((stage, i) => (
            <div key={stage.label} className="flex-1 flex items-center min-w-0">
              <div className="flex flex-col items-center text-center min-w-[52px]">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 ${
                  i < currentIdx ? 'bg-navy text-white' :
                  i === currentIdx ? 'bg-navy text-white ring-2 ring-navy/30 ring-offset-1' :
                  'bg-surface-dark text-text-muted'
                }`}>
                  {i < currentIdx ? '✓' : i + 1}
                </div>
                <span className={`text-xs mt-1 leading-tight ${i <= currentIdx ? 'text-navy font-medium' : 'text-text-muted'}`}>
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

        {/* 단계별 액션 버튼 */}
        {isPending && (
          <div className="mt-4 flex justify-center">
            <Link
              href={`/client/projects/${id}/panel-setup`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-navy text-white text-sm font-medium rounded-lg hover:bg-navy/90 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              패널 설정하기
            </Link>
          </div>
        )}
        {isMatching && !isInternal && (
          <div className="mt-4 flex justify-center">
            <div className="text-center">
              <p className="text-xs text-text-muted mb-2">관리자가 외부 패널을 배정 중입니다. 잠시만 기다려주세요.</p>
            </div>
          </div>
        )}
        {isTesting && isInternal && (
          <div className="mt-4 flex justify-center gap-3">
            <Link
              href={`/client/projects/${id}/invite`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-navy text-white text-sm font-medium rounded-lg hover:bg-navy/90 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              패널 초대 · 응답 관리
            </Link>
            <Button variant="secondary" size="sm" onClick={handleEndTest} loading={endingTest}>
              테스트 종료
            </Button>
          </div>
        )}
        {isTesting && !isInternal && (
          <div className="mt-4 flex justify-center">
            <Button variant="secondary" size="sm" onClick={handleEndTest} loading={endingTest}>
              테스트 종료
            </Button>
          </div>
        )}
        {isAnalyzing && (
          <div className="mt-4 flex justify-center">
            <p className="text-xs text-text-muted">AI가 응답 데이터를 분석하고 있습니다. 완료 시 알림을 드립니다.</p>
          </div>
        )}
        {isCompleted && (
          <div className="mt-4 flex justify-center">
            <Link
              href={`/client/projects/${id}/results`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-go text-white text-sm font-medium rounded-lg hover:bg-go/90 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              리포트 확인하기
            </Link>
          </div>
        )}
      </Card>

      {/* === testing 상태: 패널 응답 현황 === */}
      {isTesting && (
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <CardTitle>패널 응답 현황</CardTitle>
            {testingSurveyInfo && (
              <span className="text-xs text-text-muted">
                {testingSurveyInfo.questions_count}문항 · {testingRespondedCount}/{testingPanels.length}명 응답
              </span>
            )}
          </div>

          {/* 진행률 바 */}
          <div className="mb-5 p-4 bg-surface rounded-xl border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-text">전체 설문 진행률</span>
              <span className="text-sm font-bold text-navy">{testingRespondedCount} / {testingPanels.length}명 응답</span>
            </div>
            <div className="h-2 bg-surface-dark rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-navy rounded-full transition-all"
                style={{ width: `${testingPanels.length > 0 ? Math.round((testingRespondedCount / testingPanels.length) * 100) : 0}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-go-bg rounded-lg border border-go/20">
                <p className="text-xs text-text-muted mb-0.5">응답 완료</p>
                <p className="text-2xl font-bold text-go">{testingRespondedCount}명</p>
              </div>
              <div className="text-center p-3 bg-surface-dark rounded-lg border border-border">
                <p className="text-xs text-text-muted mb-0.5">미응답</p>
                <p className="text-2xl font-bold text-nogo">{testingPanels.length - testingRespondedCount}명</p>
              </div>
            </div>
          </div>

          {/* 패널 테이블 */}
          {testingPanels.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-4">배정된 패널이 없습니다. 초대 페이지에서 패널을 선택하세요.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-xs font-medium text-text-muted">이름</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-text-muted">성별</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-text-muted">연령대</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-text-muted">피부타입</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-text-muted">피부고민</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-text-muted">배정일</th>
                    <th className="text-center py-2 px-3 text-xs font-medium text-text-muted">설문 진행</th>
                  </tr>
                </thead>
                <tbody>
                  {testingPanels.map((p) => (
                    <tr key={p.panel_id} className="border-b border-border/50 hover:bg-surface/50">
                      <td className="py-2.5 px-3 font-medium text-text">{p.name}</td>
                      <td className="py-2.5 px-3 text-text-muted">{p.gender}</td>
                      <td className="py-2.5 px-3 text-text-muted">{p.age_group}</td>
                      <td className="py-2.5 px-3 text-text-muted">{p.skin_type}</td>
                      <td className="py-2.5 px-3 text-text-muted">{p.skin_concern}</td>
                      <td className="py-2.5 px-3 text-text-muted text-xs">
                        {new Date(p.matched_at).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {p.has_responded ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-go">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            응답 완료
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-nogo">× 미응답</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* === completed / analyzing 상태: 패널 응답 결과 === */}
      {(isCompleted || isAnalyzing) && responseReport && responseReport.panels.length > 0 && (
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <CardTitle>패널 응답 결과</CardTitle>
            <span className="text-xs text-text-muted">
              {responseReport.panels.filter(p => p.has_responded).length} / {responseReport.panels.length}명 응답 완료
            </span>
          </div>

          <div className="space-y-2">
            {responseReport.panels.map((panel) => (
              <div key={panel.panel_id} className="border border-border rounded-xl overflow-hidden">
                {/* 토글 헤더 행 */}
                <button
                  type="button"
                  onClick={() => setExpandedRespPanelId(
                    expandedRespPanelId === panel.panel_id ? null : panel.panel_id
                  )}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface/50 transition-colors text-left"
                >
                  {/* 펼치기 아이콘 */}
                  <svg
                    className={`w-4 h-4 text-text-muted flex-shrink-0 transition-transform ${expandedRespPanelId === panel.panel_id ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>

                  {/* 패널명 */}
                  <span className="flex-1 text-sm font-medium text-text">{panel.name}</span>

                  {/* 응답 수 */}
                  <span className="text-xs text-text-muted tabular-nums mr-1">
                    {panel.has_responded
                      ? `${panel.answered_count} / ${panel.total_questions}문항`
                      : '미응답'}
                  </span>

                  {/* 상태 배지 */}
                  {panel.has_responded ? (
                    <span className="text-xs font-medium text-go bg-go-bg px-2 py-0.5 rounded-full flex-shrink-0">응답 완료</span>
                  ) : (
                    <span className="text-xs font-medium text-text-muted bg-surface-dark px-2 py-0.5 rounded-full flex-shrink-0">미응답</span>
                  )}

                  {/* 상세 버튼 */}
                  {panel.has_responded && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setDetailPanelId(panel.panel_id) }}
                      className="ml-2 flex-shrink-0 text-xs px-3 py-1 bg-navy text-white rounded-lg hover:bg-navy/80 transition-colors"
                    >
                      상세
                    </button>
                  )}
                </button>

                {/* 펼쳐진 요약 */}
                {expandedRespPanelId === panel.panel_id && panel.has_responded && panel.response && (
                  <div className="px-4 py-3 border-t border-border/50 bg-surface/30">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-xs text-text-muted mb-0.5">평균 점수</p>
                        <p className="text-lg font-bold text-navy">
                          {panel.avg_score != null ? `${panel.avg_score.toFixed(2)}점` : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-text-muted mb-0.5">응답 소요시간</p>
                        <p className="text-lg font-bold text-text">
                          {panel.response.response_duration_sec != null
                            ? `${Math.round(panel.response.response_duration_sec / 60)}분 ${panel.response.response_duration_sec % 60}초`
                            : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-text-muted mb-0.5">응답일</p>
                        <p className="text-sm font-medium text-text">
                          {panel.response.responded_at
                            ? new Date(panel.response.responded_at).toLocaleDateString('ko-KR')
                            : '-'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDetailPanelId(panel.panel_id)}
                      className="mt-3 w-full text-xs text-navy hover:underline"
                    >
                      문항별 상세 답변 보기 →
                    </button>
                  </div>
                )}
                {expandedRespPanelId === panel.panel_id && !panel.has_responded && (
                  <div className="px-4 py-3 border-t border-border/50 bg-surface/30">
                    <p className="text-xs text-text-muted text-center">아직 설문에 응답하지 않았습니다.</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* === 상세 응답 모달 === */}
      {detailPanelId && (() => {
        const panel = responseReport?.panels.find(p => p.panel_id === detailPanelId)
        if (!panel || !panel.response) return null
        const { responses, open_weakness, open_improvement } = panel.response
        const qs = responseReport!.questions

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setDetailPanelId(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 모달 헤더 */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
                <div>
                  <h2 className="text-base font-bold text-text">{panel.name} — 응답 상세</h2>
                  <p className="text-xs text-text-muted mt-0.5">
                    평균 {panel.avg_score != null ? `${panel.avg_score.toFixed(2)}점` : '-'} · {panel.answered_count}/{panel.total_questions}문항 응답
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailPanelId(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface text-text-muted hover:text-text transition-colors text-lg"
                >
                  ✕
                </button>
              </div>

              {/* 모달 바디 */}
              <div className="overflow-y-auto flex-1 px-6 py-4">
                <div className="space-y-2">
                  {qs.map((q, i) => {
                    if (q.type === 'scale') {
                      const score = responses[q.key] as number | undefined
                      const scoreLabel = (score != null && q.scaleLabels) ? q.scaleLabels[score - 1] : null
                      const isKs = q.isKillSignal
                      const scoreColor = score == null ? 'text-text-muted' :
                        score >= 3 ? 'text-go' : score === 2 ? 'text-cgo' : 'text-nogo'

                      return (
                        <div
                          key={q.key}
                          className={`flex items-start gap-3 p-3 rounded-lg ${isKs ? 'bg-nogo-bg/30 border border-nogo/10' : 'bg-surface'}`}
                        >
                          <span className="text-xs text-text-muted w-5 flex-shrink-0 pt-0.5 tabular-nums">{i + 1}.</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-text leading-snug">{q.label || '(내용 없음)'}</p>
                            {score != null ? (
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className={`text-xl font-black ${scoreColor}`}>{score}점</span>
                                {scoreLabel && (
                                  <span className="text-xs text-text-muted">{scoreLabel}</span>
                                )}
                                {/* 점수 바 */}
                                <div className="flex-1 h-1.5 bg-surface-dark rounded-full overflow-hidden max-w-[80px]">
                                  <div
                                    className={`h-full rounded-full ${score >= 3 ? 'bg-go' : score === 2 ? 'bg-cgo' : 'bg-nogo'}`}
                                    style={{ width: `${(score / 4) * 100}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-text-muted mt-1">응답 없음</p>
                            )}
                          </div>
                          {isKs && (
                            <span className="text-xs px-1.5 py-0.5 bg-nogo-bg text-nogo rounded font-medium flex-shrink-0">KS</span>
                          )}
                        </div>
                      )
                    }

                    if (q.type === 'choice') {
                      const chosen = responses[q.key] as string | undefined
                      return (
                        <div key={q.key} className="flex items-start gap-3 p-3 rounded-lg bg-surface">
                          <span className="text-xs text-text-muted w-5 flex-shrink-0 pt-0.5 tabular-nums">{i + 1}.</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-text leading-snug">{q.label || '(내용 없음)'}</p>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {(q.choices || []).map((ch) => (
                                <span
                                  key={ch}
                                  className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
                                    chosen === ch
                                      ? 'bg-navy text-white border-navy'
                                      : 'bg-white text-text-muted border-border'
                                  }`}
                                >
                                  {ch}
                                </span>
                              ))}
                              {chosen == null && (
                                <p className="text-xs text-text-muted mt-0.5">응답 없음</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    }

                    return null
                  })}

                  {/* 주관식: 아쉬운 점 */}
                  {open_weakness && (
                    <div className="p-3 bg-surface rounded-lg border border-border/50">
                      <p className="text-xs font-semibold text-text-muted mb-1.5">💬 아쉬운 점 · 불편했던 점</p>
                      <p className="text-sm text-text leading-relaxed">{open_weakness}</p>
                    </div>
                  )}

                  {/* 주관식: 개선사항 */}
                  {open_improvement && (
                    <div className="p-3 bg-surface rounded-lg border border-border/50">
                      <p className="text-xs font-semibold text-text-muted mb-1.5">✏️ 개선 · 추가 요청사항</p>
                      <p className="text-sm text-text leading-relaxed">{open_improvement}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 모달 푸터 */}
              <div className="px-6 py-3 border-t border-border flex-shrink-0 flex justify-end">
                <button
                  type="button"
                  onClick={() => setDetailPanelId(null)}
                  className="px-4 py-2 text-sm text-text-muted hover:text-text border border-border rounded-lg hover:bg-surface transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* === 테스트 종료 확인 모달 === */}
      {showEndTestConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowEndTestConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 아이콘 */}
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
              testingRespondedCount < 3 ? 'bg-gold/10' : 'bg-surface-dark'
            }`}>
              {testingRespondedCount < 3 ? (
                <svg className="w-6 h-6 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>

            {/* 제목 */}
            <h3 className="text-base font-bold text-text text-center mb-2">
              테스트를 종료하시겠습니까?
            </h3>

            {/* 본문 */}
            {testingRespondedCount < 3 ? (
              <div className="bg-gold/5 border border-gold/20 rounded-xl p-3 mb-4">
                <p className="text-sm text-center text-text-muted leading-relaxed">
                  현재 <span className="font-bold text-gold">{testingRespondedCount}명</span>만 응답했습니다.
                  <br />
                  신뢰도 높은 분석을 위해{' '}
                  <span className="font-semibold text-text">3명 이상 응답 후</span>{' '}
                  테스트를 종료하는 것을 권장합니다.
                </p>
              </div>
            ) : (
              <p className="text-sm text-text-muted text-center leading-relaxed mb-4">
                <span className="font-bold text-go">{testingRespondedCount}명</span>이 응답을 완료했습니다.
                <br />
                종료 후 패널은 더 이상 설문에 응답할 수 없으며,
                <br />
                수집된 응답으로 분석이 시작됩니다.
              </p>
            )}

            {testingRespondedCount < 3 && (
              <p className="text-xs text-text-muted text-center mb-4">
                종료 후 패널은 더 이상 설문에 응답할 수 없으며,
                <br />
                수집된 응답으로 분석이 시작됩니다.
              </p>
            )}

            {/* 버튼 */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowEndTestConfirm(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-text-muted border border-border rounded-xl hover:bg-surface transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={confirmEndTest}
                className={`flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-colors ${
                  testingRespondedCount < 3
                    ? 'bg-gold hover:bg-gold/90'
                    : 'bg-navy hover:bg-navy/90'
                }`}
              >
                {testingRespondedCount < 3 ? '그래도 종료하기' : '종료 확인'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === draft 상태: 설문 편집 === */}
      {isDraft && (
        <>
          {/* 설문 설정 */}
          <Card className="mb-6">
            <div className="flex items-center justify-between mb-1">
              <CardTitle>설문 설정</CardTitle>
              <span className="text-sm text-text-muted">{questions.length}개 문항</span>
            </div>

            {/* 모드 탭 */}
            <div className="flex gap-1 p-1 bg-surface rounded-lg mb-4 w-fit">
              <button
                type="button"
                onClick={() => setSurveyMode('template')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  surveyMode === 'template' ? 'bg-white text-navy shadow-sm' : 'text-text-muted hover:text-text'
                }`}
              >
                📋 템플릿
              </button>
              <button
                type="button"
                onClick={() => setSurveyMode('ai')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  surveyMode === 'ai' ? 'bg-white text-navy shadow-sm' : 'text-text-muted hover:text-text'
                }`}
              >
                ✨ AI 생성
              </button>
            </div>

            {/* 템플릿 모드 */}
            {surveyMode === 'template' && (
              <div className="mb-5 p-3 bg-surface rounded-lg">
                <p className="text-xs text-text-muted mb-3">템플릿을 불러온 후 문항을 자유롭게 수정하세요. 원본 템플릿은 변경되지 않습니다.</p>
                {selectedTemplateId ? (
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text">
                        템플릿: {selectedTemplate?.name ?? '로딩 중...'}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">
                        현재 {questions.length}개 문항 (연결 해제해도 문항은 유지됩니다)
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
                )}
              </div>
            )}

            {/* AI 생성 모드 */}
            {surveyMode === 'ai' && (
              <div className="mb-5 p-4 bg-navy/[0.03] border border-navy/10 rounded-xl">
                <p className="text-xs font-medium text-navy mb-1">제품 정보 입력</p>
                <p className="text-xs text-text-muted mb-3">
                  개발의뢰서를 업로드하거나, 제품의 특징·성분·타겟을 직접 입력하세요.
                  AI가 관능 평가에 최적화된 설문 문항을 자동으로 생성합니다.
                </p>

                {/* 파일 업로드 영역 */}
                <div className="mb-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc,.xlsx,.xls,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="dev-request-file"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={fileUploading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-navy/20 bg-white text-navy text-xs font-medium hover:bg-navy/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {fileUploading ? (
                        <>
                          <span className="w-3 h-3 border-2 border-navy border-t-transparent rounded-full animate-spin" />
                          파일 읽는 중...
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          개발의뢰서 업로드
                        </>
                      )}
                    </button>
                    {devRequestFilename ? (
                      <span className="inline-flex items-center gap-1 text-xs text-go bg-go/10 px-2 py-1 rounded-full">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {devRequestFilename}
                      </span>
                    ) : (
                      <span className="text-xs text-text-muted">PDF, DOCX, XLSX, TXT 지원 · 최대 10MB</span>
                    )}
                  </div>
                  {fileError && (
                    <p className="text-xs text-nogo mt-1.5">{fileError}</p>
                  )}
                </div>

                <textarea
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder={`예시:\n제품명: 수분 세럼 A\n타겟: 30~40대 건성 피부\n주요 성분: 히알루론산 5%, 세라마이드\n특징: 빠른 흡수, 끈적임 없는 가벼운 제형\n기대 효과: 즉각 보습, 피부 장벽 강화`}
                  rows={7}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy/20 bg-white"
                />
                {aiError && (
                  <p className="text-xs text-nogo mt-2">{aiError}</p>
                )}
                <div className="flex items-center gap-3 mt-3 flex-wrap">
                  <Button
                    onClick={generateWithAI}
                    loading={aiLoading}
                    disabled={!aiInput.trim() || aiLoading || aiCooldown > 0 || aiGenCount >= 5}
                  >
                    {aiLoading ? 'AI 생성 중...' : aiCooldown > 0 ? `⏳ ${aiCooldown}초 후 가능` : '✨ 문항 자동 생성'}
                  </Button>
                  {/* 남은 횟수 표시 */}
                  <span className={`text-xs font-medium ${aiGenCount >= 5 ? 'text-nogo' : aiGenCount >= 3 ? 'text-gold' : 'text-text-muted'}`}>
                    {aiGenCount >= 5 ? '생성 한도 초과 (5/5회)' : `잔여 ${5 - aiGenCount}회 (${aiGenCount}/5회 사용)`}
                  </span>
                  {questions.length > 0 && aiGenCount < 5 && (
                    <span className="text-xs text-text-muted">{questions.length}개 문항 생성됨 — 아래에서 수정 가능</span>
                  )}
                </div>
              </div>
            )}

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
            <div className="flex flex-col gap-3 pt-3 border-t border-border">
              <div className="flex items-center gap-3 flex-wrap">
                <Button variant="secondary" onClick={saveDraft} loading={saving} disabled={questions.length === 0}>
                  설문 저장
                </Button>
                <Button onClick={advanceSurvey} loading={confirming} disabled={questions.length === 0}>
                  {isInternal ? '설문 확정 — 패널 초대하기 →' : '설문 확정 — 패널 모집 시작'}
                </Button>
                {questions.length === 0 && (
                  <span className="text-xs text-text-muted">문항이 있어야 확정할 수 있습니다</span>
                )}
              </div>
              {questions.length > 0 && (
                <p className="text-xs text-text-muted leading-relaxed">
                  💡 <span className="font-medium">설문 저장</span>: 문항을 저장하고 계속 수정할 수 있습니다.&nbsp;
                  <span className="font-medium">설문 확정</span>: 저장 후 패널 초대 단계로 이동합니다.
                  초대 페이지에서 패널을 선택하고 <span className="font-medium">설문 시작하기</span>로 테스트를 시작하세요.
                </p>
              )}
            </div>
          </Card>
        </>
      )}

      {/* === testing 이후: 읽기 전용 === */}
      {!isDraft && !isRejected && questions.length > 0 && (
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

    </div>
  )
}
