'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Card, { CardTitle } from '@/components/ui/Card'
import { VerdictBadge } from '@/components/ui/Badge'
import Badge from '@/components/ui/Badge'
import Link from 'next/link'
import type { AnalysisResult, Verdict } from '@/lib/types'

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [productName, setProductName] = useState('')

  useEffect(() => { load() }, [id])

  async function load() {
    const [{ data: analysis }, { data: project }] = await Promise.all([
      supabase.from('analysis_results').select('*').eq('project_id', id).single(),
      supabase.from('projects').select('product_name').eq('id', id).single(),
    ])
    setResult(analysis)
    setProductName(project?.product_name || '')
  }

  if (!result) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <p className="text-text-muted">분석 결과가 아직 준비되지 않았습니다.</p>
        <Link href={`/client/projects/${id}`} className="text-navy hover:underline text-sm mt-2 inline-block">
          프로젝트 상세로 돌아가기
        </Link>
      </div>
    )
  }

  const verdictConfig: Record<Verdict, { bg: string; border: string; text: string; desc: string }> = {
    'GO': { bg: 'bg-go-bg', border: 'border-go', text: 'text-go', desc: '이 제품은 출시하셔도 좋습니다.' },
    'CONDITIONAL GO': { bg: 'bg-cgo-bg', border: 'border-cgo', text: 'text-cgo', desc: '일부 개선 후 출시를 권장합니다.' },
    'NO-GO': { bg: 'bg-nogo-bg', border: 'border-nogo', text: 'text-nogo', desc: '현재 상태로는 출시를 보류할 것을 권장합니다.' },
  }
  const vc = verdictConfig[result.verdict]

  return (
    <div className="max-w-4xl mx-auto">
      <Link href={`/client/projects/${id}`} className="text-sm text-text-muted hover:text-text mb-2 inline-block">
        ← 프로젝트 상세
      </Link>
      <h1 className="text-2xl font-bold text-text mb-6">{productName} - 분석 결과</h1>

      {/* 판정 배너 */}
      <div className={`p-6 rounded-xl ${vc.bg} border-2 ${vc.border} mb-6`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-muted">최종 판정</p>
            <p className={`text-3xl font-bold mt-1 ${vc.text}`}>{result.verdict}</p>
            <p className="text-sm text-text mt-2">{vc.desc}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-text-muted">출시 성공 확률</p>
            <p className={`text-4xl font-bold ${vc.text}`}>{(result.success_probability * 100).toFixed(0)}%</p>
          </div>
        </div>
      </div>

      {/* 종합 요약 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card padding="sm">
          <p className="text-xs text-text-muted">전반 만족도</p>
          <p className="text-2xl font-bold text-text">{result.summary.satisfaction_mean.toFixed(2)}</p>
          <p className="text-xs text-text-muted">/ 4.00</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-text-muted">구매 의향</p>
          <p className="text-2xl font-bold text-text">{result.summary.purchase_intent_mean.toFixed(2)}</p>
          <p className="text-xs text-text-muted">/ 4.00</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-text-muted">추천 의향</p>
          <p className="text-2xl font-bold text-text">{result.summary.recommend_mean.toFixed(2)}</p>
          <p className="text-xs text-text-muted">/ 4.00</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-text-muted">응답자</p>
          <p className="text-2xl font-bold text-text">{result.summary.total_responses}명</p>
        </Card>
      </div>

      {/* Kill Signal */}
      <Card className="mb-6">
        <CardTitle>Kill Signal 모니터</CardTitle>
        <div className="mt-4 space-y-3">
          {result.kill_signals.map((ks) => {
            const levelConfig = {
              safe: { bg: 'bg-go-bg', text: 'text-go', label: '양호' },
              warning: { bg: 'bg-cgo-bg', text: 'text-cgo', label: '주의' },
              danger: { bg: 'bg-nogo-bg', text: 'text-nogo', label: '위험' },
            }
            const lc = levelConfig[ks.level]
            return (
              <div key={ks.name} className="flex items-center gap-3">
                <span className="text-sm text-text w-28">{ks.name.replace('KS_', '')}</span>
                <div className="flex-1 h-6 bg-surface-dark rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      ks.level === 'danger' ? 'bg-nogo' : ks.level === 'warning' ? 'bg-cgo' : 'bg-go'
                    }`}
                    style={{ width: `${Math.min(ks.ratio * 100, 100)}%` }}
                  />
                </div>
                <span className={`text-sm font-medium w-12 text-right ${lc.text}`}>
                  {(ks.ratio * 100).toFixed(0)}%
                </span>
                <Badge variant={ks.level === 'danger' ? 'nogo' : ks.level === 'warning' ? 'cgo' : 'go'}>
                  {lc.label}
                </Badge>
              </div>
            )
          })}
        </div>
      </Card>

      {/* 항목별 점수 */}
      <Card className="mb-6">
        <CardTitle>항목별 분석</CardTitle>
        <div className="mt-4 space-y-2">
          {result.item_analysis.filter((item) => !item.name.startsWith('KS_')).map((item) => (
            <div key={item.name} className="flex items-center gap-3 py-1">
              <span className="text-sm text-text w-28 flex-shrink-0">{item.name}</span>
              <div className="flex-1 h-4 bg-surface-dark rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    item.mean >= 3.2 ? 'bg-go' : item.mean >= 2.8 ? 'bg-cgo' : 'bg-nogo'
                  }`}
                  style={{ width: `${(item.mean / 4) * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium w-10 text-right">{item.mean.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* 코호트 분석 */}
      {result.cohort_analysis.length > 0 && (
        <Card className="mb-6">
          <CardTitle>코호트별 분석</CardTitle>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 text-left text-text-muted font-medium">코호트</th>
                  <th className="py-2 text-right text-text-muted font-medium">만족도</th>
                  <th className="py-2 text-right text-text-muted font-medium">구매의향</th>
                  <th className="py-2 text-right text-text-muted font-medium">추천의향</th>
                  <th className="py-2 text-right text-text-muted font-medium">N</th>
                </tr>
              </thead>
              <tbody>
                {result.cohort_analysis.map((c) => (
                  <tr key={c.skin_type} className="border-b border-border last:border-0">
                    <td className="py-2 font-medium">{c.skin_type}</td>
                    <td className="py-2 text-right">{c.satisfaction.toFixed(2)}</td>
                    <td className="py-2 text-right">{c.purchase.toFixed(2)}</td>
                    <td className="py-2 text-right">{c.recommend.toFixed(2)}</td>
                    <td className="py-2 text-right text-text-muted">{c.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 핵심 인사이트 */}
      <Card className="mb-8">
        <CardTitle>핵심 인사이트</CardTitle>
        <div className="mt-4 space-y-3">
          {result.core_usp && (
            <div className="p-3 rounded-lg bg-go-bg">
              <p className="text-xs text-go font-medium mb-1">핵심 강점 (USP)</p>
              <p className="text-sm text-text">{result.core_usp}</p>
            </div>
          )}
          {result.max_penalty && (
            <div className="p-3 rounded-lg bg-nogo-bg">
              <p className="text-xs text-nogo font-medium mb-1">최대 패널티</p>
              <p className="text-sm text-text">{result.max_penalty}</p>
            </div>
          )}
          {result.recommended_action && (
            <div className="p-3 rounded-lg bg-surface">
              <p className="text-xs text-navy font-medium mb-1">권장 조치</p>
              <p className="text-sm text-text">{result.recommended_action}</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
