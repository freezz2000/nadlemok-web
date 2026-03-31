'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Card, { CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import type { Project, Survey } from '@/lib/types'

interface PanelInfo {
  id: string
  name: string
  panel_profiles: {
    gender: string
    age_group: string
    skin_type: string
    skin_concern: string
    is_available: boolean
  } | null
}

export default function MatchingPage() {
  const supabase = createClient()
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState('')
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [selectedSurvey, setSelectedSurvey] = useState('')
  const [panels, setPanels] = useState<PanelInfo[]>([])
  const [selectedPanels, setSelectedPanels] = useState<Set<string>>(new Set())
  const [matchedPanelIds, setMatchedPanelIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState({ gender: '', age_group: '', skin_type: '' })

  useEffect(() => {
    loadProjects()
    loadPanels()
  }, [])

  useEffect(() => {
    if (selectedProject) loadSurveys()
  }, [selectedProject])

  useEffect(() => {
    if (selectedSurvey) loadMatchedPanels()
    else { setMatchedPanelIds(new Set()); setSelectedPanels(new Set()) }
  }, [selectedSurvey])

  async function loadProjects() {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .in('status', ['approved', 'recruiting'])
      .order('created_at', { ascending: false })
    setProjects(data || [])
  }

  async function loadSurveys() {
    const { data } = await supabase.from('surveys').select('*').eq('project_id', selectedProject)
    setSurveys(data || [])
    if (data?.length) setSelectedSurvey(data[0].id)
    else setSelectedSurvey('')
  }

  async function loadPanels() {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, panel_profiles(*)')
      .eq('role', 'panel')
      .order('name')
    setPanels((data as unknown as PanelInfo[]) || [])
  }

  async function loadMatchedPanels() {
    const { data } = await supabase
      .from('survey_panels')
      .select('panel_id')
      .eq('survey_id', selectedSurvey)
    const ids = new Set(data?.map((d) => d.panel_id) || [])
    setMatchedPanelIds(ids)
    setSelectedPanels(new Set(ids))
  }

  function togglePanel(panelId: string) {
    const next = new Set(selectedPanels)
    if (next.has(panelId)) next.delete(panelId)
    else next.add(panelId)
    setSelectedPanels(next)
  }

  function selectAll() {
    const all = new Set(selectedPanels)
    filteredPanels.forEach((p) => all.add(p.id))
    setSelectedPanels(all)
  }

  function deselectAll() {
    const next = new Set(selectedPanels)
    filteredPanels.forEach((p) => next.delete(p.id))
    setSelectedPanels(next)
  }

  async function saveMatching() {
    setSaving(true)

    // 추가할 패널: 선택됨 but 아직 매칭 안 됨
    const toAdd = Array.from(selectedPanels).filter((id) => !matchedPanelIds.has(id))
    // 해제할 패널: 매칭됨 but 선택 해제됨
    const toRemove = Array.from(matchedPanelIds).filter((id) => !selectedPanels.has(id))

    if (toAdd.length > 0) {
      await supabase.from('survey_panels').insert(
        toAdd.map((panel_id) => ({ survey_id: selectedSurvey, panel_id }))
      )
    }
    if (toRemove.length > 0) {
      await supabase.from('survey_panels')
        .delete()
        .eq('survey_id', selectedSurvey)
        .in('panel_id', toRemove)
    }

    await loadMatchedPanels()
    setSaving(false)
  }

  const addedCount = Array.from(selectedPanels).filter((id) => !matchedPanelIds.has(id)).length
  const removedCount = Array.from(matchedPanelIds).filter((id) => !selectedPanels.has(id)).length
  const hasChanges = addedCount > 0 || removedCount > 0

  // 필터 적용
  const filteredPanels = panels.filter((p) => {
    const pp = p.panel_profiles
    if (!pp?.is_available) return false
    if (filter.gender && pp.gender !== filter.gender) return false
    if (filter.age_group && pp.age_group !== filter.age_group) return false
    if (filter.skin_type && pp.skin_type !== filter.skin_type) return false
    return true
  })

  const matchedList = filteredPanels.filter((p) => selectedPanels.has(p.id))
  const unmatchedList = filteredPanels.filter((p) => !selectedPanels.has(p.id))

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">패널 매칭</h1>

      {/* 프로젝트/설문 선택 */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">프로젝트 선택</label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
            >
              <option value="">프로젝트를 선택하세요</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.product_name} ({p.plan?.toUpperCase()})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">설문 선택</label>
            <select
              value={selectedSurvey}
              onChange={(e) => setSelectedSurvey(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
              disabled={!surveys.length}
            >
              {surveys.length === 0 && <option value="">설문 없음</option>}
              {surveys.map((s) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* 고객 요청 코호트 정보 */}
      {selectedProject && (() => {
        const proj = projects.find((p) => p.id === selectedProject)
        const tc = (proj as unknown as { target_cohort?: { genders: string[]; ageGroups: string[]; skinTypes: string[] } })?.target_cohort
        if (!tc && !proj) return null
        return (
          <Card className="mb-4" padding="sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-text">고객 요청 코호트</span>
              {proj && <span className="text-xs text-text-muted">{proj.product_name} / {proj.plan?.toUpperCase()} / {proj.panel_size}명</span>}
            </div>
            {tc ? (
              <div className="flex flex-wrap gap-2">
                {tc.genders?.length > 0 && (
                  <span className="text-xs px-2 py-1 bg-surface rounded-lg">성별: {tc.genders.join(', ')}</span>
                )}
                {tc.ageGroups?.length > 0 && (
                  <span className="text-xs px-2 py-1 bg-surface rounded-lg">연령: {tc.ageGroups.join(', ')}</span>
                )}
                {tc.skinTypes?.length > 0 && (
                  <span className="text-xs px-2 py-1 bg-surface rounded-lg">피부타입: {tc.skinTypes.join(', ')}</span>
                )}
                {(!tc.genders?.length && !tc.ageGroups?.length && !tc.skinTypes?.length) && (
                  <span className="text-xs text-text-muted">코호트 지정 없음 (전체 대상)</span>
                )}
              </div>
            ) : (
              <span className="text-xs text-text-muted">코호트 정보가 설정되지 않았습니다</span>
            )}
          </Card>
        )
      })()}

      {selectedSurvey && (
        <>
          {/* 필터 + 요약 */}
          <Card className="mb-4" padding="sm">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-text">필터:</span>
              <select value={filter.gender} onChange={(e) => setFilter({ ...filter, gender: e.target.value })}
                className="px-3 py-1.5 border border-border rounded-lg text-sm">
                <option value="">전체 성별</option>
                <option>여성</option><option>남성</option>
              </select>
              <select value={filter.age_group} onChange={(e) => setFilter({ ...filter, age_group: e.target.value })}
                className="px-3 py-1.5 border border-border rounded-lg text-sm">
                <option value="">전체 연령</option>
                {['10대','20대','30대','40대','50대 이상'].map((a) => <option key={a}>{a}</option>)}
              </select>
              <select value={filter.skin_type} onChange={(e) => setFilter({ ...filter, skin_type: e.target.value })}
                className="px-3 py-1.5 border border-border rounded-lg text-sm">
                <option value="">전체 피부타입</option>
                {['건성','복합성','지성','중성','민감성'].map((s) => <option key={s}>{s}</option>)}
              </select>
              <div className="ml-auto flex items-center gap-3">
                <span className="text-sm text-text-muted">
                  선택 <span className="font-medium text-navy">{selectedPanels.size}명</span>
                  {hasChanges && (
                    <span className="text-xs ml-1">
                      ({addedCount > 0 && <span className="text-go">+{addedCount}</span>}
                      {addedCount > 0 && removedCount > 0 && ' / '}
                      {removedCount > 0 && <span className="text-nogo">-{removedCount}</span>})
                    </span>
                  )}
                </span>
                <Button size="sm" onClick={saveMatching} loading={saving} disabled={!hasChanges}>
                  저장
                </Button>
              </div>
            </div>
          </Card>

          {/* 선택된 패널 (매칭됨 + 새로 선택) */}
          {matchedList.length > 0 && (
            <Card className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CardTitle>선택된 패널</CardTitle>
                  <Badge variant="go">{matchedList.length}명</Badge>
                </div>
                <button onClick={deselectAll} className="text-xs text-text-muted hover:text-nogo">전체 해제</button>
              </div>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {matchedList.map((p) => {
                  const isNew = !matchedPanelIds.has(p.id)
                  return (
                    <div
                      key={p.id}
                      onClick={() => togglePanel(p.id)}
                      className="flex items-center gap-3 p-2.5 rounded-lg border border-navy/20 bg-navy/5 cursor-pointer hover:bg-navy/10 transition-all"
                    >
                      <input type="checkbox" checked readOnly className="w-4 h-4 rounded" />
                      <span className="text-sm font-medium flex-1">{p.name}</span>
                      <span className="text-xs text-text-muted">
                        {p.panel_profiles?.gender} / {p.panel_profiles?.age_group} / {p.panel_profiles?.skin_type}
                      </span>
                      {p.panel_profiles?.skin_concern && (
                        <span className="text-xs text-text-muted">{p.panel_profiles.skin_concern}</span>
                      )}
                      {isNew && <Badge variant="info">NEW</Badge>}
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {/* 미선택 패널 */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CardTitle>사용 가능한 패널</CardTitle>
                <span className="text-xs text-text-muted">{unmatchedList.length}명</span>
              </div>
              <button onClick={selectAll} className="text-xs text-navy hover:underline">전체 선택</button>
            </div>
            {unmatchedList.length === 0 ? (
              <p className="text-sm text-text-muted py-4 text-center">
                {filteredPanels.length === 0 ? '필터 조건에 맞는 패널이 없습니다.' : '모든 패널이 선택되었습니다.'}
              </p>
            ) : (
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {unmatchedList.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => togglePanel(p.id)}
                    className="flex items-center gap-3 p-2.5 rounded-lg border border-border cursor-pointer hover:border-navy/30 hover:bg-surface/50 transition-all"
                  >
                    <input type="checkbox" checked={false} readOnly className="w-4 h-4 rounded" />
                    <span className="text-sm font-medium flex-1">{p.name}</span>
                    <span className="text-xs text-text-muted">
                      {p.panel_profiles?.gender} / {p.panel_profiles?.age_group} / {p.panel_profiles?.skin_type}
                    </span>
                    {p.panel_profiles?.skin_concern && (
                      <span className="text-xs text-text-muted">{p.panel_profiles.skin_concern}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
