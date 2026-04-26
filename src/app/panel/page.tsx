import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import Card, { CardTitle } from '@/components/ui/Card'
import { MatchStatusBadge } from '@/components/ui/Badge'
import Link from 'next/link'
import type { PanelMatchStatus } from '@/lib/types'

export default async function PanelHome() {
  const profile = await requireAuth(['panel'])
  const supabase = await createClient()

  // 매칭된 설문 조회 (panel_source 포함)
  const { data: matchings } = await supabase
    .from('survey_panels')
    .select(`
      *,
      survey:surveys(
        id, title, status, day_checkpoint, start_date, end_date,
        project:projects(product_name, panel_source)
      )
    `)
    .eq('panel_id', profile.id)
    .order('matched_at', { ascending: false })

  const allMatchings = matchings || []

  // 진행중 / 완료 분류
  const activeSurveys = allMatchings.filter((m) =>
    m.status !== 'dropped' &&
    m.status !== 'completed' &&
    m.survey?.status === 'active'
  )
  const completedSurveys = allMatchings.filter((m) => m.status === 'completed')

  // 내부(고객 초대) vs 외부(나들목 매칭) 구분
  const isInternal = (m: typeof allMatchings[0]) =>
    m.survey?.project?.panel_source === 'internal'

  const activeInternal = activeSurveys.filter(isInternal)
  const activeExternal = activeSurveys.filter((m) => !isInternal(m))
  const completedInternal = completedSurveys.filter(isInternal)
  const completedExternal = completedSurveys.filter((m) => !isInternal(m))

  const hasActive = activeSurveys.length > 0
  const hasCompleted = completedSurveys.length > 0

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">패널 홈</h1>

      {/* ── 진행중인 설문 ──────────────────────────────────── */}
      <div className="mb-6 space-y-4">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide">진행중인 설문</h2>

        {!hasActive && (
          <Card>
            <p className="text-sm text-text-muted py-2">현재 참여할 설문이 없습니다.</p>
          </Card>
        )}

        {/* 고객 초대 설문 */}
        {activeInternal.length > 0 && (
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-gold flex-shrink-0" />
              <CardTitle>고객 초대 설문</CardTitle>
              <span className="text-xs text-text-muted ml-auto">고객사에서 직접 초대된 설문입니다</span>
            </div>
            <div className="space-y-3">
              {activeInternal.map((m) => (
                <SurveyItem key={m.id} m={m} />
              ))}
            </div>
          </Card>
        )}

        {/* 나들목 매칭 설문 */}
        {activeExternal.length > 0 && (
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-navy flex-shrink-0" />
              <CardTitle>나들목 매칭 설문</CardTitle>
              <span className="text-xs text-text-muted ml-auto">나들목 플랫폼을 통해 배정된 설문입니다</span>
            </div>
            <div className="space-y-3">
              {activeExternal.map((m) => (
                <SurveyItem key={m.id} m={m} />
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* ── 완료된 설문 ────────────────────────────────────── */}
      {hasCompleted && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide">완료된 설문</h2>

          {completedInternal.length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-gold flex-shrink-0" />
                <CardTitle>고객 초대 설문</CardTitle>
              </div>
              <div className="space-y-2">
                {completedInternal.map((m) => (
                  <CompletedItem key={m.id} m={m} />
                ))}
              </div>
            </Card>
          )}

          {completedExternal.length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-navy flex-shrink-0" />
                <CardTitle>나들목 매칭 설문</CardTitle>
              </div>
              <div className="space-y-2">
                {completedExternal.map((m) => (
                  <CompletedItem key={m.id} m={m} />
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

// ── 진행중 설문 카드 ──────────────────────────────────────
function SurveyItem({ m }: { m: Record<string, unknown> }) {
  const survey = m.survey as {
    id: string; title: string; status: string
    project?: { product_name: string; panel_source: string }
  } | null

  return (
    <Link
      href={`/panel/surveys/${survey?.id}`}
      className="block p-4 rounded-lg border border-border hover:border-navy/30 hover:bg-surface/50 transition-all"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-text truncate">{survey?.title}</p>
          <p className="text-xs text-text-muted mt-0.5">{survey?.project?.product_name}</p>
        </div>
        <MatchStatusBadge status={(m.status as PanelMatchStatus)} />
      </div>
    </Link>
  )
}

// ── 완료된 설문 행 ────────────────────────────────────────
function CompletedItem({ m }: { m: Record<string, unknown> }) {
  const survey = m.survey as {
    id: string; title: string
    project?: { product_name: string; panel_source: string }
  } | null

  return (
    <Link
      href={`/panel/surveys/${survey?.id}/result`}
      className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:bg-surface/50 rounded-lg px-2 -mx-2 transition-colors"
    >
      <div className="min-w-0">
        <p className="text-sm text-text truncate">{survey?.title}</p>
        {survey?.project?.product_name && (
          <p className="text-xs text-text-muted mt-0.5">{survey.project.product_name}</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <MatchStatusBadge status="completed" />
        <span className="text-xs text-navy">결과 보기 →</span>
      </div>
    </Link>
  )
}
