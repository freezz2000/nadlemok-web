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

interface ClientPanelRow {
  panel_id: string
  profile: { name: string }[] | null
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

  // 초대 탭
  const [inviteTab, setInviteTab] = useState<'alimtalk' | 'link'>('alimtalk')

  // 알림톡 초대
  const [phoneInput, setPhoneInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [reminding, setReminding] = useState(false)
  const [remindResult, setRemindResult] = useState<{ sent: number; failed: number } | null>(null)

  // 초대링크
  const [projectInviteLink, setProjectInviteLink] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)
  const [loadingLink, setLoadingLink] = useState(false)

  // 초대 목록
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

    // 현재 로그인한 고객사 ID
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

    // ── 공통 헬퍼: 패널 이름 API 조회 (profiles RLS 우회용) ──────────────
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

    // 알림톡 초대 목록 (이름은 별도 API로 조회 — profiles RLS 우회)
    const { data: invs } = await supabase
      .from('project_invitations')
      .select('id, phone, status, invited_at, accepted_at, expires_at, panel_id')
      .eq('project_id', projectId)
      .order('invited_at', { ascending: false })
    const rawInvList = (invs as Omit<AlimtalkInvitation, 'panel_profile'>[]) || []

    // 수락 완료된 패널 이름 일괄 조회
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

    // 알림톡으로 가입 완료된 패널 ID 목록
    const alimtalkPanelIdSet = new Set(
      invList.filter((i) => i.panel_id && i.status === 'accepted').map((i) => i.panel_id!)
    )

    // ── 링크 가입 패널: client_panels에서 로드 (설문 유무 무관하게 항상 존재)
    // accept-project API는 설문 유무와 관계없이 client_panels에 항상 기록
    if (clientId) {
      const { data: cpRows } = await supabase
        .from('client_panels')
        .select('panel_id')
        .eq('client_id', clientId)

      const linkPanelIds = ((cpRows as { panel_id: string }[]) || [])
        .map((cp) => cp.panel_id)
        .filter((pid) => !alimtalkPanelIdSet.has(pid))

      // 이름은 API로 조회 (profiles RLS 우회)
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

    // ── survey_panels: API 경유 조회 (클라이언트 RLS에 SELECT 정책 없음 → service role 우회)
    if (survey?.id) {
      const spRes = await fetch(`/api/surveys/assign-panels?surveyId=${survey.id}`)
      const spData = spRes.ok ? await spRes.json() as { panels: SurveyPanelRow[] } : { panels: [] }
      const rows = spData.panels

      const responseM: Record<string, boolean> = {}
      const assignedIds = new Set<string>()

      rows.forEach((sp) => {
        responseM[sp.panel_id] = sp.status === 'completed'
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

  // 초대링크 복사
  async function handleCopyLink() {
    if (!projectInviteLink) return
    await navigator.clipboard.writeText(projectInviteLink)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  // 알림톡 발송
  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const phones = phoneInput.split(/[\n,]/).map((p) => p.trim().replace(/-/g, '')).filter(Boolean)
    if (!phones.length) return
    setSending(true)
    setSendResult(null)
    setSendError(null)
    try {
      const res = await fetch('/api/invite/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, phones }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSendError(data.error || `오류가 발생했습니다. (${res.status})`)
      } else {
        const results = data.results as { phone: string; status: string; message?: string }[]
        const success = results.filter((r) => r.status === 'sent' || r.status === 'already_accepted').length
        const failed = results.filter((r) => r.status === 'error' || r.status === 'alimtalk_failed').length
        const errors = results
          .filter((r) => r.status === 'error' || r.status === 'alimtalk_failed')
          .map((r) => `${r.phone}: ${r.message || r.status}`)
        setSendResult({ success, failed, errors })
        setPhoneInput('')
        await load()
      }
    } catch {
      setSendError('네트워크 오류가 발생했습니다.')
    }
    setSending(false)
  }

  // 재발송
  async function handleResend(phone: string) {
    await fetch('/api/invite/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, phones: [phone] }),
    })
    await load()
  }

  // 독촉 알림톡
  async function handleRemind() {
    setReminding(true)
    setRemindResult(null)
    try {
      const res = await fetch('/api/invite/remind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })
      const data = await res.json()
      if (res.ok) setRemindResult({ sent: data.sent, failed: data.failed })
    } catch { /* 무시 */ }
    setReminding(false)
  }

  // 패널 선택 토글
  function toggleAssignment(panelId: string) {
    setAssignSaved(false)
    setSelectedAssignment((prev) => {
      const next = new Set(prev)
      if (next.has(panelId)) next.delete(panelId)
      else next.add(panelId)
      return next
    })
  }

  // 패널 선택 저장
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

  // 설문 시작
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
      // 설문 시작 완료 → 프로젝트 페이지(진행 현황)로 이동
      router.push(`/client/projects/${projectId}`)
    } catch (e) {
      setStartError(e instanceof Error ? e.message : '오류가 발생했습니다')
    } finally {
      setStartingSurvey(false)
    }
  }

  // ── 파생 값 ─────────────────────────────────────────────
  const alimtalkStatusLabel = (inv: AlimtalkInvitation) => {
    if (inv.status === 'accepted') return { text: '가입 완료', color: 'text-green-600 bg-green-50' }
    if (inv.status === 'expired' || new Date(inv.expires_at) < new Date())
      return { text: '만료', color: 'text-gray-400 bg-gray-100' }
    return { text: '미가입', color: 'text-amber-600 bg-amber-50' }
  }

  const acceptedAlimtalk = alimtalkInvitations.filter((i) => i.status === 'accepted' && i.panel_id)
  const pendingCount = alimtalkInvitations.filter((i) => i.status === 'pending').length
  const totalAccepted = acceptedAlimtalk.length + linkPanels.length
  const respondedCount = Object.values(responseMap).filter(Boolean).length
  const assignmentChanged =
    selectedAssignment.size !== assignedPanelIds.size ||
    [...selectedAssignment].some((id) => !assignedPanelIds.has(id))

  // 패널 선택 대상: 알림톡 가입 + 링크 가입 전체
  const allAcceptedPanels: { panelId: string; name: string; phone?: string; source: 'alimtalk' | 'link' }[] = [
    ...acceptedAlimtalk.map((inv) => ({
      panelId: inv.panel_id!,
      name: inv.panel_profile?.[0]?.name || '이름 미등록',
      phone: inv.phone,
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

      {/* ── 섹션 1: 초대하기 (탭) ─────────────────────────── */}
      <Card className="mb-5">
        {/* 탭 헤더 */}
        <div className="flex gap-1 mb-5 p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => setInviteTab('alimtalk')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              inviteTab === 'alimtalk'
                ? 'bg-white text-navy shadow-sm'
                : 'text-text-muted hover:text-text'
            }`}
          >
            카카오 알림톡 초대
          </button>
          <button
            onClick={() => setInviteTab('link')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              inviteTab === 'link'
                ? 'bg-white text-navy shadow-sm'
                : 'text-text-muted hover:text-text'
            }`}
          >
            초대링크 공유
          </button>
        </div>

        {/* 탭 1: 알림톡 */}
        {inviteTab === 'alimtalk' && (
          <div>
            <p className="text-sm text-text-muted mb-3">
              초대할 휴대폰 번호를 입력하세요. 한 줄에 하나씩 입력하거나 쉼표로 구분합니다.
            </p>
            <form onSubmit={handleSend} className="space-y-3">
              <textarea
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder={'01012345678\n01087654321\n010-1111-2222'}
                rows={4}
                className="w-full px-3.5 py-3 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy resize-none transition-colors"
              />
              <Button type="submit" loading={sending} disabled={!phoneInput.trim()}>
                카카오 알림톡 발송
              </Button>
            </form>

            {sendError && (
              <div className="mt-3 px-3 py-2 rounded-lg text-sm bg-red-50 text-red-700">{sendError}</div>
            )}
            {sendResult && (
              <div className={`mt-3 px-3 py-2 rounded-lg text-sm ${sendResult.failed === 0 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                {sendResult.success}명 발송 완료
                {sendResult.failed > 0 && `, ${sendResult.failed}명 실패`}
                {sendResult.errors.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5 text-xs opacity-80">
                    {sendResult.errors.map((e, i) => <li key={i} className="font-mono">{e}</li>)}
                  </ul>
                )}
              </div>
            )}

            {/* 독촉 */}
            {pendingCount > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-4">
                <p className="text-xs text-amber-700">
                  미가입 {pendingCount}명에게 독촉 알림톡을 보낼 수 있습니다.
                </p>
                <Button variant="secondary" size="sm" onClick={handleRemind} loading={reminding}>
                  독촉 발송
                </Button>
              </div>
            )}
            {remindResult && (
              <p className={`text-xs mt-2 ${remindResult.failed === 0 ? 'text-go' : 'text-amber-700'}`}>
                {remindResult.sent}명 발송 완료{remindResult.failed > 0 && `, ${remindResult.failed}명 실패`}
              </p>
            )}
          </div>
        )}

        {/* 탭 2: 초대링크 */}
        {inviteTab === 'link' && (
          <div>
            <p className="text-sm text-text-muted mb-3">
              이 링크를 복사해 카카오톡, 이메일, 메신저 등으로 공유하세요.
              링크를 클릭하면 패널로 가입하고 바로 설문에 참여할 수 있습니다.
            </p>
            {loadingLink ? (
              <div className="flex items-center gap-2 text-xs text-text-muted py-3">
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
          </div>
        )}
      </Card>

      {/* ── 섹션 2: 초대 목록 ──────────────────────────────── */}
      <Card className="mb-5">
        <div className="flex items-center justify-between mb-1">
          <CardTitle>초대 목록</CardTitle>
          <span className="text-xs text-text-muted">총 가입 {totalAccepted}명</span>
        </div>
        <p className="text-xs text-text-muted mb-4">개인 응답 내용은 패널 프라이버시 보호를 위해 공개되지 않습니다.</p>

        {loading ? (
          <div className="py-8 text-center">
            <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <>
            {/* 알림톡 초대 */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                카카오 알림톡 초대
                <span className="font-normal">({alimtalkInvitations.length}명)</span>
              </p>
              {alimtalkInvitations.length === 0 ? (
                <p className="text-sm text-text-muted py-2 pl-3">아직 발송된 알림톡이 없습니다</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {alimtalkInvitations.map((inv) => {
                    const sl = alimtalkStatusLabel(inv)
                    const responded = inv.panel_id ? responseMap[inv.panel_id] : false
                    const name = inv.panel_profile?.[0]?.name
                    return (
                      <div key={inv.id} className="flex items-center justify-between py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-text">
                            {name ? `${name} · ` : ''}{inv.phone}
                          </p>
                          <p className="text-xs text-text-muted mt-0.5">
                            {new Date(inv.invited_at).toLocaleDateString('ko-KR')} 초대
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sl.color}`}>
                            {sl.text}
                          </span>
                          {inv.status === 'accepted' && (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              responded ? 'text-go bg-go-bg' : 'text-gray-400 bg-gray-100'
                            }`}>
                              {responded ? '응답 완료' : '미응답'}
                            </span>
                          )}
                          {inv.status === 'pending' && (
                            <button
                              onClick={() => handleResend(inv.phone)}
                              className="text-xs text-navy hover:underline"
                            >
                              재발송
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 초대링크 가입 */}
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-navy inline-block" />
                초대링크 가입
                <span className="font-normal">({linkPanels.length}명)</span>
              </p>
              {linkPanels.length === 0 ? (
                <p className="text-sm text-text-muted py-2 pl-3">아직 링크로 가입한 패널이 없습니다</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {linkPanels.map((lp) => {
                    const responded = responseMap[lp.panel_id] === true
                    const name = lp.profile?.[0]?.name || '이름 미등록'
                    return (
                      <div key={lp.panel_id} className="flex items-center justify-between py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-text">{name}</p>
                          <p className="text-xs text-text-muted mt-0.5">링크로 가입</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full text-green-600 bg-green-50">
                            가입 완료
                          </span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            responded ? 'text-go bg-go-bg' : 'text-gray-400 bg-gray-100'
                          }`}>
                            {responded ? '응답 완료' : '미응답'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </Card>

      {/* ── 섹션 3: 패널 선택 ──────────────────────────────── */}
      <Card className="mb-5">
        <div className="flex items-center justify-between mb-1">
          <CardTitle>패널 선택</CardTitle>
          <span className="text-xs text-text-muted">
            {selectedAssignment.size}명 선택됨
          </span>
        </div>
        <p className="text-sm text-text-muted mt-1 mb-4">
          가입 완료된 패널 중 이번 설문에 참여할 패널을 선택하세요.
          응답을 완료한 패널은 제외할 수 없습니다.
        </p>

        {allAcceptedPanels.length === 0 ? (
          <p className="text-sm text-text-muted py-4 text-center">
            아직 가입 완료된 패널이 없습니다
          </p>
        ) : (
          <>
            {/* 전체 선택 */}
            <label className="flex items-center gap-2.5 pb-3 mb-1 border-b border-gray-100 cursor-pointer">
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
                    // 응답 완료된 패널은 유지
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

            <div className="divide-y divide-gray-50">
              {allAcceptedPanels.map(({ panelId, name, phone, source }) => {
                const isAssigned = selectedAssignment.has(panelId)
                const isCompleted = responseMap[panelId] === true
                return (
                  <label
                    key={panelId}
                    className={`flex items-center gap-3 py-2.5 ${
                      isCompleted
                        ? 'cursor-not-allowed opacity-60'
                        : 'cursor-pointer hover:bg-gray-50 rounded-lg px-1 -mx-1'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isAssigned}
                      disabled={isCompleted}
                      onChange={() => !isCompleted && toggleAssignment(panelId)}
                      className="w-4 h-4 rounded border-gray-300 text-navy cursor-pointer flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text">{name}</p>
                      <p className="text-xs text-text-muted">
                        {source === 'alimtalk' ? phone : '링크로 가입'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`text-xs px-1.5 py-0.5 rounded text-gray-400 bg-gray-100 ${
                        source === 'link' ? 'text-navy/60 bg-navy/5' : ''
                      }`}>
                        {source === 'alimtalk' ? '알림톡' : '링크'}
                      </span>
                      {isCompleted ? (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full text-go bg-go-bg">응답 완료</span>
                      ) : isAssigned ? (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full text-navy bg-navy/10">배정</span>
                      ) : (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full text-gray-400 bg-gray-100">미배정</span>
                      )}
                    </div>
                  </label>
                )
              })}
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <div className="flex items-center gap-3">
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
              {startError && (
                <p className="text-xs text-nogo">{startError}</p>
              )}
            </div>
          </>
        )}
      </Card>

      {/* 설문 시작 카드 — 항상 표시 (설문이 있고 아직 활성화 전) */}
      {surveyId && surveyStatus !== 'active' && (
        <Card className="border-navy/20 bg-navy/[0.02]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-navy">설문 시작하기</p>
              <p className="text-xs text-text-muted mt-1">
                {selectedAssignment.size > 0
                  ? `선택된 패널 ${selectedAssignment.size}명에게 설문이 발송됩니다.${pendingCount > 0 ? ` (아직 미가입 ${pendingCount}명)` : ''}`
                  : '위 패널 선택 섹션에서 설문에 참여할 패널을 선택한 뒤 저장하세요.'}
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
