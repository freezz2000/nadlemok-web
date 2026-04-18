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
}

interface PanelResponse {
  panel_id: string
  status: string
}

export default function InvitePage() {
  const { id: projectId } = useParams<{ id: string }>()
  const supabase = createClient()

  const [productName, setProductName] = useState('')
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [responseMap, setResponseMap] = useState<Record<string, boolean>>({})
  const [phoneInput, setPhoneInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ success: number; failed: number } | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // 설문 상태
  const [surveyId, setSurveyId] = useState<string | null>(null)
  const [surveyStatus, setSurveyStatus] = useState<string | null>(null)
  const [startingsurvey, setStartingSurvey] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)

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
    if (surveys?.[0]) {
      setSurveyId(surveys[0].id)
      setSurveyStatus(surveys[0].status)
    }

    const { data: invs } = await supabase
      .from('project_invitations')
      .select('id, phone, status, invited_at, accepted_at, expires_at, panel_id')
      .eq('project_id', projectId)
      .order('invited_at', { ascending: false })
    setInvitations(invs || [])

    const acceptedPanelIds = (invs || [])
      .filter((inv) => inv.panel_id && inv.status === 'accepted')
      .map((inv) => inv.panel_id as string)

    if (acceptedPanelIds.length > 0 && surveys?.[0]?.id) {
      const { data: panels } = await supabase
        .from('survey_panels')
        .select('panel_id, status')
        .eq('survey_id', surveys[0].id)
        .in('panel_id', acceptedPanelIds)

      const map: Record<string, boolean> = {}
      ;(panels as PanelResponse[] || []).forEach((p) => {
        map[p.panel_id] = p.status === 'completed'
      })
      setResponseMap(map)
    }

    setLoading(false)
  }, [projectId, supabase])

  useEffect(() => { load() }, [load])

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
        const results = data.results as { phone: string; status: string }[]
        const success = results.filter((r) => r.status === 'sent' || r.status === 'already_accepted').length
        const failed = results.filter((r) => r.status === 'error' || r.status === 'alimtalk_failed').length
        setSendResult({ success, failed })
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

  const statusLabel = (inv: Invitation) => {
    if (inv.status === 'accepted') return { text: '가입 완료', color: 'text-green-600 bg-green-50' }
    if (inv.status === 'expired' || new Date(inv.expires_at) < new Date()) return { text: '만료', color: 'text-gray-400 bg-gray-100' }
    return { text: '미가입', color: 'text-amber-600 bg-amber-50' }
  }

  const registeredCount = invitations.filter((i) => i.status === 'accepted').length
  const pendingCount = invitations.filter((i) => i.status === 'pending').length
  const respondedCount = Object.values(responseMap).filter(Boolean).length

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
          <p className="text-xs text-text-muted">미가입</p>
          <p className="text-2xl font-bold text-amber-500">{pendingCount}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-text-muted">설문 응답</p>
          <p className="text-2xl font-bold text-go">{respondedCount}</p>
        </Card>
      </div>

      {/* 설문 시작 버튼 */}
      {surveyId && surveyStatus !== 'active' && registeredCount > 0 && (
        <Card className="mb-6 border-navy/20 bg-navy/[0.02]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-navy">설문을 시작할 준비가 됐나요?</p>
              <p className="text-xs text-text-muted mt-1">
                가입 완료된 패널 {registeredCount}명이 설문에 응답할 수 있습니다.
                {pendingCount > 0 && ` (아직 미가입 ${pendingCount}명)`}
              </p>
            </div>
            <Button onClick={handleStartSurvey} loading={startingsurvey}>
              설문 시작하기
            </Button>
          </div>
          {startError && (
            <p className="text-xs text-nogo mt-3">{startError}</p>
          )}
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

      {/* 전화번호 입력 */}
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
          <div className="mt-3 px-3 py-2 rounded-lg text-sm bg-red-50 text-red-700">
            {sendError}
          </div>
        )}
        {sendResult && (
          <div className={`mt-3 px-3 py-2 rounded-lg text-sm ${
            sendResult.failed === 0 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
          }`}>
            {sendResult.success}명 발송 완료
            {sendResult.failed > 0 && `, ${sendResult.failed}명 실패`}
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
          <div className="py-8 text-center text-text-muted text-sm">
            아직 초대한 패널이 없습니다
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {invitations.map((inv) => {
              const sl = statusLabel(inv)
              const responded = inv.panel_id ? responseMap[inv.panel_id] : false

              return (
                <div key={inv.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text">{inv.phone}</p>
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
      </Card>
    </div>
  )
}
