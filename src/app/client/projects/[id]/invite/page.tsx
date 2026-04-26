'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Card, { CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Link from 'next/link'

// ── 타입 ────────────────────────────────────────────────
interface AlimtalkInvitation {
  id: string
  phone: string
  status: string
  invited_at: string
  accepted_at: string | null
  expires_at: string
  panel_id: string | null
  panel_profile: { name: string }[] | null
}

interface LinkPanel {
  panel_id: string
  status: string
  profile: { name: string }[] | null
}

interface SurveyPanelRow {
  panel_id: string
  status: string
}

// ── 메인 컴포넌트 ────────────────────────────────────────
export default function InvitePage() {
  const { id: projectId } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  // 기본 데이터
  const [productName, setProductName] = useState('')
  const [loading, setLoading] = useState(true)
  const [surveyId, setSurveyId] = useState<string | null>(null)
  const [surveyStatus, setSurveyStatus] = useState<string | null>(null)

  // 초대링크
  const [projectInviteLink, setProjectInviteLink] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)
  const [loadingLink, setLoadingLink] = useState(false)

  // 초대 목록 (alimtalk은 하위 호환을 위해 데이터만 유지, UI 숨김)
  const [alimtalkInvitations, setAlimtalkInvitations] = useState<AlimtalkInvitation[]>([])
  const [linkPanels, setLinkPanels] = useState<LinkPanel[]>([])
  const [responseMap, setResponseMap] = useState<Record<string, boolean>>({})

  // 패널 선택 (survey_panels 매칭)
  const [assignedPanelIds, setAssignedPanelIds] = useState<Set<string>>(new Set())
  const [selectedAssignment, setSelectedAssignment] = useState<Set<string>>(new Set())
  const [savingAssignment, setSavingAssignment] = useState(false)
  const [assignSaved, setAssignSaved] = useState(false)

  // 설문 시작
  const [startingsurvey, setStartingSurvey] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)

  // ── 데이터 로드 ─────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    const clientId = user?.id

    // 프로젝트명
    const { data: proj } = await supabase
      .from('projects')
      .select('product_name')
      .eq('id', projectId)
      .single()
    if (proj) setProductName(proj.product_name)

    // 초대 링크
    if (!projectInviteLink) {
      setLoadingLink(true)
      fetch(`/api/invite/project-link?projectId=${projectId}`)
        .then((r) => r.json())
        .then((d) => { if (d.url) setProjectInviteLink(d.url) })
        .catch(() => {})
        .finally(() => setLoadingLink(false))
    }

    // 최신 설문
    const { data: surveys } = await supabase
      .from('surveys')
      .select('id, status')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
    const survey = surveys?.[0] ?? null
    setSurveyId(survey?.id ?? null)
    setSurveyStatus(survey?.status ?? null)

    // 패널 이름 API 조회 (profiles RLS 우회)
    async function fetchPanelNames(ids: string[]): Promise<Record<string, string>> {
      if (ids.length === 0) return {}
      try {
        const res = await fetch(`/api/invite/panel-names?ids=${ids.join(',')}`)
        if (!res.ok) return {}
        const { names } = await res.json() as { names: Record<string, string> }
        return names
      } catch {
        return {}
      }
    }

    // 알림톡 초대 (하위 호환 — 기존 알림톡 가입 패널도 목록에 포함)
    const { data: invs } = await supabase
      .from('project_invitations')
      .select('id, phone, status, invited_at, accepted_at, expires_at, panel_id')
      .eq('project_id', projectId)
      .order('invited_at', { ascending: false })
    const rawInvList = (invs as Omit<AlimtalkInvitation, 'panel_profile'>[]) || []

    const acceptedPanelIds = rawInvList
      .filter((i) => i.panel_id && i.status === 'accepted')
      .map((i) => i.panel_id!)
    const alimtalkNameMap = await fetchPanelNames(acceptedPanelIds)

    const invList: AlimtalkInvitation[] = rawInvList.map((inv) => ({
      ...inv,
      panel_profile:
        inv.panel_id && alimtalkNameMap[inv.panel_id]
          ? [{ name: alimtalkNameMap[inv.panel_id] }]
          : null,
    }))
    setAlimtalkInvitations(invList)

    const alimtalkPanelIdSet = new Set(
      invList.filter((i) => i.panel_id && i.status === 'accepted').map((i) => i.panel_id!)
    )

    // 링크 가입 패널: client_panels
    if (clientId) {
      const { data: cpRows } = await supabase
        .from('client_panels')
        .select('panel_id')
        .eq('client_id', clientId)

      const linkPanelIds = ((cpRows as { panel_id: string }[]) || [])
        .map((cp) => cp.panel_id)
        .filter((pid) => !alimtalkPanelIdSet.has(pid))

      const profileMap = await fetchPanelNames(linkPanelIds)

      const linkJoined: LinkPanel[] = linkPanelIds.map((pid) => ({
        panel_id: pid,
        status: 'matched',
        profile: profileMap[pid] ? [{ name: profileMap[pid] }] : null,
      }))
      setLinkPanels(linkJoined)
    } else {
      setLinkPanels([])
    }

    // survey_panels: service role 우회
    if (survey?.id) {
      const spRes = await fetch(`/api/surveys/assign-panels?surveyId=${survey.id}`)
      const spData = spRes.ok ? await spRes.json() as { panels: SurveyPanelRow[] } : { panels: [] }
      const rows = spData.panels

      const responseM: Record<string, boolean> = {}
      const assignedIds = new Set<string>()

      rows.forEach((sp) => {
        // 패널이 응답 제출 시 'accepted', 분석 완료 후 'completed' — 둘 다 응답완료로 처리
        responseM[sp.panel_id] = sp.status === 'accepted' || sp.status === 'completed'
        assignedIds.add(sp.panel_id)
      })

      setResponseMap(responseM)
      setAssignedPanelIds(assignedIds)
      setSelectedAssignment(new Set(assignedIds))
    } else {
      setResponseMap({})
      setAssignedPanelIds(new Set())
      setSelectedAssignment(new Set())
    }

    setLoading(false)
  }, [projectId, supabase]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  // ── 핸들러 ──────────────────────────────────────────────

  async function handleCopyLink() {
    if (!projectInviteLink) return
    await navigator.clipboard.writeText(projectInviteLink)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  function toggleAssignment(panelId: string) {
    setAssignSaved(false)
    setSelectedAssignment((prev) => {
      const next = new Set(prev)
      if (next.has(panelId)) next.delete(panelId)
      else next.add(panelId)
      return next
    })
  }

  async function handleSaveAssignment() {
    if (!surveyId) {
      setStartError('설문이 아직 없습니다. 프로젝트 페이지에서 설문을 먼저 생성해주세요.')
      return
    }
    setSavingAssignment(true)
    setAssignSaved(false)
    const toAdd = [...selectedAssignment].filter((id) => !assignedPanelIds.has(id))
    const toRemove = [...assignedPanelIds].filter((id) => !selectedAssignment.has(id) && !responseMap[id])
    try {
      if (toAdd.length > 0) {
        await fetch('/api/surveys/assign-panels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ surveyId, panelIds: toAdd, action: 'add' }),
        })
      }
      if (toRemove.length > 0) {
        await fetch('/api/surveys/assign-panels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ surveyId, panelIds: toRemove, action: 'remove' }),
        })
      }
      setAssignSaved(true)
      await load()
    } finally {
      setSavingAssignment(false)
    }
  }

  async function handleStartSurvey() {
    if (!surveyId) return
    setStartingSurvey(true)
    setStartError(null)
    try {
      const res = await fetch('/api/surveys/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ surveyId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '설문 시작에 실패했습니다')
      router.push(`/client/projects/${projectId}`)
    } catch (e) {
      setStartError(e instanceof Error ? e.message : '오류가 발생했습니다')
    } finally {
      setStartingSurvey(false)
    }
  }

  // ── 파생 값 ─────────────────────────────────────────────
  const acceptedAlimtalk = alimtalkInvitations.filter((i) => i.status === 'accepted' && i.panel_id)
  const totalAccepted = acceptedAlimtalk.length + linkPanels.length
  const respondedCount = Object.values(responseMap).filter(Boolean).length
  const assignmentChanged =
    selectedAssignment.size !== assignedPanelIds.size ||
    [...selectedAssignment].some((id) => !assignedPanelIds.has(id))

  // 전체 가입 패널 (알림톡 + 링크 통합)
  const allAcceptedPanels: { panelId: string; name: string; source: 'alimtalk' | 'link' }[] = [
    ...acceptedAlimtalk.map((inv) => ({
      panelId: inv.panel_id!,
      name: inv.panel_profile?.[0]?.name || '이름 미등록',
      source: 'alimtalk' as const,
    })),
    ...linkPanels.map((lp) => ({
      panelId: lp.panel_id,
      name: lp.profile?.[0]?.name || '이름 미등록',
      source: 'link' as const,
    })),
  ]

  // ── 렌더 ─────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto">
      {/* 헤더 */}
      <div className="mb-6">
        <Link href={`/client/projects/${projectId}`} className="text-sm text-text-muted hover:text-text mb-1 inline-block">
          ← 프로젝트로 돌아가기
        </Link>
        <h1 className="text-2xl font-bold text-text">패널 초대</h1>
        {productName && <p className="text-sm text-text-muted mt-0.5">{productName}</p>}
      </div>

      {/* 설문 진행 중 배너 */}
      {surveyStatus === 'active' && (
        <div className="mb-5 p-3.5 rounded-xl bg-go-bg border border-go/20 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-go animate-pulse flex-shrink-0" />
          <p className="text-sm font-medium text-go">설문 진행 중 · {respondedCount}명 응답 완료</p>
        </div>
      )}

      {/* ── 섹션 1: 초대링크 공유 ─────────────────────────── */}
      <Card className="mb-5">
        <CardTitle>초대링크 공유</CardTitle>
        <p className="text-sm text-text-muted mt-1 mb-4">
          이 링크를 카카오톡, 이메일, 메신저 등으로 공유하세요.
          링크를 클릭하면 패널로 가입하고 설문에 참여할 수 있습니다.
        </p>
        {loadingLink ? (
          <div className="flex items-center gap-2 text-xs text-text-muted py-2">
            <div className="w-4 h-4 border-2 border-navy border-t-transparent rounded-full animate-spin" />
            링크 생성 중...
          </div>
        ) : projectInviteLink ? (
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={projectInviteLink}
              onFocus={(e) => e.target.select()}
              className="flex-1 px-3 py-2.5 text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg text-navy truncate outline-none focus:ring-2 focus:ring-navy/20 min-w-0"
            />
            <button
              onClick={handleCopyLink}
              className={`flex-shrink-0 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                linkCopied ? 'bg-go text-white' : 'bg-navy text-white hover:bg-navy/90'
              }`}
            >
              {linkCopied ? '복사됨 ✓' : '복사'}
            </button>
          </div>
        ) : (
          <p className="text-sm text-text-muted">링크를 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.</p>
        )}
      </Card>

      {/* ── 섹션 2: 패널 목록 (초대 현황 + 선택 통합) ─────── */}
      <Card className="mb-5">
        <div className="flex items-center justify-between mb-1">
          <CardTitle>패널 목록</CardTitle>
          <span className="text-xs text-text-muted">
            총 {totalAccepted}명 가입
            {selectedAssignment.size > 0 && ` · ${selectedAssignment.size}명 선택됨`}
          </span>
        </div>
        <p className="text-xs text-text-muted mb-4">
          가입 완료된 패널 중 이번 설문에 참여할 패널을 선택하세요.
          응답을 완료한 패널은 제외할 수 없습니다.
        </p>

        {loading ? (
          <div className="py-8 text-center">
            <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : allAcceptedPanels.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-text-muted">아직 가입 완료된 패널이 없습니다.</p>
            <p className="text-xs text-text-muted mt-1">위 초대링크를 공유하여 패널을 초대하세요.</p>
          </div>
        ) : (
          <>
            {/* 전체 선택 */}
            <label className="flex items-center gap-3 pb-3 mb-1 border-b border-gray-100 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-gray-300 text-navy"
                checked={
                  selectedAssignment.size === allAcceptedPanels.length &&
                  allAcceptedPanels.length > 0
                }
                onChange={(e) => {
                  setAssignSaved(false)
                  if (e.target.checked) {
                    setSelectedAssignment(new Set(allAcceptedPanels.map((p) => p.panelId)))
                  } else {
                    setSelectedAssignment(
                      new Set(
                        allAcceptedPanels
                          .filter((p) => responseMap[p.panelId])
                          .map((p) => p.panelId)
                      )
                    )
                  }
                }}
              />
              <span className="text-xs font-medium text-text-muted">
                전체 선택 ({allAcceptedPanels.length}명)
              </span>
            </label>

            {/* 패널 행 */}
            <div className="divide-y divide-gray-50">
              {allAcceptedPanels.map(({ panelId, name }) => {
                const isSelected = selectedAssignment.has(panelId)
                const isCompleted = responseMap[panelId] === true
                const isAssigned = assignedPanelIds.has(panelId)

                return (
                  <label
                    key={panelId}
                    className={`flex items-center gap-3 py-3 ${
                      isCompleted
                        ? 'cursor-not-allowed opacity-70'
                        : 'cursor-pointer hover:bg-gray-50 rounded-lg px-1 -mx-1'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isCompleted}
                      onChange={() => !isCompleted && toggleAssignment(panelId)}
                      className="w-4 h-4 rounded border-gray-300 text-navy cursor-pointer flex-shrink-0"
                    />
                    {/* 패널명 */}
                    <span className="flex-1 text-sm font-medium text-text">{name}</span>

                    {/* 가입 상태 */}
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full text-green-600 bg-green-50 flex-shrink-0">
                      가입 완료
                    </span>

                    {/* 응답 / 배정 상태 */}
                    {isCompleted ? (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full text-go bg-go-bg flex-shrink-0">
                        응답 완료
                      </span>
                    ) : isAssigned ? (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full text-navy bg-navy/10 flex-shrink-0">
                        배정
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full text-gray-400 bg-gray-100 flex-shrink-0">
                        미배정
                      </span>
                    )}
                  </label>
                )
              })}
            </div>

            {/* 저장 버튼 */}
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
              <Button
                onClick={handleSaveAssignment}
                loading={savingAssignment}
                disabled={!assignmentChanged}
                size="sm"
              >
                패널 선택 저장
              </Button>
              {assignSaved && <p className="text-xs text-go">저장됐습니다 ✓</p>}
              {assignmentChanged && !assignSaved && (
                <p className="text-xs text-amber-600">저장되지 않은 변경사항이 있습니다</p>
              )}
            </div>
            {startError && <p className="text-xs text-nogo mt-2">{startError}</p>}
          </>
        )}
      </Card>

      {/* ── 섹션 3: 설문 시작 ──────────────────────────────── */}
      {surveyId && surveyStatus !== 'active' && (
        <Card className="border-navy/20 bg-navy/[0.02]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-navy">설문 시작하기</p>
              <p className="text-xs text-text-muted mt-1">
                {selectedAssignment.size > 0
                  ? `선택된 패널 ${selectedAssignment.size}명에게 설문이 발송됩니다.`
                  : '위 패널 목록에서 설문에 참여할 패널을 선택한 뒤 저장하세요.'}
              </p>
            </div>
            <Button
              onClick={handleStartSurvey}
              loading={startingsurvey}
              disabled={selectedAssignment.size === 0}
            >
              설문 시작하기
            </Button>
          </div>
          {startError && <p className="text-xs text-nogo mt-3">{startError}</p>}
        </Card>
      )}
    </div>
  )
}
