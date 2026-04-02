'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface NotificationContact {
  id: string
  name: string
  phone: string | null
  email: string | null
  is_active: boolean
  created_at: string
}

const EMPTY_FORM = { name: '', phone: '', email: '', is_active: true }

export default function NotificationsPage() {
  const supabase = createClient()
  const [contacts, setContacts] = useState<NotificationContact[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // 편집 모달
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<NotificationContact | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')

  // 삭제 확인
  const [deleteTarget, setDeleteTarget] = useState<NotificationContact | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from('notification_contacts')
      .select('*')
      .order('created_at', { ascending: true })
    setContacts(data ?? [])
    setLoading(false)
  }

  function openAdd() {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setModalOpen(true)
  }

  function openEdit(contact: NotificationContact) {
    setEditTarget(contact)
    setForm({
      name: contact.name,
      phone: contact.phone ?? '',
      email: contact.email ?? '',
      is_active: contact.is_active,
    })
    setFormError('')
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { setFormError('이름을 입력해주세요.'); return }
    if (!form.phone.trim() && !form.email.trim()) {
      setFormError('휴대폰번호 또는 이메일 중 하나는 입력해주세요.')
      return
    }

    setSaving(true)
    setFormError('')

    if (editTarget) {
      const { error } = await supabase
        .from('notification_contacts')
        .update({
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          is_active: form.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editTarget.id)
      if (error) { setFormError('저장 중 오류가 발생했습니다.'); setSaving(false); return }
    } else {
      const { error } = await supabase
        .from('notification_contacts')
        .insert({
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          is_active: form.is_active,
        })
      if (error) { setFormError('저장 중 오류가 발생했습니다.'); setSaving(false); return }
    }

    setSaving(false)
    setModalOpen(false)
    load()
  }

  async function handleToggleActive(contact: NotificationContact) {
    await supabase
      .from('notification_contacts')
      .update({ is_active: !contact.is_active, updated_at: new Date().toISOString() })
      .eq('id', contact.id)
    setContacts((prev) =>
      prev.map((c) => c.id === contact.id ? { ...c, is_active: !c.is_active } : c)
    )
  }

  async function handleDelete() {
    if (!deleteTarget) return
    await supabase.from('notification_contacts').delete().eq('id', deleteTarget.id)
    setDeleteTarget(null)
    load()
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-text">알림 설정</h1>
          <p className="text-sm text-text-muted mt-0.5">프로젝트 상태 변경 등 알림을 받을 담당자를 관리합니다.</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-navy text-white text-sm font-medium rounded-lg hover:bg-navy/90 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          담당자 추가
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-navy border-t-transparent rounded-full animate-spin" />
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-20 text-text-muted text-sm">
          등록된 알림 담당자가 없습니다.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="text-left px-4 py-3 font-medium text-text-muted">이름</th>
                <th className="text-left px-4 py-3 font-medium text-text-muted">휴대폰번호</th>
                <th className="text-left px-4 py-3 font-medium text-text-muted">이메일</th>
                <th className="text-center px-4 py-3 font-medium text-text-muted">알림 수신</th>
                <th className="text-right px-4 py-3 font-medium text-text-muted">관리</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact, i) => (
                <tr key={contact.id} className={`border-b border-border last:border-0 ${i % 2 === 0 ? '' : 'bg-surface/50'}`}>
                  <td className="px-4 py-3 font-medium text-text">{contact.name}</td>
                  <td className="px-4 py-3 text-text-muted">{contact.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-text-muted">{contact.email ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleActive(contact)}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                        contact.is_active ? 'bg-navy' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 ${
                        contact.is_active ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(contact)}
                        className="px-3 py-1 text-xs border border-border rounded-lg hover:bg-surface transition-colors"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => setDeleteTarget(contact)}
                        className="px-3 py-1 text-xs border border-nogo/30 text-nogo rounded-lg hover:bg-nogo/5 transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 추가/수정 모달 */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="text-base font-bold text-text">
                {editTarget ? '담당자 수정' : '담당자 추가'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                  placeholder="담당자 이름"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">휴대폰번호</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                  placeholder="010-0000-0000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">이메일</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                  placeholder="email@company.com"
                />
              </div>
              <div className="flex items-center gap-3 py-1">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, is_active: !form.is_active })}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                    form.is_active ? 'bg-navy' : 'bg-gray-200'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 ${
                    form.is_active ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>
                <span className="text-sm text-gray-700">알림 수신 활성화</span>
              </div>

              {formError && <p className="text-sm text-red-500">{formError}</p>}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 bg-navy text-white rounded-lg text-sm font-bold hover:bg-navy/90 transition-colors disabled:opacity-60"
                >
                  {saving ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-base font-bold text-text mb-2">담당자 삭제</h2>
            <p className="text-sm text-text-muted mb-6">
              <span className="font-medium text-text">{deleteTarget.name}</span>을(를) 알림 목록에서 삭제하시겠습니까?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 bg-nogo text-white rounded-lg text-sm font-bold hover:bg-nogo/90 transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
