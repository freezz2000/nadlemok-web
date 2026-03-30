"use client";

import { useState } from "react";

const TABS = ['판정 결과', 'Kill Signal', '항목별 분석', '코호트 분석'];

function TabVerdict() {
  return (
    <div className="space-y-4">
      {/* 판정 배너 */}
      <div className="p-6 rounded-xl bg-cgo-bg border-2 border-cgo">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-muted">최종 판정</p>
            <p className="text-3xl font-bold mt-1 text-cgo">CONDITIONAL GO</p>
            <p className="text-sm text-text mt-2">일부 개선 후 출시를 권장합니다.</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-text-muted">출시 성공 확률</p>
            <p className="text-4xl font-bold text-cgo">72%</p>
          </div>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '전반 만족도', value: '3.41', sub: '/ 4.00' },
          { label: '구매 의향', value: '3.12', sub: '/ 4.00' },
          { label: '추천 의향', value: '3.28', sub: '/ 4.00' },
          { label: '응답자', value: '42명', sub: '' },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-border p-4 shadow-sm">
            <p className="text-xs text-text-muted">{card.label}</p>
            <p className="text-2xl font-bold text-text">{card.value}</p>
            {card.sub && <p className="text-xs text-text-muted">{card.sub}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function TabKillSignal() {
  const signals = [
    { name: '자극', ratio: 0.04, level: 'safe' as const },
    { name: '끈적임', ratio: 0.18, level: 'danger' as const },
  ];
  const levelConfig = {
    safe: { bg: 'bg-go-bg', text: 'text-go', bar: 'bg-go', label: '양호' },
    warning: { bg: 'bg-cgo-bg', text: 'text-cgo', bar: 'bg-cgo', label: '주의' },
    danger: { bg: 'bg-nogo-bg', text: 'text-nogo', bar: 'bg-nogo', label: '위험' },
  };

  return (
    <div className="bg-white rounded-xl border border-border p-6 shadow-sm space-y-4">
      <p className="text-sm font-semibold text-text mb-2">Kill Signal 모니터</p>
      {signals.map((ks) => {
        const lc = levelConfig[ks.level];
        return (
          <div key={ks.name} className="flex items-center gap-3">
            <span className="text-sm text-text w-20">KS_{ks.name}</span>
            <div className="flex-1 h-6 bg-surface-dark rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${lc.bar}`}
                style={{ width: `${Math.min(ks.ratio * 100, 100)}%` }}
              />
            </div>
            <span className={`text-sm font-medium w-10 text-right ${lc.text}`}>
              {(ks.ratio * 100).toFixed(0)}%
            </span>
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${lc.text} ${lc.bg}`}>
              {lc.label}
            </span>
          </div>
        );
      })}
      <div className="mt-4 p-3 rounded-lg bg-surface text-xs text-text-muted">
        Kill Signal은 패널의 5% 이상 응답 시 주의, 10% 이상 시 위험으로 분류됩니다.
      </div>
    </div>
  );
}

function TabItems() {
  const items = [
    { name: '발림성', mean: 3.82 },
    { name: '흡수력', mean: 3.64 },
    { name: '수분감', mean: 3.41 },
    { name: '미백효과', mean: 3.18 },
    { name: '주름개선', mean: 2.94 },
    { name: '전반만족', mean: 3.41 },
    { name: '구매의향', mean: 3.12 },
    { name: '추천의향', mean: 3.28 },
  ];

  return (
    <div className="bg-white rounded-xl border border-border p-6 shadow-sm">
      <p className="text-sm font-semibold text-text mb-4">항목별 분석</p>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.name} className="flex items-center gap-3 py-1">
            <span className="text-sm text-text w-20 flex-shrink-0">{item.name}</span>
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
    </div>
  );
}

function TabCohort() {
  const cohorts = [
    { skin_type: '건성', satisfaction: 3.68, purchase: 3.45, recommend: 3.52, count: 14 },
    { skin_type: '복합성', satisfaction: 3.32, purchase: 3.08, recommend: 3.21, count: 18 },
    { skin_type: '지성', satisfaction: 3.21, purchase: 2.89, recommend: 3.02, count: 10 },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-border p-6 shadow-sm overflow-x-auto">
        <p className="text-sm font-semibold text-text mb-4">코호트별 분석</p>
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
            {cohorts.map((c) => (
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

      {/* 핵심 인사이트 */}
      <div className="bg-white rounded-xl border border-border p-6 shadow-sm">
        <p className="text-sm font-semibold text-text mb-4">핵심 인사이트</p>
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-go-bg">
            <p className="text-xs text-go font-medium mb-1">핵심 강점 (USP)</p>
            <p className="text-sm text-text">발림성과 흡수력이 우수하며 건성 피부 코호트에서 높은 만족도를 보임</p>
          </div>
          <div className="p-3 rounded-lg bg-nogo-bg">
            <p className="text-xs text-nogo font-medium mb-1">최대 패널티</p>
            <p className="text-sm text-text">KS_끈적임 18%로 지성 피부 패널에서 No-Go 임계값 초과</p>
          </div>
          <div className="p-3 rounded-lg bg-surface">
            <p className="text-xs text-navy font-medium mb-1">권장 조치</p>
            <p className="text-sm text-text">지성 피부 대상 제형 개선 후 재검증 권장</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const TAB_COMPONENTS = [TabVerdict, TabKillSignal, TabItems, TabCohort];

export default function DemoDashboardSection() {
  const [active, setActive] = useState(0);
  const Panel = TAB_COMPONENTS[active];

  return (
    <section id="demo-dashboard" className="py-24 bg-white">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-navy mb-3">고객 결과 대시보드 체험</h2>
          <p className="text-text-muted">실제 분석 완료 후 고객에게 제공되는 결과 화면입니다.</p>
        </div>

        {/* 탭 */}
        <div className="flex flex-wrap gap-2 mb-8">
          {TABS.map((tab, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                active === i ? 'bg-navy text-white' : 'bg-surface text-text-muted hover:bg-surface-dark'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* 탭 콘텐츠 */}
        <Panel />
      </div>
    </section>
  );
}
