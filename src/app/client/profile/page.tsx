'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

export default function ClientProfilePage() {
  const supabase = createClient()
  const router = useRouter()

  const [companyName, setCompanyName] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [position, setPosition] = useState('')
  const [businessNumber, setBusinessNumber] = useState('')
  const [taxEmail, setTaxEmail] = useState('')

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase.from('profiles').select('name, phone, company').eq('id', user.id).single()
    if (profile) {
      setContactName(profile.name || '')
      setContactPhone(profile.phone || '')
      setCompanyName(profile.company || '')
    }

    const { data: cp } = await supabase.from('client_profiles').select('*').eq('id', user.id).single()
    if (cp) {
      setCompanyName(cp.company_name || profile?.company || '')
      setContactName(cp.contact_name || profile?.name || '')
      setContactPhone(cp.contact_phone || profile?.phone || '')
      setPosition(cp.position || '')
      setBusinessNumber(cp.business_number || '')
      setTaxEmail(cp.tax_email || '')
    }
  }

  async function save() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('profiles').update({
      name: contactName,
      phone: contactPhone,
      company: companyName,
    }).eq('id', user.id)

    await supabase.from('client_profiles').upsert({
      id: user.id,
      company_name: companyName,
      contact_name: contactName,
      contact_phone: contactPhone,
      position: position || null,
      business_number: businessNumber || null,
      tax_email: taxEmail || null,
    })

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function withdraw() {
    setWithdrawing(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('profiles').update({ deactivated_at: new Date().toISOString() }).eq('id', user.id)
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">내 프로필</h1>
      <Card>
        <div className="space-y-5">
          {/* 회사명 */}
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">회사명</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
              placeholder="회사명을 입력하세요"
            />
          </div>

          {/* 담당자명 */}
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">담당자명</label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
              placeholder="담당자 이름을 입력하세요"
            />
          </div>

          {/* 직책 */}
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              직책 <span className="text-text-muted font-normal">(선택)</span>
            </label>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
              placeholder="예: 마케팅팀 팀장"
            />
          </div>

          {/* 연락처 */}
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">담당자 연락처</label>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
              placeholder="010-0000-0000"
            />
          </div>

          {/* 사업자번호 */}
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              사업자번호 <span className="text-text-muted font-normal">(선택 · 세금계산서 발행 시 필요)</span>
            </label>
            <input
              type="text"
              value={businessNumber}
              onChange={(e) => setBusinessNumber(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
              placeholder="000-00-00000"
            />
          </div>

          {/* 세금계산서 수신 이메일 */}
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              세금계산서 수신 이메일 <span className="text-text-muted font-normal">(선택)</span>
            </label>
            <input
              type="email"
              value={taxEmail}
              onChange={(e) => setTaxEmail(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
              placeholder="tax@company.com"
            />
          </div>

          {/* 저장 */}
          <div className="flex items-center gap-3">
            <Button onClick={save} loading={saving}>저장</Button>
            {saved && <span className="text-sm text-go">저장되었습니다</span>}
          </div>

          {/* 회원탈퇴 */}
          <div className="border-t border-border pt-5 mt-2">
            <button
              type="button"
              onClick={() => setShowWithdrawModal(true)}
              className="text-sm text-text-muted hover:text-nogo underline underline-offset-2 transition-colors"
            >
              회원탈퇴
            </button>
          </div>
        </div>
      </Card>

      {/* 탈퇴 확인 모달 */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-lg font-bold text-text mb-2">회원탈퇴</h2>
            <p className="text-sm text-text-muted mb-1">
              탈퇴하시면 서비스 이용이 중단됩니다.
            </p>
            <p className="text-sm text-text-muted mb-6">
              입력하신 정보는 법적 보존 의무에 따라 일정 기간 보관됩니다.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                className="flex-1 py-2 rounded-lg border border-border text-sm text-text hover:bg-surface transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={withdraw}
                disabled={withdrawing}
                className="flex-1 py-2 rounded-lg bg-nogo text-white text-sm font-medium hover:bg-nogo/90 transition-colors disabled:opacity-50"
              >
                {withdrawing ? '처리 중...' : '탈퇴하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
