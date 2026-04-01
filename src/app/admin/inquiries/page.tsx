'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Inquiry } from '@/lib/types'

export default function InquiriesPage() {
  const supabase = createClient()
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Inquiry | null>(null)

  useEffect(() => {
    fetchInquiries()
  }, [])

  async function fetchInquiries() {
    const { data } = await supabase
      .from('inquiries')
      .select('*')
      .order('created_at', { ascending: false })
    setInquiries(data ?? [])
    setLoading(false)
  }

  async function markAsRead(id: string) {
    await supabase.from('inquiries').update({ is_read: true }).eq('id', id)
    setInquiries((prev) => prev.map((i) => (i.id === id ? { ...i, is_read: true } : i)))
    setSelected((prev) => (prev?.id === id ? { ...prev, is_read: true } : prev))
  }

  const unreadCount = inquiries.filter((i) => !i.is_read).length

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-text">문의내역</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-text-muted mt-0.5">읽지 않은 문의 {unreadCount}건</p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-navy border-t-transparent rounded-full animate-spin" />
        </div>
      ) : inquiries.length === 0 ? (
        <div className="text-center py-20 text-text-muted">문의 내역이 없습니다.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* 목록 */}
          <div className="lg:col-span-2 space-y-2">
            {inquiries.map((inquiry) => (
              <button
                key={inquiry.id}
                onClick={() => {
                  setSelected(inquiry)
                  if (!inquiry.is_read) markAsRead(inquiry.id)
                }}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                  selected?.id === inquiry.id
                    ? 'border-navy bg-navy/5'
                    : 'border-border bg-white hover:border-navy/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-text truncate">{inquiry.company}</span>
                  {!inquiry.is_read && (
                    <span className="w-2 h-2 rounded-full bg-navy flex-shrink-0 ml-2" />
                  )}
                </div>
                <div className="text-xs text-text-muted">{inquiry.name} · {inquiry.phone}</div>
                <div className="text-xs text-text-muted mt-1">
                  {new Date(inquiry.created_at).toLocaleDateString('ko-KR', {
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </div>
              </button>
            ))}
          </div>

          {/* 상세 */}
          <div className="lg:col-span-3">
            {selected ? (
              <div className="bg-white rounded-xl border border-border p-6">
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <h2 className="text-base font-bold text-text">{selected.company}</h2>
                    <p className="text-sm text-text-muted mt-0.5">
                      {new Date(selected.created_at).toLocaleDateString('ko-KR', {
                        year: 'numeric', month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  {selected.is_read ? (
                    <span className="text-xs px-2 py-1 bg-surface text-text-muted rounded-full">읽음</span>
                  ) : (
                    <span className="text-xs px-2 py-1 bg-navy/10 text-navy rounded-full font-medium">신규</span>
                  )}
                </div>

                <div className="space-y-3 mb-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-surface rounded-lg px-3 py-2.5">
                      <p className="text-xs text-text-muted mb-0.5">담당자명</p>
                      <p className="text-sm font-medium text-text">{selected.name}</p>
                    </div>
                    <div className="bg-surface rounded-lg px-3 py-2.5">
                      <p className="text-xs text-text-muted mb-0.5">연락처</p>
                      <p className="text-sm font-medium text-text">{selected.phone}</p>
                    </div>
                  </div>
                  <div className="bg-surface rounded-lg px-3 py-2.5">
                    <p className="text-xs text-text-muted mb-0.5">이메일</p>
                    <a
                      href={`mailto:${selected.email}`}
                      className="text-sm font-medium text-navy hover:underline"
                    >
                      {selected.email}
                    </a>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-text-muted mb-1.5">문의사항</p>
                  <div className="bg-surface rounded-lg px-3 py-3 text-sm text-text whitespace-pre-wrap min-h-[80px]">
                    {selected.message || <span className="text-text-muted italic">내용 없음</span>}
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <a
                    href={`mailto:${selected.email}?subject=[나들목] 문의 답변 드립니다`}
                    className="flex-1 text-center py-2.5 bg-navy text-white text-sm font-medium rounded-lg hover:bg-navy/90 transition-colors"
                  >
                    이메일 답장
                  </a>
                  <a
                    href={`tel:${selected.phone}`}
                    className="px-4 py-2.5 border border-border text-sm font-medium text-text rounded-lg hover:bg-surface transition-colors"
                  >
                    전화하기
                  </a>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-border p-6 flex items-center justify-center h-48 text-text-muted text-sm">
                문의를 선택하면 상세 내용이 표시됩니다.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
