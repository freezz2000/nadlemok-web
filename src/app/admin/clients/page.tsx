'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Card, { CardTitle } from '@/components/ui/Card'
import Badge, { StatusBadge } from '@/components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import Button from '@/components/ui/Button'
import type { ProjectStatus } from '@/lib/types'

interface ClientInfo {
  id: string
  name: string
  company: string | null
  phone: string | null
  created_at: string
  projects: { id: string; status: string; product_name: string }[]
}

interface PaymentRecord {
  id: string
  order_id: string
  payment_key: string | null
  amount: number
  status: 'DONE' | 'CANCELED' | 'FAILED'
  paid_at: string | null
  created_at: string
}

const AMOUNT_TO_CREDITS: Record<number, number> = {
  500000: 30,
  800000: 50,
}

export default function ClientsPage() {
  const supabase = createClient()
  const [clients, setClients] = useState<ClientInfo[]>([])
  const [pendingProjects, setPendingProjects] = useState<{
    id: string; product_name: string; plan: string; created_at: string;
    client: { name: string; company: string } | { name: string; company: string }[] | null
  }[]>([])
  const [loading, setLoading] = useState(true)

  // 결제 내역 모달
  const [selectedClient, setSelectedClient] = useState<ClientInfo | null>(null)
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [creditBalance, setCreditBalance] = useState<number | null>(null)
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [refundingId, setRefundingId] = useState<string | null>(null)
  const [refundError, setRefundError] = useState('')
  const [refundSuccess, setRefundSuccess] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data: clientData } = await supabase
      .from('profiles')
      .select('id, name, company, phone, created_at, projects(*)')
      .eq('role', 'client')
      .order('created_at', { ascending: false })
    setClients(clientData || [])

    const { data: pending } = await supabase
      .from('projects')
      .select('id, product_name, plan, created_at, client:profiles!client_id(name, company)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    setPendingProjects(pending || [])

    setLoading(false)
  }

  async function approveProject(projectId: string) {
    await supabase.from('projects').update({ status: 'draft' }).eq('id', projectId)
    load()
  }

  async function rejectProject(projectId: string) {
    await supabase.from('projects').update({ status: 'rejected' }).eq('id', projectId)
    load()
  }

  async function openPaymentModal(client: ClientInfo) {
    setSelectedClient(client)
    setRefundError('')
    setRefundSuccess('')
    setLoadingPayments(true)
    setPayments([])
    setCreditBalance(null)

    const [{ data: payData }, { data: crData }] = await Promise.all([
      supabase
        .from('payments')
        .select('id, order_id, payment_key, amount, status, paid_at, created_at')
        .eq('user_id', client.id)
        .eq('payment_context', 'credit_charge')
        .order('created_at', { ascending: false }),
      supabase
        .from('client_credits')
        .select('balance')
        .eq('client_id', client.id)
        .single(),
    ])

    setPayments((payData as PaymentRecord[]) || [])
    setCreditBalance(crData?.balance ?? 0)
    setLoadingPayments(false)
  }

  async function handleRefund(paymentId: string) {
    if (!confirm('이 결제를 환불 처리하시겠습니까?\nTossPayments에서 실제 취소가 진행됩니다.')) return

    setRefundingId(paymentId)
    setRefundError('')
    setRefundSuccess('')

    try {
      const res = await fetch('/api/admin/credits/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId }),
      })
      const data = await res.json()

      if (!res.ok) {
        setRefundError(data.error || '환불 처리에 실패했습니다.')
      } else {
        setRefundSuccess(
          `환불 완료 — ${data.refundedAmount.toLocaleString()}원 취소, ${data.refundedCredits}cr 차감 (잔여: ${data.newBalance}cr)`
        )
        // 목록 새로고침
        if (selectedClient) await openPaymentModal(selectedClient)
      }
    } catch {
      setRefundError('서버 오류가 발생했습니다.')
    } finally {
      setRefundingId(null)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">고객 관리</h1>

      {/* 승인 대기 */}
      {pendingProjects.length > 0 && (
        <Card className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <CardTitle>승인 대기 신청</CardTitle>
            <Badge variant="warning">{pendingProjects.length}건</Badge>
          </div>
          <div className="space-y-3">
            {pendingProjects.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div>
                  <p className="text-sm font-medium text-text">{p.product_name}</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {(() => {
                      const c = Array.isArray(p.client) ? p.client[0] : p.client
                      return `${c?.company || ''} / ${c?.name || ''}`
                    })()} / {p.plan?.toUpperCase()} / {new Date(p.created_at).toLocaleDateString('ko')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="danger" onClick={() => rejectProject(p.id)}>반려</Button>
                  <Button size="sm" onClick={() => approveProject(p.id)}>승인</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 고객 목록 */}
      <Card>
        <CardTitle>등록 고객</CardTitle>
        {loading ? (
          <p className="text-text-muted py-4">로딩중...</p>
        ) : clients.length === 0 ? (
          <p className="text-sm text-text-muted py-8 text-center">등록된 고객이 없습니다.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead>회사명</TableHead>
                <TableHead>연락처</TableHead>
                <TableHead>프로젝트</TableHead>
                <TableHead>가입일</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((c) => {
                const projects = c.projects || []
                const pendingCount = projects.filter((p) => p.status === 'pending').length
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.company || '-'}</TableCell>
                    <TableCell>{c.phone || '-'}</TableCell>
                    <TableCell>
                      <span className="text-sm">{projects.length}건</span>
                      {pendingCount > 0 && (
                        <Badge variant="warning" className="ml-2">대기 {pendingCount}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-text-muted">
                      {new Date(c.created_at).toLocaleDateString('ko')}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => openPaymentModal(c)}
                        className="text-xs text-navy hover:underline whitespace-nowrap"
                      >
                        결제 내역
                      </button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* ── 결제 내역 모달 ─────────────────────────────────── */}
      {selectedClient && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedClient(null) }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            {/* 헤더 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-text">{selectedClient.name}</h2>
                <p className="text-xs text-text-muted mt-0.5">
                  {selectedClient.company || '회사 미입력'} · 크레딧 잔액:{' '}
                  <span className="font-semibold text-navy">
                    {creditBalance !== null ? `${creditBalance}cr` : '—'}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setSelectedClient(null)}
                className="p-2 rounded-lg text-text-muted hover:bg-surface transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 결과 메시지 */}
            {(refundError || refundSuccess) && (
              <div className={`mx-6 mt-4 px-4 py-3 rounded-lg text-sm ${
                refundError
                  ? 'bg-nogo-bg border border-nogo/20 text-nogo'
                  : 'bg-go-bg border border-go/20 text-go'
              }`}>
                {refundError || refundSuccess}
              </div>
            )}

            {/* 결제 목록 */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loadingPayments ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" />
                </div>
              ) : payments.length === 0 ? (
                <p className="text-sm text-text-muted text-center py-12">크레딧 결제 내역이 없습니다.</p>
              ) : (
                <div className="space-y-3">
                  {payments.map((pay) => {
                    const credits = AMOUNT_TO_CREDITS[pay.amount]
                    const canRefund = pay.status === 'DONE' && pay.payment_key
                    const usedCredits = credits !== undefined && creditBalance !== null
                      ? credits - Math.min(credits, creditBalance)
                      : null
                    const isRefunding = refundingId === pay.id

                    return (
                      <div
                        key={pay.id}
                        className={`p-4 rounded-xl border ${
                          pay.status === 'CANCELED'
                            ? 'border-border bg-surface opacity-60'
                            : 'border-border bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-text">
                                {pay.amount.toLocaleString()}원
                              </span>
                              {credits !== undefined && (
                                <span className="text-xs text-navy font-medium bg-blue-50 px-2 py-0.5 rounded-full">
                                  {credits}cr 충전
                                </span>
                              )}
                              {pay.status === 'DONE' && (
                                <span className="text-xs text-go font-medium bg-go-bg px-2 py-0.5 rounded-full">결제완료</span>
                              )}
                              {pay.status === 'CANCELED' && (
                                <span className="text-xs text-text-muted font-medium bg-surface px-2 py-0.5 rounded-full border border-border">환불완료</span>
                              )}
                              {pay.status === 'FAILED' && (
                                <span className="text-xs text-nogo font-medium bg-nogo-bg px-2 py-0.5 rounded-full">결제실패</span>
                              )}
                            </div>
                            <p className="text-xs text-text-muted mt-1.5">
                              {pay.paid_at
                                ? new Date(pay.paid_at).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                                : new Date(pay.created_at).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                              }
                            </p>
                            <p className="text-xs text-text-muted/60 mt-0.5 font-mono truncate">
                              {pay.order_id}
                            </p>
                            {/* 사용 크레딧 경고 */}
                            {canRefund && usedCredits !== null && usedCredits > 0 && (
                              <p className="text-xs text-amber-600 mt-1.5">
                                ⚠ 이미 {usedCredits}cr 사용됨 — 환불 불가
                              </p>
                            )}
                          </div>

                          {/* 환불 버튼 */}
                          {canRefund && (
                            <button
                              onClick={() => handleRefund(pay.id)}
                              disabled={isRefunding || (usedCredits !== null && usedCredits > 0)}
                              className={`flex-shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                                usedCredits !== null && usedCredits > 0
                                  ? 'bg-surface text-text-muted border border-border cursor-not-allowed'
                                  : 'bg-nogo-bg text-nogo border border-nogo/30 hover:bg-nogo hover:text-white'
                              }`}
                            >
                              {isRefunding ? (
                                <span className="flex items-center gap-1.5">
                                  <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin inline-block" />
                                  처리 중
                                </span>
                              ) : '환불'}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 안내 */}
            <div className="px-6 py-4 border-t border-border flex-shrink-0">
              <p className="text-xs text-text-muted">
                • 환불은 크레딧이 전액 잔여할 때만 가능합니다 (일부 사용 시 불가)
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                • 환불 처리 시 TossPayments에서 실제 결제 취소가 진행됩니다
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
