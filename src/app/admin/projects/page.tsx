'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Card, { CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import Modal from '@/components/ui/Modal'
import Link from 'next/link'
import { CATEGORIES, PRODUCT_LINES } from '@/lib/template-constants'
import type { Project, ProjectStatus, ServicePlan } from '@/lib/types'

interface Client {
  id: string
  name: string
  company?: string
}

type ProjectWithClient = Project & { client?: Client | null }

export default function ProjectsPage() {
  const supabase = createClient()
  const [projects, setProjects] = useState<ProjectWithClient[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    client_id: '',
    product_name: '',
    product_category: '화장품',
    product_line: '',
    plan: 'standard' as ServicePlan,
    panel_size: 50,
    test_duration: 10,
  })

  useEffect(() => { loadProjects(); loadClients() }, [])

  async function loadClients() {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, company')
      .eq('role', 'client')
      .order('name')
    setClients(data || [])
  }

  async function loadProjects() {
    const { data } = await supabase
      .from('projects')
      .select('*, client:profiles!client_id(id, name, company)')
      .order('created_at', { ascending: false })
    setProjects((data as ProjectWithClient[]) || [])
    setLoading(false)
  }

  async function createProject() {
    const { product_line, ...rest } = form
    const payload = {
      ...rest,
      client_id: form.client_id || null,
      product_category: product_line ? `${form.product_category} > ${product_line}` : form.product_category,
      status: 'pending',
    }
    const { error } = await supabase.from('projects').insert(payload)
    if (!error) {
      setShowCreate(false)
      setForm({
        client_id: '',
        product_name: '',
        product_category: '화장품',
        product_line: '',
        plan: 'standard',
        panel_size: 50,
        test_duration: 10,
      })
      loadProjects()
    }
  }

  const planConfig: Record<ServicePlan, { panel: number; duration: number }> = {
    basic: { panel: 50, duration: 10 },
    standard: { panel: 50, duration: 10 },
    premium: { panel: 100, duration: 15 },
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text">프로젝트 관리</h1>
        <Button onClick={() => setShowCreate(true)}>새 프로젝트</Button>
      </div>

      <Card>
        {loading ? (
          <p className="text-text-muted py-4">로딩중...</p>
        ) : projects.length === 0 ? (
          <p className="text-center text-text-muted py-8">아직 프로젝트가 없습니다.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>제품명</TableHead>
                <TableHead>고객사</TableHead>
                <TableHead>플랜</TableHead>
                <TableHead>패널</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>생성일</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.product_name}</TableCell>
                  <TableCell>
                    {p.client ? (
                      <span className="text-sm">
                        {p.client.company
                          ? <><span className="text-text">{p.client.company}</span><span className="text-text-muted ml-1 text-xs">({p.client.name})</span></>
                          : p.client.name}
                      </span>
                    ) : (
                      <span className="text-text-muted text-xs">미지정</span>
                    )}
                  </TableCell>
                  <TableCell>{p.plan?.toUpperCase()}</TableCell>
                  <TableCell>{p.panel_size}명 / {p.test_duration}일</TableCell>
                  <TableCell><StatusBadge status={p.status as ProjectStatus} /></TableCell>
                  <TableCell className="text-text-muted">{new Date(p.created_at).toLocaleDateString('ko')}</TableCell>
                  <TableCell>
                    <Link href={`/admin/projects/${p.id}`} className="text-navy text-sm hover:underline">
                      상세
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* 프로젝트 생성 모달 */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="새 프로젝트 생성" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">고객 선택</label>
            <select
              value={form.client_id}
              onChange={(e) => setForm({ ...form, client_id: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
            >
              <option value="">— 고객 미지정 —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company ? `${c.company} (${c.name})` : c.name}
                </option>
              ))}
            </select>
            {clients.length === 0 && (
              <p className="text-xs text-text-muted mt-1">등록된 고객이 없습니다. 고객이 가입해야 선택 가능합니다.</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">제품명</label>
            <input
              type="text"
              value={form.product_name}
              onChange={(e) => setForm({ ...form, product_name: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
              placeholder="예: 비타민C 세럼"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">제품 카테고리</label>
            <select
              value={form.product_category}
              onChange={(e) => setForm({ ...form, product_category: e.target.value, product_line: '' })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          {(PRODUCT_LINES[form.product_category]?.length ?? 0) > 0 && (
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">제품군</label>
              <select
                value={form.product_line}
                onChange={(e) => setForm({ ...form, product_line: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
              >
                <option value="">선택 안 함</option>
                {PRODUCT_LINES[form.product_category].map((pl) => (
                  <option key={pl} value={pl}>{pl}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-text mb-2">서비스 플랜</label>
            <div className="grid grid-cols-3 gap-3">
              {(['basic', 'standard', 'premium'] as ServicePlan[]).map((plan) => (
                <button
                  key={plan}
                  type="button"
                  onClick={() => setForm({
                    ...form,
                    plan,
                    panel_size: planConfig[plan].panel,
                    test_duration: planConfig[plan].duration,
                  })}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    form.plan === plan
                      ? 'border-navy bg-navy/5 ring-2 ring-navy/20'
                      : 'border-border hover:border-navy/30'
                  }`}
                >
                  <div className="text-sm font-medium">{plan.toUpperCase()}</div>
                  <div className="text-xs text-text-muted mt-1">
                    {planConfig[plan].panel}명 / {planConfig[plan].duration}일
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>취소</Button>
            <Button onClick={createProject} disabled={!form.product_name}>생성</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
