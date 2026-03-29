'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'

const skinTypes = ['건성', '복합성', '지성', '중성', '민감성']
const ageGroups = ['10대', '20대', '30대', '40대', '50대 이상']
const genders = ['여성', '남성']
const skinConcerns = ['모공', '주름', '색소침착', '여드름', '건조', '민감', '탄력', '각질', '다크서클', '홍조', '기타']

export default function PanelProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
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

  function toggleConcern(concern: string) {
    setSelectedConcerns((prev) =>
      prev.includes(concern) ? prev.filter((c) => c !== concern) : [...prev, concern]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    // 이름/연락처를 profiles 테이블에 저장
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
    })

    if (error) {
      console.error('panel_profiles upsert error:', error)
      setLoading(false)
      return
    }

    router.push('/panel')
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

            <Button type="submit" loading={loading} className="w-full" size="lg">
              프로필 저장하고 시작하기
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
