'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Card, { CardTitle } from '@/components/ui/Card'
import Badge, { StatusBadge } from '@/components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import Button from '@/components/ui/Button'
import type { ProjectStatus } from '@/lib/types'

interface ClientInfo {
  id: string
  name: string
  company: string | null
  phone: string | null
  created_at: string
  projects: { id: string; status: string; product_name: string }[]
}

export default function ClientsPage() {
  const supabase = createClient()
  const [clients, setClients] = useState<ClientInfo[]>([])
  const [pendingProjects, setPendingProjects] = useState<{
    id: string; product_name: string; plan: string; created_at: string;
    client: { name: string; company: string } | { name: string; company: string }[] | null
  }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    // 고객 목록 + 프로젝트 수
    const { data: clientData } = await supabase
      .from('profiles')
      .select('id, name, company, phone, created_at, projects(*)')
      .eq('role', 'client')
      .order('created_at', { ascending: false })
    setClients(clientData || [])

    // 승인 대기 프로젝트
    const { data: pending } = await supabase
      .from('projects')
      .select('id, product_name, plan, created_at, client:profiles!client_id(name, company)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    setPendingProjects(pending || [])

    setLoading(false)
  }

  async function approveProject(projectId: string) {
    await supabase.from('projects').update({ status: 'draft' }).eq('id', projectId)
    load()
  }

  async function rejectProject(projectId: string) {
    await supabase.from('projects').update({ status: 'rejected' }).eq('id', projectId)
    load()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">고객 관리</h1>

      {/* 승인 대기 */}
      {pendingProjects.length > 0 && (
        <Card className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <CardTitle>승인 대기 신청</CardTitle>
            <Badge variant="warning">{pendingProjects.length}건</Badge>
          </div>
          <div className="space-y-3">
            {pendingProjects.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div>
                  <p className="text-sm font-medium text-text">{p.product_name}</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {(() => {
                      const c = Array.isArray(p.client) ? p.client[0] : p.client
                      return `${c?.company || ''} / ${c?.name || ''}`
                    })()} / {p.plan?.toUpperCase()} / {new Date(p.created_at).toLocaleDateString('ko')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="danger" onClick={() => rejectProject(p.id)}>반려</Button>
                  <Button size="sm" onClick={() => approveProject(p.id)}>승인</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 고객 목록 */}
      <Card>
        <CardTitle>등록 고객</CardTitle>
        {loading ? (
          <p className="text-text-muted py-4">로딩중...</p>
        ) : clients.length === 0 ? (
          <p className="text-sm text-text-muted py-8 text-center">등록된 고객이 없습니다.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead>회사명</TableHead>
                <TableHead>연락처</TableHead>
                <TableHead>프로젝트</TableHead>
                <TableHead>가입일</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((c) => {
                const projects = c.projects || []
                const pendingCount = projects.filter((p) => p.status === 'pending').length
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.company || '-'}</TableCell>
                    <TableCell>{c.phone || '-'}</TableCell>
                    <TableCell>
                      <span className="text-sm">{projects.length}건</span>
                      {pendingCount > 0 && (
                        <Badge variant="warning" className="ml-2">대기 {pendingCount}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-text-muted">
                      {new Date(c.created_at).toLocaleDateString('ko')}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
