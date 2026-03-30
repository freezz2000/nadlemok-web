'use client'

import { useState } from 'react'
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
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
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

  const allRequired = REQUIRED_TERMS.every(({ key }) => terms[key as keyof typeof terms])
  const allChecked = allRequired && terms.marketing

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
    if (!allRequired) return
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
          ...(phone ? { phone } : {}),
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
              <label className="block text-sm font-medium text-text mb-1.5">이름</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                placeholder="이름을 입력하세요"
                required
              />
            </div>

            {/* 연락처 */}
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">연락처</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                placeholder="010-0000-0000"
              />
            </div>

            {/* 샘플 수취 주소 */}
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                샘플 수취 주소
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
            </div>

            {/* 성별 */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">성별</label>
              <div className="flex gap-3">
                {genders.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setForm({ ...form, gender: g })}
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
            </div>

            {/* 연령대 */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">연령대</label>
              <div className="flex flex-wrap gap-2">
                {ageGroups.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setForm({ ...form, age_group: a })}
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
            </div>

            {/* 피부 타입 */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">피부 타입</label>
              <div className="flex flex-wrap gap-2">
                {skinTypes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm({ ...form, skin_type: s })}
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

                {!allRequired && (
                  <p className="text-xs text-nogo mt-2">필수 약관에 모두 동의해야 가입이 가능합니다.</p>
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
              disabled={!allRequired}
            >
              프로필 저장하고 시작하기
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
