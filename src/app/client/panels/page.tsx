'use client'

import { useEffect, useState } from 'react'
import Card, { CardTitle } from '@/components/ui/Card'
import type { ClientPanelInfo } from '@/app/api/client/panels/route'

const SKIN_TYPE_LABELS: Record<string, string> = {
  dry: '건성',
  oily: '지성',
  combination: '복합성',
  normal: '중성',
  sensitive: '민감성',
  건성: '건성',
  지성: '지성',
  복합성: '복합성',
  중성: '중성',
  민감성: '민감성',
}

const GENDER_LABELS: Record<string, string> = {
  male: '남성',
  female: '여성',
  남성: '남성',
  여성: '여성',
}

export default function ClientPanelsPage() {
  const [panels, setPanels] = useState<ClientPanelInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/client/panels')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error)
        else setPanels(d.panels ?? [])
      })
      .catch(() => setError('데이터를 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">내 패널 목록</h1>
        <p className="text-sm text-text-muted mt-1">
          초대 링크 또는 카카오 알림톡을 통해 내 프로젝트에 참여한 패널입니다.
        </p>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <CardTitle>전체 패널</CardTitle>
          {!loading && (
            <span className="text-sm text-text-muted font-medium">{panels.length}명</span>
          )}
        </div>

        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="py-8 text-center text-sm text-nogo">{error}</div>
        ) : panels.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </div>
            <p className="text-sm text-text-muted">아직 등록된 패널이 없습니다.</p>
            <p className="text-xs text-text-muted mt-1">프로젝트에서 초대 링크를 공유하거나 카카오 알림톡을 발송해보세요.</p>
          </div>
        ) : (
          <>
            {/* 헤더 */}
            <div className="grid grid-cols-12 gap-3 px-3 pb-2 border-b border-border text-xs font-semibold text-text-muted uppercase tracking-wide">
              <div className="col-span-3">이름</div>
              <div className="col-span-2">성별·연령</div>
              <div className="col-span-2">피부 타입</div>
              <div className="col-span-3">피부 고민</div>
              <div className="col-span-1 text-center">응답</div>
              <div className="col-span-1 text-right">가입일</div>
            </div>

            <div className="divide-y divide-border">
              {panels.map((p) => (
                <div key={p.id} className="grid grid-cols-12 gap-3 px-3 py-3 items-center hover:bg-surface/40 transition-colors">
                  {/* 이름 */}
                  <div className="col-span-3">
                    <p className="text-sm font-medium text-text truncate">{p.name}</p>
                    {p.phone && (
                      <p className="text-xs text-text-muted mt-0.5 truncate">{p.phone}</p>
                    )}
                  </div>

                  {/* 성별·연령 */}
                  <div className="col-span-2">
                    <p className="text-sm text-text">
                      {p.gender ? GENDER_LABELS[p.gender] ?? p.gender : '—'}
                    </p>
                    {p.age_group && (
                      <p className="text-xs text-text-muted mt-0.5">{p.age_group}</p>
                    )}
                  </div>

                  {/* 피부 타입 */}
                  <div className="col-span-2">
                    {p.skin_type ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-navy/8 text-navy">
                        {SKIN_TYPE_LABELS[p.skin_type] ?? p.skin_type}
                      </span>
                    ) : (
                      <span className="text-sm text-text-muted">—</span>
                    )}
                  </div>

                  {/* 피부 고민 */}
                  <div className="col-span-3">
                    <p className="text-xs text-text-muted leading-snug line-clamp-2">
                      {p.skin_concern || '—'}
                    </p>
                  </div>

                  {/* 응답 횟수 */}
                  <div className="col-span-1 text-center">
                    <span className={`text-sm font-semibold ${p.response_count > 0 ? 'text-navy' : 'text-text-muted'}`}>
                      {p.response_count}회
                    </span>
                  </div>

                  {/* 가입일 */}
                  <div className="col-span-1 text-right">
                    <p className="text-xs text-text-muted">
                      {new Date(p.added_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
