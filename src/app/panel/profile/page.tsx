'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

const skinTypes = ['건성', '복합성', '지성', '중성', '민감성']
const ageGroups = ['10대', '20대', '30대', '40대', '50대 이상']
const genders = ['여성', '남성']
const skinConcerns = ['모공', '주름', '색소침착', '여드름', '건조', '민감', '탄력', '각질', '다크서클', '홍조', '기타']

export default function PanelProfilePage() {
  const supabase = createClient()
  const router = useRouter()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState({ zipcode: '', address: '', detail: '' })
  const [form, setForm] = useState({
    gender: '',
    age_group: '',
    skin_type: '',
    skin_concern: '' as string,
    is_sensitive: false,
    current_product: '',
  })
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    // profiles에서 이름/연락처 로드
    const { data: profile } = await supabase.from('profiles').select('name, phone').eq('id', user.id).single()
    if (profile) {
      setName(profile.name || '')
      setPhone(profile.phone || '')
    }

    const { data } = await supabase.from('panel_profiles').select('*').eq('id', user.id).single()
    if (data) {
      const concerns = data.skin_concern ? data.skin_concern.split(',').map((s: string) => s.trim()).filter(Boolean) : []
      setSelectedConcerns(concerns)
      setForm({
        gender: data.gender || '',
        age_group: data.age_group || '',
        skin_type: data.skin_type || '',
        skin_concern: data.skin_concern || '',
        is_sensitive: data.is_sensitive || false,
        current_product: data.current_product || '',
      })
      setAddress({
        zipcode: data.address_zipcode || '',
        address: data.address || '',
        detail: data.address_detail || '',
      })
    }
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
    const next = selectedConcerns.includes(concern)
      ? selectedConcerns.filter((c) => c !== concern)
      : [...selectedConcerns, concern]
    setSelectedConcerns(next)
    setForm({ ...form, skin_concern: next.join(', ') })
  }

  async function save() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    // 이름/연락처 저장
    await supabase.from('profiles').update({
      name,
      phone,
    }).eq('id', user.id)

    await supabase.from('panel_profiles').upsert({
      id: user.id,
      ...form,
      skin_concern: selectedConcerns.join(', '),
      address_zipcode: address.zipcode || null,
      address: address.address || null,
      address_detail: address.detail || null,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function withdraw() {
    setWithdrawing(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 데이터 삭제 없이 비활성 처리
    await supabase.from('profiles').update({ deactivated_at: new Date().toISOString() }).eq('id', user.id)
    await supabase.from('panel_profiles').update({ is_available: false }).eq('id', user.id)
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">내 프로필</h1>
      <Card>
        <div className="space-y-5">
          {/* 이름 */}
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
              placeholder="이름을 입력하세요"
            />
          </div>

          {/* 연락처 */}
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">연락처</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
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
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
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
                    form.gender === g ? 'border-navy bg-navy/5 font-medium' : 'border-border hover:border-navy/30'
                  }`}
                >{g}</button>
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
                    form.age_group === a ? 'border-navy bg-navy/5 font-medium' : 'border-border hover:border-navy/30'
                  }`}
                >{a}</button>
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
                    form.skin_type === s ? 'border-navy bg-navy/5 font-medium' : 'border-border hover:border-navy/30'
                  }`}
                >{s}</button>
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
                >{c}</button>
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
              className="w-4 h-4 rounded"
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
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
              placeholder="예: 이니스프리 그린티 세럼"
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
              탈퇴하시면 패널 활동이 중단되며 매칭에서 제외됩니다.
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
