import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import Card, { CardTitle } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import Link from 'next/link'
import type { ProjectStatus } from '@/lib/types'

export default async function ClientDashboard() {
  const profile = await requireAuth(['client'])
  const supabase = await createClient()

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('client_id', profile.id)
    .order('created_at', { ascending: false })

  const activeProjects = projects?.filter((p) => !['completed', 'rejected'].includes(p.status)) || []
  const completedProjects = projects?.filter((p) => p.status === 'completed') || []
  const rejectedProjects = projects?.filter((p) => p.status === 'rejected') || []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text">고객 대시보드</h1>
        <Link
          href="/client/apply"
          className="inline-flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-lg text-sm font-medium hover:bg-navy-dark transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          서비스 신청
        </Link>
      </div>

      {/* 진행중 프로젝트 */}
      <Card className="mb-6">
        <CardTitle>진행중인 프로젝트</CardTitle>
        {activeProjects.length === 0 ? (
          <p className="text-sm text-text-muted mt-4">현재 진행중인 프로젝트가 없습니다.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {activeProjects.map((p) => (
              <Link
                key={p.id}
                href={`/client/projects/${p.id}`}
                className="block p-4 rounded-lg border border-border hover:border-navy/30 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text">{p.product_name}</p>
                    <p className="text-xs text-text-muted mt-1">
                      {p.plan?.toUpperCase()} / 패널 {p.panel_size}명 / {p.test_duration}일
                    </p>
                  </div>
                  <StatusBadge status={p.status as ProjectStatus} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* 완료된 프로젝트 */}
      <Card>
        <CardTitle>완료된 프로젝트</CardTitle>
        {completedProjects.length === 0 ? (
          <p className="text-sm text-text-muted mt-4">아직 완료된 프로젝트가 없습니다.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {completedProjects.map((p) => (
              <Link
                key={p.id}
                href={`/client/projects/${p.id}/results`}
                className="block p-4 rounded-lg border border-border hover:border-navy/30 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text">{p.product_name}</p>
                    <p className="text-xs text-text-muted mt-1">{p.plan?.toUpperCase()}</p>
                  </div>
                  <StatusBadge status="completed" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
