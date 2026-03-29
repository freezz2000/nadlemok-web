'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Card from '@/components/ui/Card'
import { StatusBadge, VerdictBadge } from '@/components/ui/Badge'
import Link from 'next/link'
import type { Project, ProjectStatus } from '@/lib/types'

export default function ClientProjectsPage() {
  const supabase = createClient()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false })
      setProjects(data || [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text">내 프로젝트</h1>
        <Link
          href="/client/apply"
          className="inline-flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-lg text-sm font-medium hover:bg-navy-dark transition-colors"
        >
          새 신청
        </Link>
      </div>

      {loading ? (
        <p className="text-text-muted">로딩중...</p>
      ) : projects.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-text-muted mb-4">아직 신청한 프로젝트가 없습니다.</p>
          <Link href="/client/apply" className="text-navy font-medium hover:underline">
            서비스 신청하기
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={p.status === 'completed' ? `/client/projects/${p.id}/results` : `/client/projects/${p.id}`}
            >
              <Card className="hover:border-navy/30 transition-colors cursor-pointer mb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-text">{p.product_name}</p>
                    <p className="text-sm text-text-muted mt-1">
                      {p.plan?.toUpperCase()} / 패널 {p.panel_size}명 / {p.test_duration}일
                    </p>
                    <p className="text-xs text-text-muted mt-1">
                      신청일: {new Date(p.created_at).toLocaleDateString('ko')}
                    </p>
                  </div>
                  <StatusBadge status={p.status as ProjectStatus} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
