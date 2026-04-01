'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'

const TERMS_CONTENT: Record<string, string> = {
  service: `제1조 (목적)
본 약관은 선을넘는사람들("회사")가 운영하는 나들목 플랫폼의 서비스 이용과 관련하여 회사와 고객사 간의 권리, 의무 및 책임사항을 규정합니다.

제2조 (서비스 내용)
회사는 고객사가 의뢰한 화장품 신제품에 대해 아래 서비스를 제공합니다.
• 소비자 패널 모집 및 매칭
• 제품 테스트 진행 및 설문 수집
• 데이터 분석 및 결과 리포트 제공 (Go/Conditional Go/No-Go 판정)

제3조 (고객사의 의무)
1. 테스트에 제공되는 제품은 관련 법령(화장품법 등) 및 안전 기준에 적합해야 합니다.
2. 고객사는 제품의 성분 및 안전성 관련 정보를 회사에 성실히 제공해야 합니다.
3. 제공된 분석 결과는 내부 의사결정 목적으로만 사용해야 합니다.

제4조 (결제 및 환불)
서비스 이용료는 신청 시 선결제되며, 결제 완료 후 회사가 서비스 진행을 확정합니다. 환불은 회사의 환불 정책에 따릅니다.`,

  privacy: `개인정보 수집·이용 동의

회사는 서비스 제공을 위해 아래와 같이 개인정보를 수집·이용합니다.

• 수집 항목: 담당자명, 연락처, 이메일, 회사명, 직책, 사업자번호
• 이용 목적: 서비스 신청·계약, 결과 보고, 고객 지원, 세금계산서 발행
• 보유 기간: 계약 종료 후 5년 (전자상거래법 등 관계법령에 따른 보존 의무 기간)

위 항목에 대한 개인정보 수집·이용에 동의하지 않으실 수 있으나, 동의 거부 시 서비스 이용이 제한될 수 있습니다.`,

  confidential: `결과 데이터 비밀유지 동의 (NDA)

본 서비스를 통해 제공되는 분석 결과(리포트, 데이터, 판정 결과 등)는 비밀 정보로 취급됩니다.

1. 고객사는 분석 결과를 외부에 공개하거나 제3자에게 제공할 수 없습니다.
2. 경쟁사, 언론, SNS 등에 결과 내용을 유출하는 것을 금합니다.
3. 내부 의사결정 및 제품 개선 목적으로만 사용해야 합니다.
4. 계약 종료 후에도 비밀유지 의무는 3년간 유지됩니다.

위반 시 회사는 서비스 중단 및 손해배상을 청구할 수 있습니다.`,
}

const REQUIRED_TERMS: { key: string; label: string }[] = [
  { key: 'service',      label: '서비스 이용약관에 동의합니다.' },
  { key: 'privacy',      label: '개인정보 수집·이용에 동의합니다.' },
  { key: 'confidential', label: '결과 데이터 비밀유지(NDA)에 동의합니다.' },
]

const initialTerms = {
  service: false,
  privacy: false,
  confidential: false,
  marketing: false,
}

export default function ClientProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [position, setPosition] = useState('')
  const [businessNumber, setBusinessNumber] = useState('')
  const [taxEmail, setTaxEmail] = useState('')

  const [terms, setTerms] = useState(initialTerms)
  const [expandedTerm, setExpandedTerm] = useState<string | null>(null)

  // 이미 프로필이 완성된 고객사는 대시보드로
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      // profiles에서 company 가져와서 pre-fill
      supabase.from('profiles').select('name, company').eq('id', user.id).single()
        .then(({ data }) => {
          if (data?.company) setCompanyName(data.company)
          if (data?.name) setContactName(data.name)
        })
      // 이미 완성된 프로필이면 대시보드로
      supabase.from('client_profiles').select('terms_agreed_at, contact_phone').eq('id', user.id).single()
        .then(({ data, error }) => {
          if (!error && data?.terms_agreed_at && data?.contact_phone) router.replace('/client')
        })
    })
  }, [])

  const allRequired = REQUIRED_TERMS.every(({ key }) => terms[key as keyof typeof terms])
  const allChecked = allRequired && terms.marketing

  function toggleAll(checked: boolean) {
    setTerms({ service: checked, privacy: checked, confidential: checked, marketing: checked })
  }

  function toggleTerm(key: keyof typeof initialTerms, checked: boolean) {
    setTerms((prev) => ({ ...prev, [key]: checked }))
  }

  function toggleExpand(key: string) {
    setExpandedTerm((prev) => (prev === key ? null : key))
  }

  function validate() {
    const errors: Record<string, string> = {}
    if (!contactName.trim()) errors.contactName = '담당자명을 입력해주세요.'
    if (!contactPhone.trim()) errors.contactPhone = '연락처를 입력해주세요.'
    if (!companyName.trim()) errors.companyName = '회사명을 입력해주세요.'
    if (!allRequired) errors.terms = '필수 약관에 모두 동의해야 합니다.'
    return errors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})
    setLoading(true)
    setSubmitError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setSubmitError('로그인 세션이 만료되었습니다. 다시 로그인해주세요.')
        setLoading(false)
        return
      }

      // profiles 업데이트 (담당자명, 연락처, 회사명)
      await supabase.from('profiles').update({
        name: contactName,
        phone: contactPhone,
        company: companyName,
      }).eq('id', user.id)

      // client_profiles upsert
      const { error } = await supabase.from('client_profiles').upsert({
        id: user.id,
        company_name: companyName,
        contact_name: contactName,
        contact_phone: contactPhone,
        position: position || null,
        business_number: businessNumber || null,
        tax_email: taxEmail || null,
        terms_agreed_at: new Date().toISOString(),
        terms_marketing_agreed: terms.marketing,
      })

      if (error) {
        console.error('client_profiles upsert error:', error)
        setSubmitError(error.message || '저장 중 오류가 발생했습니다.')
        setLoading(false)
        return
      }

      router.push('/client')
    } catch (err) {
      console.error('handleSubmit exception:', err)
      setSubmitError('예기치 않은 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-navy">고객사 프로필 설정</h1>
          <p className="text-text-muted mt-2">서비스 이용을 위해 담당자 정보를 입력해주세요</p>
        </div>

        <div className="bg-white rounded-xl border border-border shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 회사명 */}
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                회사명 <span className="text-nogo">*</span>
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => { setCompanyName(e.target.value); setFieldErrors(p => ({ ...p, companyName: '' })) }}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy ${fieldErrors.companyName ? 'border-nogo' : 'border-border'}`}
                placeholder="회사명을 입력하세요"
              />
              {fieldErrors.companyName && <p className="text-xs text-nogo mt-1">{fieldErrors.companyName}</p>}
            </div>

            {/* 담당자명 */}
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                담당자명 <span className="text-nogo">*</span>
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => { setContactName(e.target.value); setFieldErrors(p => ({ ...p, contactName: '' })) }}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy ${fieldErrors.contactName ? 'border-nogo' : 'border-border'}`}
                placeholder="담당자 이름을 입력하세요"
              />
              {fieldErrors.contactName && <p className="text-xs text-nogo mt-1">{fieldErrors.contactName}</p>}
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
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                placeholder="예: 마케팅팀 팀장"
              />
            </div>

            {/* 연락처 */}
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                담당자 연락처 <span className="text-nogo">*</span>
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => { setContactPhone(e.target.value); setFieldErrors(p => ({ ...p, contactPhone: '' })) }}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy ${fieldErrors.contactPhone ? 'border-nogo' : 'border-border'}`}
                placeholder="010-0000-0000"
              />
              {fieldErrors.contactPhone && <p className="text-xs text-nogo mt-1">{fieldErrors.contactPhone}</p>}
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
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
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
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                placeholder="tax@company.com"
              />
            </div>

            {/* ── 약관 동의 ───────────────────────────────────── */}
            <div className="pt-2">
              <div className="border-t border-border pt-5">
                <p className="text-sm font-semibold text-text mb-4">약관 동의</p>

                {/* 전체 동의 */}
                <label className="flex items-center gap-2.5 cursor-pointer p-3 rounded-lg bg-surface hover:bg-surface-dark transition-colors mb-3">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={(e) => toggleAll(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-navy focus:ring-navy flex-shrink-0"
                  />
                  <span className="text-sm font-medium text-text">전체 동의</span>
                  <span className="text-xs text-text-muted">(필수·선택 항목 모두 동의)</span>
                </label>

                <div className="border-t border-border/50 pt-3 space-y-1">
                  {/* 필수 항목 */}
                  <p className="text-xs text-text-muted font-medium mb-2">필수 동의</p>
                  {REQUIRED_TERMS.map(({ key, label }) => (
                    <div key={key}>
                      <div className="flex items-center gap-2.5 py-2">
                        <input
                          type="checkbox"
                          id={`term-${key}`}
                          checked={terms[key as keyof typeof terms]}
                          onChange={(e) => toggleTerm(key as keyof typeof initialTerms, e.target.checked)}
                          className="w-4 h-4 rounded border-border text-navy focus:ring-navy flex-shrink-0"
                        />
                        <label htmlFor={`term-${key}`} className="text-sm text-text flex-1 cursor-pointer">
                          {label}
                          <span className="text-nogo ml-1 text-xs">(필수)</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => toggleExpand(key)}
                          className="text-xs text-navy hover:underline flex-shrink-0"
                        >
                          {expandedTerm === key ? '접기 ▲' : '전문보기 ▼'}
                        </button>
                      </div>
                      {expandedTerm === key && (
                        <div className="ml-6 mb-2 p-3 bg-surface rounded-lg border border-border max-h-40 overflow-y-auto">
                          <pre className="text-xs text-text-muted whitespace-pre-wrap leading-relaxed font-sans">
                            {TERMS_CONTENT[key]}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* 선택 항목 */}
                  <div className="border-t border-border/50 pt-3 mt-3">
                    <p className="text-xs text-text-muted font-medium mb-2">선택 동의</p>
                    <div className="flex items-center gap-2.5 py-2">
                      <input
                        type="checkbox"
                        id="term-marketing"
                        checked={terms.marketing}
                        onChange={(e) => toggleTerm('marketing', e.target.checked)}
                        className="w-4 h-4 rounded border-border text-navy focus:ring-navy flex-shrink-0"
                      />
                      <label htmlFor="term-marketing" className="text-sm text-text flex-1 cursor-pointer">
                        마케팅 정보 및 서비스 안내 수신에 동의합니다.
                        <span className="text-text-muted ml-1 text-xs">(선택)</span>
                      </label>
                    </div>
                  </div>
                </div>

                {fieldErrors.terms && (
                  <p className="text-xs text-nogo mt-2">{fieldErrors.terms}</p>
                )}
              </div>
            </div>

            {submitError && (
              <p className="text-sm text-nogo bg-nogo/5 border border-nogo/20 rounded-lg px-4 py-3">
                {submitError}
              </p>
            )}

            <Button
              type="submit"
              loading={loading}
              disabled={!allRequired}
              className="w-full"
              size="lg"
            >
              프로필 저장하고 시작하기
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
