import { createClient } from '@/lib/supabase/server'
import Card, { CardTitle } from '@/components/ui/Card'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const [
    { count: projectCount },
    { count: panelCount },
    { count: templateCount },
    { count: activeCount },
  ] = await Promise.all([
    supabase.from('projects').select('*', { count: 'exact', head: true }),
    supabase.from('panel_profiles').select('*', { count: 'exact', head: true }),
    supabase.from('survey_templates').select('*', { count: 'exact', head: true }),
    supabase.from('projects').select('*', { count: 'exact', head: true }).in('status', ['confirmed', 'approved', 'recruiting', 'testing', 'analyzing']),
  ])

  const stats = [
    { label: '전체 프로젝트', value: projectCount ?? 0, color: 'text-navy' },
    { label: '진행중 프로젝트', value: activeCount ?? 0, color: 'text-cgo' },
    { label: '등록 패널', value: panelCount ?? 0, color: 'text-go' },
    { label: '설문 템플릿', value: templateCount ?? 0, color: 'text-text-muted' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">관리자 대시보드</h1>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Card key={stat.label} padding="md">
            <p className="text-sm text-text-muted">{stat.label}</p>
            <p className={`text-3xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </Card>
        ))}
      </div>

      {/* 최근 프로젝트 */}
      <Card>
        <CardTitle>최근 프로젝트</CardTitle>
        <RecentProjects />
      </Card>
    </div>
  )
}

async function RecentProjects() {
  const supabase = await createClient()
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  if (!projects?.length) {
    return <p className="text-sm text-text-muted py-4">아직 등록된 프로젝트가 없습니다.</p>
  }

  const statusLabels: Record<string, string> = {
    pending: '승인 대기',
    draft: '설문 설정중',
    confirmed: '관리자 확정',
    approved: '고객 승인완료',
    recruiting: '패널 모집중',
    testing: '테스트 진행중',
    analyzing: '분석중',
    completed: '완료',
    rejected: '반려',
  }

  return (
    <div className="mt-4 space-y-3">
      {projects.map((p) => (
        <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
          <div>
            <p className="text-sm font-medium text-text">{p.product_name}</p>
            <p className="text-xs text-text-muted">{p.plan?.toUpperCase()} / 패널 {p.panel_size}명</p>
          </div>
          <span className="text-xs px-2 py-1 rounded bg-surface text-text-muted">
            {statusLabels[p.status] ?? p.status}
          </span>
        </div>
      ))}
    </div>
  )
}
