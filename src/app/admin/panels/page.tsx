'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Card, { CardTitle } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'

interface PanelProfileData {
  gender: string
  age_group: string
  skin_type: string
  skin_concern: string
  is_sensitive: boolean
  tier: string
  is_available: boolean
}

interface PanelWithProfile {
  id: string
  name: string
  created_at: string
  panel_profiles: PanelProfileData | null
}

export default function PanelsPage() {
  const supabase = createClient()
  const [panels, setPanels] = useState<PanelWithProfile[]>([])
  const [filter, setFilter] = useState({ age_group: '', skin_type: '', is_sensitive: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadPanels() }, [])

  async function loadPanels() {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, created_at, panel_profiles(*)')
      .eq('role', 'panel')
      .order('created_at', { ascending: false })

    setPanels((data as unknown as PanelWithProfile[]) || [])
    setLoading(false)
  }

  const filtered = panels.filter((p) => {
    const pp = p.panel_profiles
    if (!pp) return true
    if (filter.age_group && pp.age_group !== filter.age_group) return false
    if (filter.skin_type && pp.skin_type !== filter.skin_type) return false
    if (filter.is_sensitive === 'true' && !pp.is_sensitive) return false
    if (filter.is_sensitive === 'false' && pp.is_sensitive) return false
    return true
  })

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">패널 관리</h1>

      {/* 필터 */}
      <Card className="mb-6" padding="sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-text">필터:</span>
          <select
            value={filter.age_group}
            onChange={(e) => setFilter({ ...filter, age_group: e.target.value })}
            className="px-3 py-1.5 border border-border rounded-lg text-sm"
          >
            <option value="">전체 연령</option>
            {['10대', '20대', '30대', '40대', '50대 이상'].map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
          <select
            value={filter.skin_type}
            onChange={(e) => setFilter({ ...filter, skin_type: e.target.value })}
            className="px-3 py-1.5 border border-border rounded-lg text-sm"
          >
            <option value="">전체 피부타입</option>
            {['건성', '복합성', '지성', '중성', '민감성'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            value={filter.is_sensitive}
            onChange={(e) => setFilter({ ...filter, is_sensitive: e.target.value })}
            className="px-3 py-1.5 border border-border rounded-lg text-sm"
          >
            <option value="">민감성 여부</option>
            <option value="true">민감</option>
            <option value="false">비민감</option>
          </select>
          <span className="text-sm text-text-muted ml-auto">{filtered.length}명</span>
        </div>
      </Card>

      {/* 패널 목록 */}
      <Card>
        {loading ? (
          <p className="text-text-muted py-4">로딩중...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead>성별</TableHead>
                <TableHead>연령대</TableHead>
                <TableHead>피부타입</TableHead>
                <TableHead>피부고민</TableHead>
                <TableHead>민감성</TableHead>
                <TableHead>등급</TableHead>
                <TableHead>상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.panel_profiles?.gender || '-'}</TableCell>
                  <TableCell>{p.panel_profiles?.age_group || '-'}</TableCell>
                  <TableCell>{p.panel_profiles?.skin_type || '-'}</TableCell>
                  <TableCell>{p.panel_profiles?.skin_concern || '-'}</TableCell>
                  <TableCell>
                    {p.panel_profiles?.is_sensitive ? <Badge variant="warning">민감</Badge> : '-'}
                  </TableCell>
                  <TableCell>{p.panel_profiles?.tier?.toUpperCase() || '-'}</TableCell>
                  <TableCell>
                    {p.panel_profiles?.is_available
                      ? <Badge variant="go">참여가능</Badge>
                      : <Badge variant="default">불가</Badge>
                    }
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
