'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Card, { CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Link from 'next/link'

interface Invitation {
  id: string
  phone: string
  status: string
  invited_at: string
  accepted_at: string | null
  expires_at: string
  panel_id: string | null
  panel_profile: { name: string } | null
}

interface SurveyPanelRow {
  panel_id: string
  status: string
}

interface PoolPanel {
  id: string
  panel_id: string
  phone: string | null
  added_at: string
  profile: { name: string } | null
}

export default function InvitePage() {
  const { id: projectId } = useParams<{ id: string }>()
  const supabase = createClient()

  const [productName, setProductName] = useState('')
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [responseMap, setResponseMap] = useState<Record<string, boolean>>({})
  const [phoneInput, setPhoneInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [reminding, setReminding] = useState(false)
  const [remindResult, setRemindResult] = useState<{ sent: number; failed: number } | null>(null)

  // 설문 상태
  const [surveyId, setSurveyId] = useState<string | null>(null)
  const [surveyStatus, setSurveyStatus] = useState<string | null>(null)
  const [startingsurvey, setStartingSurvey] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)

  // 테스트 참여 패널 선택
  const [assignedPanelIds, setAssignedPanelIds] = useState<Set<string>>(new Set())
  const [selectedAssignment, setSelectedAssignment] = useState<Set<string>>(new Set())
  const [savingAssignment, setSavingAssignment] = useState(false)
  const [assignSaved, setAssignSaved] = useState(false)

  // 패널 풀
  const [poolPanels, setPoolPanels] = useState<PoolPanel[]>([])
  const [selectedPanelIds, setSelectedPanelIds] = useState<Set<string>>(new Set())
  const [sendingPool, setSendingPool] = useState(false)
  const [poolResult, setPoolResult] = useState<{ success: number; failed: number } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)

    const { data: proj } = await supabase
      .from('projects')
      .select('product_name')
      .eq('id', projectId)
      .single()
    if (proj) setProductName(proj.product_name)

    // 설문 로드
    const { data: surveys } = await supabase
      .from('surveys')
      .select('id, status')
      .eq('project_id', projectId)
      .limit(1)
    const survey = surveys?.[0] ?? null
    if (survey) {
      setSurveyId(survey.id)
      setSurveyStatus(survey.status)
    }

    // 초대 현황 (패널 이름 포함)
    const { data: invs } = await supabase
      .from('project_invitations')
      .select('id, phone, status, invited_at, accepted_at, expires_at, panel_id, panel_profile:profiles!panel_id(name)')
      .eq('project_id', projectId)
      .order('invited_at', { ascending: false })
    setInvitations((invs as Invitation[]) || [])

    const acceptedPanelIds = (invs || [])
      .filter((inv) => inv.panel_id && inv.status === 'accepted')
      .map((inv) => inv.panel_id as string)

    // survey_panels 로드 → 응답 완료 여부 + 현재 배정 목록
    if (acceptedPanelIds.length > 0 && survey?.id) {
      const { data: panels } = await supabase
        .from('survey_panels')
        .select('panel_id, status')
        .eq('survey_id', survey.id)
        .in('panel_id', acceptedPanelIds)

      const map: Record<string, boolean> = {}
      const assignedIds = new Set<string>()
      ;(panels as SurveyPanelRow[] || []).forEach((p) => {
        map[p.panel_id] = p.status === 'completed'
        assignedIds.add(p.panel_id)
      })
      setResponseMap(map)
      setAssignedPanelIds(assignedIds)
      setSelectedAssignment(new Set(assignedIds))
    } else {
      setResponseMap({})
      setAssignedPanelIds(new Set())
      setSelectedAssignment(new Set())
    }

    // 패널 풀 로드
    const { data: pool } = await supabase
      .from('client_panels')
      .select('id, panel_id, phone, added_at, profile:profiles!panel_id(name)')
      .order('added_at', { ascending: false })
    setPoolPanels((pool as PoolPanel[]) || [])

    setLoading(false)
  }, [projectId, supabase])

  useEffect(() => { load() }, [load])

  // 이미 초대된 전화번호 목록
  const invitedPhones = new Set(invitations.map((inv) => inv.phone))

  // ── 테스트 패널 배정 저장 ──────────────────────────────
  async function handleSaveAssignment() {
    if (!surveyId) return
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

  function toggleAssignment(panelId: string) {
    setAssignSaved(false)
    setSelectedAssignment((prev) => {
      const next = new Set(prev)
      if (next.has(panelId)) next.delete(panelId)
      else next.add(panelId)
      return next
    })
  }

  // ── 알림톡 발송 ───────────────────────────────────────
  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!phoneInput.trim()) return

    const phones = phoneInput
      .split(/[\n,]/)
      .map((p) => p.trim().replace(/-/g, ''))
      .filter(Boolean)

    if (phones.length === 0) return

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
      setSendError('네트워크 오류가 발생했습니다. 다시 시도해주세요.')
    }

    setSending(false)
  }

  async function handleResend(phone: string) {
    await fetch('/api/invite/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, phones: [phone] }),
    })
    await load()
  }

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
      setSurveyStatus('active')
    } catch (e) {
      setStartError(e instanceof Error ? e.message : '오류가 발생했습니다')
    } finally {
      setStartingSurvey(false)
    }
  }

  // ── 패널 풀에서 선택 발송 ─────────────────────────────
  async function handleSendFromPool() {
    const selected = poolPanels.filter((p) => selectedPanelIds.has(p.id) && p.phone)
    if (selected.length === 0) return

    setSendingPool(true)
    setPoolResult(null)

    const phones = selected.map((p) => p.phone as string)
    try {
      const res = await fetch('/api/invite/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, phones }),
      })
      const data = await res.json()
      if (res.ok) {
        const results = data.results as { status: string }[]
        const success = results.filter((r) => r.status === 'sent' || r.status === 'already_accepted').length
        const failed = results.filter((r) => r.status === 'error' || r.status === 'alimtalk_failed').length
        setPoolResult({ success, failed })
        setSelectedPanelIds(new Set())
        await load()
      }
    } catch { /* 무시 */ }

    setSendingPool(false)
  }

  function togglePool(id: string) {
    setSelectedPanelIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAllPool() {
    const selectable = poolPanels.filter((p) => p.phone && !invitedPhones.has(p.phone))
    if (selectedPanelIds.size === selectable.length) {
      setSelectedPanelIds(new Set())
    } else {
      setSelectedPanelIds(new Set(selectable.map((p) => p.id)))
    }
  }

  const statusLabel = (inv: Invitation) => {
    if (inv.status === 'accepted') return { text: '가입 완료', color: 'text-green-600 bg-green-50' }
    if (inv.status === 'expired' || new Date(inv.expires_at) < new Date()) return { text: '만료', color: 'text-gray-400 bg-gray-100' }
    return { text: '미가입', color: 'text-amber-600 bg-amber-50' }
  }

  const acceptedInvitations = invitations.filter((i) => i.status === 'accepted' && i.panel_id)
  const registeredCount = acceptedInvitations.length
  const pendingCount = invitations.filter((i) => i.status === 'pending').length
  const respondedCount = Object.values(responseMap).filter(Boolean).length
  const assignmentChanged =
    selectedAssignment.size !== assignedPanelIds.size ||
    [...selectedAssignment].some((id) => !assignedPanelIds.has(id))

  const selectablePoolPanels = poolPanels.filter((p) => p.phone && !invitedPhones.has(p.phone))

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href={`/client/projects/${projectId}`} className="text-sm text-text-muted hover:text-text mb-1 inline-block">
            ← 프로젝트로 돌아가기
          </Link>
          <h1 className="text-2xl font-bold text-text">패널 초대</h1>
          {productName && <p className="text-sm text-text-muted mt-0.5">{productName}</p>}
        </div>
      </div>

      {/* 현황 요약 */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <Card padding="sm">
          <p className="text-xs text-text-muted">초대 발송</p>
          <p className="text-2xl font-bold text-text">{invitations.length}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-text-muted">가입 완료</p>
          <p className="text-2xl font-bold text-navy">{registeredCount}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-text-muted">테스트 배정</p>
          <p className="text-2xl font-bold text-cgo">{assignedPanelIds.size}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-text-muted">설문 응답</p>
          <p className="text-2xl font-bold text-go">{respondedCount}</p>
        </Card>
      </div>

      {/* ── 테스트 참여 패널 선택 ──────────────────────── */}
      {acceptedInvitations.length > 0 && surveyId && (
        <Card className="mb-6">
          <CardTitle>테스트 참여 패널 선택</CardTitle>
          <p className="text-sm text-text-muted mt-1 mb-4">
            가입 완료된 패널 중 이번 프로젝트 테스트에 참여할 패널을 선택하세요.
            응답을 완료한 패널은 제외할 수 없습니다.
          </p>

          <div className="divide-y divide-gray-50">
            {acceptedInvitations.map((inv) => {
              const panelId = inv.panel_id!
              const isAssigned = selectedAssignment.has(panelId)
              const isCompleted = responseMap[panelId] === true
              const name = inv.panel_profile?.name || '이름 미등록'

              return (
                <label
                  key={inv.id}
                  className={`flex items-center gap-3 py-3 ${isCompleted ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-gray-50 rounded-lg px-1 -mx-1'}`}
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
                    <p className="text-xs text-text-muted">{inv.phone}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isCompleted ? (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full text-go bg-go-bg">응답 완료</span>
                    ) : isAssigned ? (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full text-navy bg-navy/10">테스트 중</span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full text-gray-400 bg-gray-100">미배정</span>
                    )}
                  </div>
                </label>
              )
            })}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Button
              onClick={handleSaveAssignment}
              loading={savingAssignment}
              disabled={!assignmentChanged}
              size="sm"
            >
              변경 사항 저장
            </Button>
            {assignSaved && (
              <p className="text-xs text-go">저장됐습니다</p>
            )}
            {assignmentChanged && !assignSaved && (
              <p className="text-xs text-amber-600">저장되지 않은 변경사항이 있습니다</p>
            )}
          </div>
        </Card>
      )}

      {/* 설문 시작 버튼 */}
      {surveyId && surveyStatus !== 'active' && registeredCount > 0 && (
        <Card className="mb-6 border-navy/20 bg-navy/[0.02]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-navy">설문을 시작할 준비가 됐나요?</p>
              <p className="text-xs text-text-muted mt-1">
                배정된 패널 {assignedPanelIds.size}명이 설문에 응답할 수 있습니다.
                {pendingCount > 0 && ` (아직 미가입 ${pendingCount}명)`}
              </p>
            </div>
            <Button onClick={handleStartSurvey} loading={startingsurvey}>
              설문 시작하기
            </Button>
          </div>
          {startError && <p className="text-xs text-nogo mt-3">{startError}</p>}
        </Card>
      )}

      {/* 설문 진행 중 배너 */}
      {surveyStatus === 'active' && (
        <div className="mb-6 p-4 rounded-xl bg-go-bg border border-go/20 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-go animate-pulse flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-go">설문 진행 중</p>
            <p className="text-xs text-text-muted mt-0.5">패널들이 설문에 응답하고 있습니다.</p>
          </div>
        </div>
      )}

      {/* 독촉 알림톡 */}
      {pendingCount > 0 && (
        <Card className="mb-6 border-amber-200 bg-amber-50/40">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-amber-800">미가입 패널에게 독촉 알림톡</p>
              <p className="text-xs text-amber-700 mt-0.5">
                아직 가입하지 않은 {pendingCount}명에게 설문 참여를 독촉합니다.
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={handleRemind} loading={reminding}>
              독촉 발송
            </Button>
          </div>
          {remindResult && (
            <p className={`text-xs mt-3 ${remindResult.failed === 0 ? 'text-go' : 'text-amber-700'}`}>
              {remindResult.sent}명 발송 완료{remindResult.failed > 0 && `, ${remindResult.failed}명 실패`}
            </p>
          )}
        </Card>
      )}

      {/* 내 패널 풀에서 선택 */}
      {poolPanels.length > 0 && (
        <Card className="mb-6">
          <CardTitle>내 패널에서 선택</CardTitle>
          <p className="text-sm text-text-muted mt-1 mb-4">
            이전에 함께한 패널을 선택해 알림톡을 발송합니다.
            이미 초대된 패널은 비활성화됩니다.
          </p>

          {selectablePoolPanels.length > 0 && (
            <label className="flex items-center gap-2.5 pb-3 mb-1 border-b border-gray-100 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-gray-300 text-navy cursor-pointer"
                checked={selectedPanelIds.size === selectablePoolPanels.length && selectablePoolPanels.length > 0}
                onChange={toggleAllPool}
              />
              <span className="text-xs font-medium text-text-muted">
                전체 선택 ({selectablePoolPanels.length}명)
              </span>
            </label>
          )}

          <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
            {poolPanels.map((p) => {
              const alreadyInvited = p.phone ? invitedPhones.has(p.phone) : true
              return (
                <label
                  key={p.id}
                  className={`flex items-center gap-3 py-2.5 ${alreadyInvited ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50 rounded-lg px-1'}`}
                >
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-navy cursor-pointer flex-shrink-0"
                    checked={selectedPanelIds.has(p.id)}
                    onChange={() => !alreadyInvited && togglePool(p.id)}
                    disabled={alreadyInvited}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text">{p.profile?.name || '이름 미등록'}</p>
                    <p className="text-xs text-text-muted">{p.phone || '-'}</p>
                  </div>
                  {alreadyInvited && (
                    <span className="text-xs text-gray-400 flex-shrink-0">이미 초대됨</span>
                  )}
                </label>
              )
            })}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Button
              onClick={handleSendFromPool}
              loading={sendingPool}
              disabled={selectedPanelIds.size === 0}
              size="sm"
            >
              선택한 {selectedPanelIds.size > 0 ? `${selectedPanelIds.size}명에게 ` : ''}알림톡 발송
            </Button>
            {poolResult && (
              <p className={`text-xs ${poolResult.failed === 0 ? 'text-go' : 'text-amber-600'}`}>
                {poolResult.success}명 발송 완료
                {poolResult.failed > 0 && `, ${poolResult.failed}명 실패`}
              </p>
            )}
          </div>
        </Card>
      )}

      {/* 전화번호 직접 입력 */}
      <Card className="mb-6">
        <CardTitle>카카오 알림톡 초대 발송</CardTitle>
        <p className="text-sm text-text-muted mt-1 mb-4">
          초대할 휴대폰 번호를 입력하세요. 링크를 통해 패널로 가입하고 바로 설문에 참여할 수 있습니다.
        </p>
        <form onSubmit={handleSend} className="space-y-3">
          <textarea
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            placeholder={"01012345678\n01087654321\n010-1111-2222"}
            rows={4}
            className="w-full px-3.5 py-3 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy resize-none transition-colors"
          />
          <Button type="submit" loading={sending} disabled={!phoneInput.trim()}>
            알림톡 발송
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
      </Card>

      {/* 초대 현황 테이블 */}
      <Card>
        <CardTitle>초대 현황</CardTitle>
        <p className="text-xs text-text-muted mt-1 mb-4">
          개인 응답 내용은 패널 프라이버시 보호를 위해 공개되지 않습니다.
        </p>

        {loading ? (
          <div className="py-8 text-center">
            <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : invitations.length === 0 ? (
          <div className="py-8 text-center text-text-muted text-sm">아직 초대한 패널이 없습니다</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {invitations.map((inv) => {
              const sl = statusLabel(inv)
              const responded = inv.panel_id ? responseMap[inv.panel_id] : false
              const name = inv.panel_profile?.name

              return (
                <div key={inv.id} className="flex items-center justify-between py-3">
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
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${responded ? 'text-go bg-go-bg' : 'text-gray-400 bg-gray-100'}`}>
                        {responded ? '응답 완료' : '미응답'}
                      </span>
                    )}
                    {inv.status === 'pending' && (
                      <button onClick={() => handleResend(inv.phone)} className="text-xs text-navy hover:underline">
                        재발송
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
