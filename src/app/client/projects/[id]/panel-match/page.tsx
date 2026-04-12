'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Card, { CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { AGE_RANGE_OPTIONS, SKIN_TYPE_OPTIONS, SKIN_CONCERN_OPTIONS, formatKRW } from '@/lib/pricing'

interface PanelProfile {
  id: string
  name: string
  age_group: string | null
  skin_type: string | null
  skin_concerns: string[] | null
  total_tests: number
}

interface Selection {
  panelId: string
  status: 'pending' | 'confirmed' | 'rejected'
  selectedBy: 'client' | 'admin'
}

interface ProjectInfo {
  product_name: string
  external_panel_count: number
  delivery_service: boolean
  quote_total: number
  ageRanges: string[]
  skinTypes: string[]
  skinConcerns: string[]
}

export default function PanelMatchPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const router = useRouter()

  const [project, setProject] = useState<ProjectInfo | null>(null)
  const [panels, setPanels] = useState<PanelProfile[]>([])
  const [selections, setSelections] = useState<Selection[]>([])
  const [filterAge, setFilterAge] = useState<string[]>([])
  const [filterSkin, setFilterSkin] = useState<string[]>([])
  const [filterConcern, setFilterConcern] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [projRes, panelRes, selRes] = await Promise.all([
      fetch(`/api/projects/${projectId}/info`),
      fetch(`/api/panels?projectId=${projectId}`),
      fetch(`/api/projects/${projectId}/panel-selections`),
    ])
    const [projData, panelData, selData] = await Promise.all([
      projRes.json(), panelRes.json(), selRes.json(),
    ])
    if (projData) setProject(projData)
    setPanels(panelData.panels || [])
    setSelections(selData.selections || [])
    // 프로젝트 조건을 필터 기본값으로 설정
    if (projData?.ageRanges?.length) setFilterAge(projData.ageRanges)
    if (projData?.skinTypes?.length) setFilterSkin(projData.skinTypes)
    setLoading(false)
  }, [projectId])

  useEffect(() => { load() }, [load])

  const selectedIds = new Set(selections.filter(s => s.status !== 'rejected').map(s => s.panelId))
  const target = project?.external_panel_count ?? 0

  const filteredPanels = panels.filter(p => {
    if (filterAge.length && (!p.age_group || !filterAge.includes(p.age_group))) return false
    if (filterSkin.length && (!p.skin_type || !filterSkin.includes(p.skin_type))) return false
    if (filterConcern.length && (!p.skin_concerns || !filterConcern.some(c => p.skin_concerns!.includes(c)))) return false
    return true
  })

  function togglePanel(panelId: string) {
    if (selectedIds.has(panelId)) {
      setSelections(prev => prev.filter(s => s.panelId !== panelId))
    } else {
      if (selectedIds.size >= target) return
      setSelections(prev => [...prev, { panelId, status: 'pending', selectedBy: 'client' }])
    }
  }

  function toggleFilter<T>(arr: T[], val: T, setter: (v: T[]) => void) {
    setter(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val])
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    const res = await fetch(`/api/projects/panel-select`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, panelIds: [...selectedIds] }),
    })
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) { setError(data.error || '오류가 발생했습니다.'); return }
    router.push(`/client/projects/${projectId}`)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href={`/client/projects/${projectId}/panel-setup`} className="text-sm text-text-muted hover:text-text mb-1 inline-block">
          ← 패널 설정으로 돌아가기
        </Link>
        <h1 className="text-2xl font-bold text-text">패널 선택</h1>
        {project && <p className="text-sm text-text-muted mt-0.5">{project.product_name}</p>}
      </div>

      {/* 선택 현황 */}
      <div className="flex items-center justify-between mb-6 p-4 bg-navy/5 rounded-xl border border-navy/20">
        <div>
          <p className="text-sm text-text-muted">선택된 패널</p>
          <p className="text-2xl font-bold text-navy">{selectedIds.size} <span className="text-base font-normal text-text-muted">/ {target}명</span></p>
        </div>
        {project?.quote_total ? (
          <div className="text-right">
            <p className="text-xs text-text-muted">예상 비용</p>
            <p className="text-lg font-bold text-navy">{formatKRW(project.quote_total)}</p>
            <p className="text-xs text-text-muted">VAT 별도</p>
          </div>
        ) : null}
        <Button
          onClick={handleSubmit}
          loading={submitting}
          disabled={selectedIds.size < target}
          size="sm"
        >
          선택 완료 ({selectedIds.size}/{target})
        </Button>
      </div>

      <div className="grid lg:grid-cols-[240px_1fr] gap-6">
        {/* 필터 */}
        <div className="space-y-4">
          <Card padding="sm">
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">연령대</p>
            <div className="space-y-1.5">
              {AGE_RANGE_OPTIONS.map(opt => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterAge.includes(opt.value)}
                    onChange={() => toggleFilter(filterAge, opt.value, setFilterAge)}
                    className="accent-navy"
                  />
                  <span className="text-sm text-text">{opt.label}</span>
                </label>
              ))}
            </div>
          </Card>
          <Card padding="sm">
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">피부 타입</p>
            <div className="space-y-1.5">
              {SKIN_TYPE_OPTIONS.map(opt => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterSkin.includes(opt.value)}
                    onChange={() => toggleFilter(filterSkin, opt.value, setFilterSkin)}
                    className="accent-navy"
                  />
                  <span className="text-sm text-text">{opt.label}</span>
                </label>
              ))}
            </div>
          </Card>
          <Card padding="sm">
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">피부 고민</p>
            <div className="space-y-1.5">
              {SKIN_CONCERN_OPTIONS.map(opt => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterConcern.includes(opt.value)}
                    onChange={() => toggleFilter(filterConcern, opt.value, setFilterConcern)}
                    className="accent-navy"
                  />
                  <span className="text-sm text-text">{opt.label}</span>
                </label>
              ))}
            </div>
          </Card>
        </div>

        {/* 패널 목록 */}
        <div>
          <p className="text-sm text-text-muted mb-3">
            {filteredPanels.length}명 검색됨 · {target}명 선택 필요
          </p>
          <div className="space-y-2">
            {filteredPanels.length === 0 ? (
              <div className="text-center py-12 text-text-muted text-sm">
                조건에 맞는 패널이 없습니다.<br />필터를 조정해보세요.
              </div>
            ) : filteredPanels.map(panel => {
              const isSelected = selectedIds.has(panel.id)
              const isFull = selectedIds.size >= target && !isSelected
              return (
                <div
                  key={panel.id}
                  onClick={() => !isFull && togglePanel(panel.id)}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-navy bg-navy/5 cursor-pointer'
                      : isFull
                        ? 'border-border opacity-40 cursor-not-allowed'
                        : 'border-border hover:border-navy/30 cursor-pointer'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                    isSelected ? 'border-navy bg-navy' : 'border-gray-300'
                  }`}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text">{panel.name || '익명 패널'}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {panel.age_group && (
                        <span className="text-xs px-2 py-0.5 bg-surface border border-border rounded-full text-text-muted">
                          {AGE_RANGE_OPTIONS.find(o => o.value === panel.age_group)?.label ?? panel.age_group}
                        </span>
                      )}
                      {panel.skin_type && (
                        <span className="text-xs px-2 py-0.5 bg-surface border border-border rounded-full text-text-muted">
                          {SKIN_TYPE_OPTIONS.find(o => o.value === panel.skin_type)?.label ?? panel.skin_type}
                        </span>
                      )}
                      {panel.skin_concerns?.map(c => (
                        <span key={c} className="text-xs px-2 py-0.5 bg-surface border border-border rounded-full text-text-muted">
                          {SKIN_CONCERN_OPTIONS.find(o => o.value === c)?.label ?? c}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-xs text-text-muted text-right shrink-0">
                    <p>참여 {panel.total_tests}회</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-nogo bg-nogo/5 border border-nogo/20 rounded-lg px-4 py-3 mt-4">
          {error}
        </p>
      )}
    </div>
  )
}
