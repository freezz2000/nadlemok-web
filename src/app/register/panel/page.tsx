'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'

const skinTypes = ['건성', '복합성', '지성', '중성', '민감성']
const ageGroups = ['10대', '20대', '30대', '40대', '50대 이상']
const genders = ['여성', '남성']
const skinConcerns = ['모공', '주름', '색소침착', '여드름', '건조', '민감', '탄력', '각질', '다크서클', '홍조', '기타']

const TERMS_CONTENT: Record<string, string> = {
  activity: `제1조 (목적) 본 약관은 선을넘는사람들("회사")가 운영하는 나들목 플랫폼의 패널 활동과 관련하여 권리 및 의무를 규정합니다.

제2조 (패널 활동 내용) 패널은 회사가 제공하는 화장품을 일정 기간 사용하고 아래 활동에 참여합니다.
• 제품 사용 테스트
• 설문 응답 및 평가
• 사용 경험 피드백 제공
패널은 회사가 제공하는 가이드라인(SOP)을 준수해야 합니다.

제3조 (패널의 의무) 패널은 다음 사항을 준수해야 합니다.
1. 실제 사용 경험 기반으로 평가할 것
2. 허위 또는 과장된 응답을 하지 않을 것
3. 타인의 정보 도용 금지
4. 테스트 일정 및 절차 준수
불성실 참여 시 패널 자격이 제한되거나 보상이 지급되지 않을 수 있습니다.`,

  nda: `제4조 (비밀유지 의무 / NDA) 패널은 테스트 제품과 관련된 모든 정보를 외부에 공개할 수 없습니다. 금지 행위는 다음과 같습니다.
• SNS 게시
• 블로그/커뮤니티 공유
• 제3자 전달
위반 시 회사는 패널 자격을 제한할 수 있으며, 회사 또는 브랜드사에 손해가 발생한 경우 손해배상을 청구할 수 있습니다.`,

  data: `제5조 (데이터의 저작권, 초상권 및 활용)
① 패널이 품평 활동을 통해 회사 플랫폼에 등록한 모든 데이터(설문 응답, 리뷰 텍스트, 피부 상태 사진, 영상 등)의 저작권 및 기타 지식재산권 일체는 등록 즉시 회사에 귀속됩니다.
② 패널은 자신이 제공한 사진 및 영상에 포함된 본인의 초상권, 성명권 등을 회사가 다음과 같은 목적으로 활용하는 것에 명시적으로 동의합니다.
• 데이터의 익명화 처리 후 파트너사에 제공되는 결과 리포트 제작 및 통계 분석
• 회사의 알고리즘 고도화 및 서비스 개선 목적
③ 패널은 자신이 제공한 데이터가 제3자의 저작권 등 권리를 침해하지 않음을 보증하며, 이를 위반하여 발생하는 모든 민·형사상 책임은 패널 본인에게 있습니다.`,

  safety: `제6조 (테스트 제품의 안전성 및 책임의 한계 / 면책)
① 패널은 회사가 제공하는 화장품이 정식 출시 전 단계의 테스트 제품일 수 있으며, 개인의 체질, 피부 상태, 알레르기 여부에 따라 예상치 못한 피부 트러블(붉어짐, 따가움, 발진 등 이상 반응)이 발생할 수 있음을 충분히 인지하고 품평에 자발적으로 참여합니다.
② 패널은 테스트 제품 사용 중 이상 반응(Kill Signal)이 발생할 경우, 즉시 사용을 중단하고 회사가 정한 가이드라인에 따라 지체 없이 보고해야 합니다.
③ 회사는 제품 자체의 명백한 하자로 인해 발생한 패널의 손해에 대해서는 관련 법령(제조물책임법 등)에 따라 적절한 조치를 취합니다.`,

  privacy: `제9~10조 (개인정보 수집·이용)
회사는 패널 서비스 제공을 위해 아래와 같이 개인정보를 수집·이용합니다.
• 수집 항목: 이름, 연락처, 성별, 연령대, 피부 타입, 피부 고민, 현재 사용 제품
• 이용 목적: 패널 매칭, 설문 발송, 보상 지급, 서비스 개선
• 보유 기간: 회원 탈퇴 시까지 (법령에 따른 보존 의무가 있는 경우 해당 기간)
개인정보 처리에 관한 자세한 사항은 개인정보처리방침을 참고하시기 바랍니다.`,
}

const REQUIRED_TERMS: { key: keyof typeof initialTerms; label: string }[] = [
  { key: 'activity', label: '패널 활동 약관에 동의합니다.' },
  { key: 'nda',      label: '비밀유지(NDA)에 동의합니다.' },
  { key: 'data',     label: '데이터 저작권 및 초상권 귀속·활용에 동의합니다.' },
  { key: 'safety',   label: '이상반응 및 책임 고지에 동의합니다.' },
  { key: 'privacy',  label: '개인정보 수집·이용에 동의합니다.' },
]

const initialTerms = {
  activity: false,
  nda: false,
  data: false,
  safety: false,
  privacy: false,
  marketing: false,
}

export default function PanelProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  // 이미 프로필이 완성된 유저는 패널 대시보드로
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('panel_profiles')
        .select('skin_type, terms_agreed_at')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.skin_type && data?.terms_agreed_at) router.replace('/panel')
        })
    })
  }, [])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  // 휴대폰 OTP 인증
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpVerifyLoading, setOtpVerifyLoading] = useState(false)
  const [otpError, setOtpError] = useState('')
  const [otpCountdown, setOtpCountdown] = useState(0)
  const [form, setForm] = useState({
    gender: '',
    age_group: '',
    skin_type: '',
    is_sensitive: false,
    current_product: '',
  })
  const [address, setAddress] = useState({ zipcode: '', address: '', detail: '' })
  const [terms, setTerms] = useState(initialTerms)
  const [expandedTerm, setExpandedTerm] = useState<string | null>(null)

  // OTP 카운트다운
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (otpCountdown <= 0) return
    const timer = setTimeout(() => setOtpCountdown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [otpCountdown])

  const handleSendOtp = async () => {
    const cleanPhone = phone.replace(/[^0-9]/g, '')
    if (!/^01[0-9]{8,9}$/.test(cleanPhone)) {
      setFieldErrors(p => ({ ...p, phone: '올바른 휴대폰 번호를 입력해주세요. (예: 01012345678)' }))
      return
    }
    setOtpLoading(true)
    setOtpError('')
    const res = await fetch('/api/auth/send-phone-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: cleanPhone }),
    })
    setOtpLoading(false)
    if (!res.ok) {
      const data = await res.json()
      setOtpError(data.error || '인증번호 발송에 실패했습니다.')
      return
    }
    setOtpSent(true)
    setOtp('')
    setOtpCountdown(300)
    setFieldErrors(p => ({ ...p, phone: '' }))
  }

  const handleVerifyOtp = async () => {
    const cleanPhone = phone.replace(/[^0-9]/g, '')
    setOtpVerifyLoading(true)
    setOtpError('')
    const res = await fetch('/api/auth/verify-phone-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: cleanPhone, otp }),
    })
    setOtpVerifyLoading(false)
    if (!res.ok) {
      const data = await res.json()
      setOtpError(data.error || '인증에 실패했습니다.')
      return
    }
    setPhoneVerified(true)
    setOtpSent(false)
    setFieldErrors(p => ({ ...p, phone: '' }))
  }

  const allRequired = REQUIRED_TERMS.every(({ key }) => terms[key as keyof typeof terms])
  const allChecked = allRequired && terms.marketing

  function validate() {
    const errors: Record<string, string> = {}
    if (!name.trim()) errors.name = '이름을 입력해주세요.'
    if (!phone.trim()) errors.phone = '연락처를 입력해주세요.'
    else if (!phoneVerified) errors.phone = '휴대폰 인증을 완료해주세요.'
    if (!address.zipcode || !address.address) errors.address = '주소 검색으로 주소를 입력해주세요.'
    if (!form.gender) errors.gender = '성별을 선택해주세요.'
    if (!form.age_group) errors.age_group = '연령대를 선택해주세요.'
    if (!form.skin_type) errors.skin_type = '피부 타입을 선택해주세요.'
    if (!allRequired) errors.terms = '필수 약관에 모두 동의해야 합니다.'
    return errors
  }

  function toggleAll(checked: boolean) {
    setTerms({ activity: checked, nda: checked, data: checked, safety: checked, privacy: checked, marketing: checked })
  }

  function toggleTerm(key: keyof typeof initialTerms, checked: boolean) {
    setTerms((prev) => ({ ...prev, [key]: checked }))
  }

  function toggleExpand(key: string) {
    setExpandedTerm((prev) => (prev === key ? null : key))
  }

  function openPostcode() {
    function execute() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new (window as any).daum.Postcode({
        oncomplete: (data: { zonecode: string; roadAddress: string; jibunAddress: string }) => {
          setAddress({ zipcode: data.zonecode, address: data.roadAddress || data.jibunAddress, detail: '' })
        },
      }).open()
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).daum?.Postcode) {
      execute()
    } else {
      const script = document.createElement('script')
      script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'
      script.onload = execute
      document.head.appendChild(script)
    }
  }

  function toggleConcern(concern: string) {
    setSelectedConcerns((prev) =>
      prev.includes(concern) ? prev.filter((c) => c !== concern) : [...prev, concern]
    )
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

      if (name || phone) {
        await supabase.from('profiles').update({
          ...(name ? { name } : {}),
          ...(phone ? { phone, phone_verified: true } : {}),
        }).eq('id', user.id)
      }

      const { error } = await supabase.from('panel_profiles').upsert({
        id: user.id,
        ...form,
        skin_concern: selectedConcerns.join(', '),
        address_zipcode: address.zipcode || null,
        address: address.address || null,
        address_detail: address.detail || null,
        terms_agreed_at: new Date().toISOString(),
        terms_marketing_agreed: terms.marketing,
      })

      if (error) {
        console.error('panel_profiles upsert error:', error)
        setSubmitError(error.message || '저장 중 오류가 발생했습니다.')
        setLoading(false)
        return
      }

      // 초대 링크를 통해 가입한 경우 — 초대 자동 수락
      try {
        // phone-based 초대 (/invite/[token])
        const pendingInvite = localStorage.getItem('pending_invite')
        if (pendingInvite) {
          const { token, clientId } = JSON.parse(pendingInvite) as { token: string; clientId?: string }
          const invRes = await fetch('/api/invite/accept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, panelId: user.id, clientId }),
          })
          localStorage.removeItem('pending_invite')
          if (invRes.ok) {
            const invData = await invRes.json()
            if (invData.surveyId) {
              router.push(`/panel/surveys/${invData.surveyId}`)
              return
            }
          }
        }

        // project-level 초대 (/invite/p/[token])
        const pendingProject = localStorage.getItem('pending_invite_project')
        if (pendingProject) {
          const { projectToken, clientId } = JSON.parse(pendingProject) as { projectToken: string; clientId?: string }
          const projRes = await fetch('/api/invite/accept-project', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectToken, panelId: user.id, clientId }),
          })
          localStorage.removeItem('pending_invite_project')
          if (projRes.ok) {
            const projData = await projRes.json()
            if (projData.surveyId) {
              router.push(`/panel/surveys/${projData.surveyId}`)
              return
            }
          }
        }
      } catch { /* invite 수락 실패해도 가입은 완료 */ }

      router.push('/panel')
    } catch (err) {
      console.error('handleSubmit exception:', err)
      setSubmitError('예기치 않은 오류가 발생했습니다. 콘솔을 확인해주세요.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-navy">패널 프로필 설정</h1>
          <p className="text-text-muted mt-2">정확한 매칭을 위해 프로필 정보를 입력해주세요</p>
        </div>

        <div className="bg-white rounded-xl border border-border shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 이름 */}
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                이름 <span className="text-nogo">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setFieldErrors(p => ({ ...p, name: '' })) }}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy ${fieldErrors.name ? 'border-nogo' : 'border-border'}`}
                placeholder="이름을 입력하세요"
              />
              {fieldErrors.name && <p className="text-xs text-nogo mt-1">{fieldErrors.name}</p>}
            </div>

            {/* 연락처 + OTP 인증 */}
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                연락처 <span className="text-nogo">*</span>
              </label>

              {phoneVerified ? (
                /* 인증 완료 상태 */
                <div className="flex items-center gap-2 px-3 py-2 border border-go rounded-lg bg-go/5">
                  <svg className="w-4 h-4 text-go flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-go font-medium">{phone} 인증 완료</span>
                </div>
              ) : (
                <>
                  {/* 전화번호 입력 + 인증번호 받기 */}
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value)
                        setFieldErrors(p => ({ ...p, phone: '' }))
                        if (otpSent) { setOtpSent(false); setOtp(''); setOtpError(''); setOtpCountdown(0) }
                      }}
                      disabled={otpSent}
                      className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy ${fieldErrors.phone ? 'border-nogo' : 'border-border'} ${otpSent ? 'bg-surface text-text-muted' : ''}`}
                      placeholder="01012345678"
                    />
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={otpLoading}
                      className="px-3 py-2 bg-navy text-white text-sm rounded-lg hover:bg-navy/90 transition-colors whitespace-nowrap disabled:opacity-60"
                    >
                      {otpLoading ? '발송 중...' : otpSent ? '재발송' : '인증번호 받기'}
                    </button>
                  </div>

                  {/* OTP 입력창 */}
                  {otpSent && (
                    <div className="mt-2">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={otp}
                            onChange={(e) => { setOtp(e.target.value.replace(/[^0-9]/g, '')); setOtpError('') }}
                            maxLength={6}
                            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy ${otpError ? 'border-nogo' : 'border-border'}`}
                            placeholder="인증번호 6자리"
                          />
                          {otpCountdown > 0 && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted tabular-nums">
                              {Math.floor(otpCountdown / 60)}:{String(otpCountdown % 60).padStart(2, '0')}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={handleVerifyOtp}
                          disabled={otpVerifyLoading || otp.length !== 6}
                          className="px-3 py-2 bg-navy text-white text-sm rounded-lg hover:bg-navy/90 transition-colors whitespace-nowrap disabled:opacity-60"
                        >
                          {otpVerifyLoading ? '확인 중...' : '확인'}
                        </button>
                      </div>
                      {otpError && <p className="text-xs text-nogo mt-1">{otpError}</p>}
                      {otpCountdown === 0 && !otpError && (
                        <p className="text-xs text-text-muted mt-1">인증번호가 만료되었습니다. 재발송 버튼을 눌러주세요.</p>
                      )}
                    </div>
                  )}
                </>
              )}

              {fieldErrors.phone && <p className="text-xs text-nogo mt-1">{fieldErrors.phone}</p>}
            </div>

            {/* 샘플 수취 주소 */}
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                샘플 수취 주소 <span className="text-nogo">*</span>
                <span className="text-text-muted font-normal ml-1">(테스트 제품 발송에 사용됩니다)</span>
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={address.zipcode}
                  readOnly
                  className="w-28 px-3 py-2 border border-border rounded-lg text-sm bg-surface text-text-muted"
                  placeholder="우편번호"
                />
                <button
                  type="button"
                  onClick={openPostcode}
                  className="px-4 py-2 border border-navy rounded-lg text-sm text-navy hover:bg-navy/5 transition-colors whitespace-nowrap"
                >
                  주소 검색
                </button>
              </div>
              <input
                type="text"
                value={address.address}
                readOnly
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface text-text-muted mb-2"
                placeholder="주소 검색 후 자동 입력됩니다"
              />
              <input
                type="text"
                value={address.detail}
                onChange={(e) => setAddress((prev) => ({ ...prev, detail: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                placeholder="상세주소 입력 (동·호수 등)"
              />
              {fieldErrors.address && <p className="text-xs text-nogo mt-1">{fieldErrors.address}</p>}
            </div>

            {/* 성별 */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                성별 <span className="text-nogo">*</span>
              </label>
              <div className="flex gap-3">
                {genders.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => { setForm({ ...form, gender: g }); setFieldErrors(p => ({ ...p, gender: '' })) }}
                    className={`flex-1 py-2 rounded-lg border text-sm transition-all ${
                      form.gender === g
                        ? 'border-navy bg-navy/5 font-medium'
                        : 'border-border hover:border-navy/30'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
              {fieldErrors.gender && <p className="text-xs text-nogo mt-1">{fieldErrors.gender}</p>}
            </div>

            {/* 연령대 */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                연령대 <span className="text-nogo">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {ageGroups.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => { setForm({ ...form, age_group: a }); setFieldErrors(p => ({ ...p, age_group: '' })) }}
                    className={`px-4 py-2 rounded-lg border text-sm transition-all ${
                      form.age_group === a
                        ? 'border-navy bg-navy/5 font-medium'
                        : 'border-border hover:border-navy/30'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
              {fieldErrors.age_group && <p className="text-xs text-nogo mt-1">{fieldErrors.age_group}</p>}
            </div>

            {/* 피부 타입 */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                피부 타입 <span className="text-nogo">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {skinTypes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { setForm({ ...form, skin_type: s }); setFieldErrors(p => ({ ...p, skin_type: '' })) }}
                    className={`px-4 py-2 rounded-lg border text-sm transition-all ${
                      form.skin_type === s
                        ? 'border-navy bg-navy/5 font-medium'
                        : 'border-border hover:border-navy/30'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {fieldErrors.skin_type && <p className="text-xs text-nogo mt-1">{fieldErrors.skin_type}</p>}
            </div>

            {/* 피부 고민 (다중 선택) */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                주요 피부 고민 <span className="text-text-muted font-normal">(복수 선택 가능)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {skinConcerns.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleConcern(c)}
                    className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${
                      selectedConcerns.includes(c)
                        ? 'border-navy bg-navy/5 font-medium'
                        : 'border-border hover:border-navy/30'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              {selectedConcerns.length > 0 && (
                <p className="text-xs text-text-muted mt-2">선택: {selectedConcerns.join(', ')}</p>
              )}
            </div>

            {/* 민감성 */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sensitive"
                checked={form.is_sensitive}
                onChange={(e) => setForm({ ...form, is_sensitive: e.target.checked })}
                className="w-4 h-4 rounded border-border text-navy focus:ring-navy"
              />
              <label htmlFor="sensitive" className="text-sm text-text">민감한 피부입니다</label>
            </div>

            {/* 현재 사용 제품 */}
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">현재 사용 중인 스킨케어 제품</label>
              <input
                type="text"
                value={form.current_product}
                onChange={(e) => setForm({ ...form, current_product: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                placeholder="예: 이니스프리 그린티 세럼"
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
                        마케팅 및 추가 테스트 안내 수신에 동의합니다.
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
