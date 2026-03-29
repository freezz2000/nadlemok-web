'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Card, { CardTitle, CardDescription } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import Modal from '@/components/ui/Modal'
import { MatchStatusBadge } from '@/components/ui/Badge'
import type { Project, Survey, SurveyTemplate, ProjectStatus, PanelMatchStatus } from '@/lib/types'

interface MatchedPanel {
  id: string
  status: string
  matched_at: string
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

    // 매칭된 패널 조회
    if (survs?.length) {
      const surveyIds = survs.map((s) => s.id)
      const { data: panels } = await supabase
        .from('survey_panels')
        .select('id, status, matched_at, panel_id, panel:profiles!panel_id(name, panel_profiles(gender, age_group, skin_type, skin_concern))')
        .in('survey_id', surveyIds)
        .order('matched_at', { ascending: false })

      setMatchedPanels((panels as unknown as MatchedPanel[]) || [])
    }
  }

  async function createSurvey() {
    const template = templates.find((t) => t.id === selectedTemplate)
    await supabase.from('surveys').insert({
      project_id: id,
      template_id: selectedTemplate || null,
      title: surveyTitle || `${project?.product_name} 설문`,
      questions: template?.questions || [],
      day_checkpoint: [1, 3, 7, 14],
    })
    setShowCreateSurvey(false)
    setSurveyTitle('')
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
    { from: 'confirmed', to: 'recruiting', label: '패널 모집 시작' },
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

      {/* 프로젝트 설정 */}
      <Card className="mb-6">
        <CardTitle>프로젝트 설정</CardTitle>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-text-muted">카테고리</span>
            <p className="font-medium">{project.product_category || '-'}</p>
          </div>
          <div>
            <span className="text-text-muted">KS 경고 임계값</span>
            <p className="font-medium">{(project.ks_warn_threshold * 100).toFixed(0)}%</p>
          </div>
          <div>
            <span className="text-text-muted">KS 위험 임계값</span>
            <p className="font-medium">{(project.ks_danger_threshold * 100).toFixed(0)}%</p>
          </div>
          <div>
            <span className="text-text-muted">만족도 기준</span>
            <p className="font-medium">{project.satisfaction_threshold}점</p>
          </div>
        </div>
      </Card>

      {/* 설문 목록 */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <CardTitle>설문</CardTitle>
          <Button size="sm" variant="secondary" onClick={() => setShowCreateSurvey(true)}>설문 추가</Button>
        </div>

        {surveys.length === 0 ? (
          <p className="text-sm text-text-muted py-4">아직 설문이 없습니다. 설문을 추가해주세요.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>설문명</TableHead>
                <TableHead>문항수</TableHead>
                <TableHead>체크포인트</TableHead>
                <TableHead>상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {surveys.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.title}</TableCell>
                  <TableCell>{s.questions?.length || 0}개</TableCell>
                  <TableCell>Day {s.day_checkpoint?.join(', ')}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-1 rounded ${
                      s.status === 'active' ? 'bg-go-bg text-go' :
                      s.status === 'closed' ? 'bg-surface text-text-muted' :
                      'bg-cgo-bg text-cgo'
                    }`}>
                      {s.status === 'active' ? '진행중' : s.status === 'closed' ? '종료' : '초안'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* 매칭된 패널 목록 */}
      {matchedPanels.length > 0 && (
        <Card className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <CardTitle>매칭된 패널</CardTitle>
            <span className="text-sm text-text-muted">{matchedPanels.length}명</span>
          </div>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {matchedPanels.map((mp) => {
                const p = mp.panel
                const pp = p?.panel_profiles
                return (
                  <TableRow key={mp.id}>
                    <TableCell className="font-medium">{p?.name || '-'}</TableCell>
                    <TableCell>{pp?.gender || '-'}</TableCell>
                    <TableCell>{pp?.age_group || '-'}</TableCell>
                    <TableCell>{pp?.skin_type || '-'}</TableCell>
                    <TableCell>{pp?.skin_concern || '-'}</TableCell>
                    <TableCell className="text-text-muted">{new Date(mp.matched_at).toLocaleDateString('ko')}</TableCell>
                    <TableCell>
                      <MatchStatusBadge status={mp.status as PanelMatchStatus} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}

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
