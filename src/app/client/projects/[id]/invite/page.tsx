'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Card, { CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Link from 'next/link'

interface Invitation {
  id: string
  email: string
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
  const [responseMap, setResponseMap] = useState<Record<string, boolean>>({}) // panelId → responded
  const [emailInput, setEmailInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ success: number; failed: number } | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)

    // 프로젝트 기본 정보
    const { data: proj } = await supabase
      .from('projects')
      .select('product_name')
      .eq('id', projectId)
      .single()
    if (proj) setProductName(proj.product_name)

    // 초대 목록
    const { data: invs } = await supabase
      .from('project_invitations')
      .select('id, email, status, invited_at, accepted_at, expires_at, panel_id')
      .eq('project_id', projectId)
      .order('invited_at', { ascending: false })
    setInvitations(invs || [])

    // 응답 여부 (panel_id별)
    const acceptedPanelIds = (invs || [])
      .filter((inv) => inv.panel_id && inv.status === 'accepted')
      .map((inv) => inv.panel_id as string)

    if (acceptedPanelIds.length > 0) {
      // 설문 조회
      const { data: surveys } = await supabase
        .from('surveys')
        .select('id')
        .eq('project_id', projectId)
        .limit(1)
      const surveyId = surveys?.[0]?.id

      if (surveyId) {
        const { data: panels } = await supabase
          .from('survey_panels')
          .select('panel_id, status')
          .eq('survey_id', surveyId)
          .in('panel_id', acceptedPanelIds)

        const map: Record<string, boolean> = {}
        ;(panels as PanelResponse[] || []).forEach((p) => {
          map[p.panel_id] = p.status === 'completed'
        })
        setResponseMap(map)
      }
    }

    setLoading(false)
  }, [projectId, supabase])

  useEffect(() => { load() }, [load])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!emailInput.trim()) return

    const emails = emailInput
      .split(/[\n,]/)
      .map((e) => e.trim())
      .filter(Boolean)

    if (emails.length === 0) return

    setSending(true)
    setSendResult(null)

    const res = await fetch('/api/invite/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, emails }),
    })
    const data = await res.json()

    if (res.ok) {
      const results = data.results as { email: string; status: string }[]
      const success = results.filter((r) => r.status === 'sent' || r.status === 'already_accepted').length
      const failed = results.filter((r) => r.status === 'error' || r.status === 'email_failed').length
      setSendResult({ success, failed })
      setEmailInput('')
      await load()
    }

    setSending(false)
  }

  async function handleResend(email: string) {
    await fetch('/api/invite/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, emails: [email] }),
    })
    await load()
  }

  const statusLabel = (inv: Invitation) => {
    if (inv.status === 'accepted') return { text: '수락', color: 'text-green-600 bg-green-50' }
    if (inv.status === 'expired' || new Date(inv.expires_at) < new Date()) return { text: '만료', color: 'text-gray-400 bg-gray-100' }
    return { text: '대기중', color: 'text-amber-600 bg-amber-50' }
  }

  const acceptedCount = invitations.filter((i) => i.status === 'accepted').length
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
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card padding="sm">
          <p className="text-xs text-text-muted">초대 발송</p>
          <p className="text-2xl font-bold text-text">{invitations.length}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-text-muted">수락 완료</p>
          <p className="text-2xl font-bold text-navy">{acceptedCount}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-text-muted">설문 응답</p>
          <p className="text-2xl font-bold text-go">{respondedCount}</p>
        </Card>
      </div>

      {/* 이메일 입력 */}
      <Card className="mb-6">
        <CardTitle>패널 초대 발송</CardTitle>
        <p className="text-sm text-text-muted mt-1 mb-4">
          초대할 이메일 주소를 입력하세요. 여러 명은 줄바꿈이나 쉼표로 구분하세요.
        </p>
        <form onSubmit={handleSend} className="space-y-3">
          <textarea
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder={"hong@company.com\nkim@company.com\nlee@company.com"}
            rows={4}
            className="w-full px-3.5 py-3 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy resize-none transition-colors"
          />
          <Button type="submit" loading={sending} disabled={!emailInput.trim()}>
            초대 이메일 발송
          </Button>
        </form>

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
                    <p className="text-sm font-medium text-text truncate">{inv.email}</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {new Date(inv.invited_at).toLocaleDateString('ko-KR')} 초대
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    {/* 초대 상태 */}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sl.color}`}>
                      {sl.text}
                    </span>
                    {/* 응답 여부 (수락자만) */}
                    {inv.status === 'accepted' && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        responded ? 'text-go bg-go-bg' : 'text-gray-400 bg-gray-100'
                      }`}>
                        {responded ? '응답 완료' : '미응답'}
                      </span>
                    )}
                    {/* 재발송 (대기중만) */}
                    {inv.status === 'pending' && (
                      <button
                        onClick={() => handleResend(inv.email)}
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
