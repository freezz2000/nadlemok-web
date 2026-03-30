import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import Card, { CardTitle } from '@/components/ui/Card'
import { MatchStatusBadge } from '@/components/ui/Badge'
import Link from 'next/link'
import type { PanelMatchStatus } from '@/lib/types'

export default async function PanelHome() {
  const profile = await requireAuth(['panel'])
  const supabase = await createClient()

  // 매칭된 설문 조회
  const { data: matchings } = await supabase
    .from('survey_panels')
    .select(`
      *,
      survey:surveys(
        id, title, status, day_checkpoint, start_date, end_date,
        project:projects(product_name)
      )
    `)
    .eq('panel_id', profile.id)
    .order('matched_at', { ascending: false })

  const activeSurveys = matchings?.filter((m) => m.status !== 'dropped' && m.status !== 'completed' && m.survey?.status !== 'closed') || []
  const completedSurveys = matchings?.filter((m) => m.status === 'completed') || []

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">패널 홈</h1>

      {/* 진행중인 설문 */}
      <Card className="mb-6">
        <CardTitle>진행중인 설문</CardTitle>
        {activeSurveys.length === 0 ? (
          <p className="text-sm text-text-muted mt-4">현재 참여할 설문이 없습니다.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {activeSurveys.map((m) => (
              <Link
                key={m.id}
                href={`/panel/surveys/${m.survey?.id}`}
                className="block p-4 rounded-lg border border-border hover:border-navy/30 hover:bg-surface/50 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text">{m.survey?.title}</p>
                    <p className="text-xs text-text-muted mt-1">
                      {m.survey?.project?.product_name}
                    </p>
                  </div>
                  <MatchStatusBadge status={m.status as PanelMatchStatus} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* 완료된 설문 */}
      <Card>
        <CardTitle>완료된 설문</CardTitle>
        {completedSurveys.length === 0 ? (
          <p className="text-sm text-text-muted mt-4">아직 완료된 설문이 없습니다.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {completedSurveys.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <p className="text-sm text-text">{m.survey?.title}</p>
                <MatchStatusBadge status="completed" />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
