"use client";

// ── 판정별 스타일 ──────────────────────────────────────────────
const VC = {
  bg: 'bg-cgo', border: 'border-cgo', text: 'text-cgo', lightBg: 'bg-cgo-bg',
  label: 'Conditional GO',
  desc: '연구소 피드백 전달. 특정 요인 수정 후 2차 샘플 재검증.',
}

// ── 신호등 ───────────────────────────────────────────────────
function TrafficLight() {
  return (
    <div className="flex flex-col items-center gap-2 bg-gray-800 rounded-2xl px-4 py-5 shadow-lg w-16">
      <div className="w-9 h-9 rounded-full bg-gray-600" />
      <div className="w-9 h-9 rounded-full bg-cgo shadow-[0_0_12px_4px] shadow-cgo/60" />
      <div className="w-9 h-9 rounded-full bg-gray-600" />
    </div>
  )
}

// ── CI 도트 차트 ──────────────────────────────────────────────
function CiDotChart({
  items,
  threshold = 3.0,
}: {
  items: { label: string; mean: number; ci_lower: number; ci_upper: number }[]
  threshold?: number
}) {
  const maxVal = 4.0
  const toPercent = (v: number) => Math.max(0, Math.min(100, ((v - 1) / (maxVal - 1)) * 100))
  const thresholdPct = toPercent(threshold)

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.label}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm text-text w-48 flex-shrink-0 leading-snug">{item.label}</span>
            <div className="flex-1 relative h-7">
              <div className="absolute inset-y-2.5 left-0 right-0 bg-surface-dark rounded-full" />
              <div
                className="absolute inset-y-3 rounded-full bg-navy/25"
                style={{ left: `${toPercent(item.ci_lower)}%`, right: `${100 - toPercent(item.ci_upper)}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-navy border-2 border-white shadow-sm z-10"
                style={{ left: `calc(${toPercent(item.mean)}% - 8px)` }}
              />
              <div className="absolute inset-y-0 w-px bg-cgo/70 z-20" style={{ left: `${thresholdPct}%` }} />
            </div>
            <div className="text-right flex-shrink-0 w-28">
              <span className="text-sm font-bold text-navy">{item.mean.toFixed(2)}</span>
              <span className="text-xs text-text-muted ml-1">
                [{item.ci_lower.toFixed(2)}~{item.ci_upper.toFixed(2)}]
              </span>
            </div>
          </div>
        </div>
      ))}
      <div className="flex items-center gap-2 mt-1">
        <div className="w-48 flex-shrink-0" />
        <div className="flex-1 flex justify-between text-xs text-text-muted px-0.5">
          <span>1.0</span><span>2.0</span>
          <span className="text-cgo font-medium">기준({threshold.toFixed(1)})</span>
          <span>3.5</span><span>4.0</span>
        </div>
        <div className="w-28 flex-shrink-0" />
      </div>
    </div>
  )
}

// ── Driver Bar ────────────────────────────────────────────────
function DriverBar({ label, r, rank }: { label: string; r: number; rank: number }) {
  const pct = Math.abs(r) * 100 * 5
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-xs text-text-muted w-5 flex-shrink-0">{rank}순위</span>
      <span className="text-sm text-text flex-1 leading-snug">{label}</span>
      <div className="w-36 h-6 bg-surface-dark rounded-sm overflow-hidden flex-shrink-0">
        <div className="h-full bg-navy rounded-sm" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className="text-sm font-semibold text-navy w-16 text-right flex-shrink-0">r = {r.toFixed(3)}</span>
    </div>
  )
}

// ── KS 배지 ──────────────────────────────────────────────────
function KsBadge({ level }: { level: 'safe' | 'warning' | 'danger' }) {
  const map = {
    safe:    { bg: 'bg-go-bg',   text: 'text-go',   label: 'Pass',    icon: '✓' },
    warning: { bg: 'bg-cgo-bg',  text: 'text-cgo',  label: 'Warning', icon: '⚠' },
    danger:  { bg: 'bg-nogo-bg', text: 'text-nogo',  label: 'Fail',    icon: '✕' },
  }
  const { bg, text, label, icon } = map[level]
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${bg} ${text}`}>
      <span className="mr-1">{icon}</span>{label}
    </span>
  )
}

// ── 섹션 헤더 ────────────────────────────────────────────────
function SectionTitle({ step, title, sub }: { step: string; title: string; sub?: string }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-semibold text-text-muted uppercase tracking-widest">{step}</span>
      </div>
      <h2 className="text-xl font-bold text-text">{title}</h2>
      {sub && <p className="text-sm text-text-muted mt-0.5">{sub}</p>}
    </div>
  )
}

// ── 콜아웃 ───────────────────────────────────────────────────
function Callout({ icon, children, variant = 'info' }: {
  icon?: string; children: React.ReactNode; variant?: 'info' | 'warning' | 'success'
}) {
  const styles = {
    info:    'bg-navy/5 border-navy/20 text-navy',
    warning: 'bg-cgo-bg border-cgo/30 text-cgo',
    success: 'bg-go-bg border-go/30 text-go',
  }
  return (
    <div className={`flex items-start gap-2.5 p-3.5 rounded-xl border text-sm mt-4 ${styles[variant]}`}>
      {icon && <span className="flex-shrink-0 mt-0.5">{icon}</span>}
      <p>{children}</p>
    </div>
  )
}

// ── 데모 정적 데이터 ──────────────────────────────────────────
const DEMO = {
  productName: '모이스처 크림 (시제품 v2)',
  n: 42,
  satThreshold: 3.0,
  satMean: 3.41,
  recTop2Pct: 71,
  purchaseMean: 3.12,
  successProb: 72,
  coreUsp: '발림성·흡수력이 압도적으로 우수하며 건성·복합성 피부 코호트에서 높은 만족도 기록',
  maxPenalty: 'KS_끈적임 18% — 지성 피부 기준 Fail 판정. 제형 개선 전 지성 피부 출시 불가',
  recommendedAction: '지성 피부 대상 오일 성분 저감 처방 조정 후 2차 재검증 진행',

  killSignals: [
    { name: 'KS_자극', label: '자극·홍조', ratio: 0.04, ci_lower: 0.009, ci_upper: 0.099, level: 'safe' as 'safe' | 'warning' | 'danger', comment: '허용 범위 내' },
    { name: 'KS_끈적임', label: '끈적임·번들거림', ratio: 0.18, ci_lower: 0.107, ci_upper: 0.275, level: 'danger' as 'safe' | 'warning' | 'danger', comment: '즉시 처방 수정 필요. 지성 피부 대량 클레임 유발 위험.' },
  ],

  strengths: [
    { label: '발림성', mean: 3.82, ci_lower: 3.61, ci_upper: 4.00 },
    { label: '흡수력', mean: 3.64, ci_lower: 3.44, ci_upper: 3.84 },
    { label: '수분감 지속', mean: 3.41, ci_lower: 3.22, ci_upper: 3.60 },
  ],

  weaknesses: [
    { label: '주름 개선', mean: 2.94, ci_lower: 2.71, ci_upper: 3.17 },
    { label: '미백 효과', mean: 3.18, ci_lower: 2.95, ci_upper: 3.41 },
  ],

  drivers: [
    { label: '발림성', r: 0.821, rank: 1 },
    { label: '흡수력', r: 0.745, rank: 2 },
    { label: '수분감 지속', r: 0.623, rank: 3 },
  ],

  cohorts: [
    { skin_type: '건성', satisfaction: 3.68, purchase: 3.45, recommend: 3.52, count: 14 },
    { skin_type: '복합성', satisfaction: 3.32, purchase: 3.08, recommend: 3.21, count: 18 },
    { skin_type: '지성', satisfaction: 3.21, purchase: 2.89, recommend: 3.02, count: 10 },
  ],

  ageCohort: {
    group_a_label: '20~30대', group_a_mean: 3.48,
    group_b_label: '40대 이상', group_b_mean: 3.35,
    is_significant: false, p_value: 0.214,
    insight: 'p=0.214로 통계적으로 유의미한 연령 차이 없음. 20~40대 전 연령층에 동일하게 소구 가능한 제품으로 확인.',
  },

  rdGuide: {
    dont: [
      '오일 성분 비율을 현 수준보다 높이지 말 것 — 지성 피부 끈적임 악화',
      '점도 증가 목적의 증점제 추가 지양 — 흡수력(1위 기여 요인) 저하 위험',
    ],
    do: [
      '휘발성 실리콘(Cyclomethicone) 비율 조정으로 지성 피부 끈적임 저감',
      '나이아신아마이드 2→3% 상향으로 미백 효과 강화 (약점 항목 개선)',
    ],
  },

  marketing: {
    targeting: '건성·복합성 피부 25~45세 여성. 발림성·수분 지속에 민감한 스킨케어 관심군.',
    channel: '인스타그램 뷰티 인플루언서 협업 및 유튜브 스킨케어 루틴 콘텐츠 집중 배포',
    message: '흡수되는 순간, 촉촉함이 하루 종일 지속됩니다.',
  },

  nextSteps: [
    { step: 1, title: '처방 수정', description: '오일·증점제 조정. KS_끈적임 목표 5% 미만으로 저감' },
    { step: 2, title: '2차 재검증', description: '지성 피부 중심 패널 20명 추가 집중 검증' },
    { step: 3, title: '최종 GO 판정', description: 'KS Pass 확인 후 마케팅 및 양산 일정 확정' },
  ],
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────
export default function DemoDashboardSection({ hideHeader }: { hideHeader?: boolean } = {}) {
  return (
    <section id="demo-dashboard" className={hideHeader ? 'py-4' : 'py-24 bg-surface'}>
      <div className="max-w-4xl mx-auto px-6">

        {/* 섹션 제목 */}
        {!hideHeader && (
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-navy mb-3">고객 대시보드 체험(분석결과)</h2>
            <p className="text-text-muted">실제 분석 완료 후 고객에게 제공되는 결과 화면입니다.</p>
          </div>
        )}

        {/* ── 보고서 헤더 ── */}
        <div className="mb-8">
          <p className="text-xs text-text-muted uppercase tracking-widest mb-1">관능 테스트 및 의사결정 진단 리포트</p>
          <h1 className="text-3xl font-bold text-text">{DEMO.productName}</h1>
          <p className="text-sm text-text-muted mt-1">
            나들목 관능 평가 인증 시스템 · N={DEMO.n} · 4점 척도 시스템
          </p>
        </div>

        {/* ════ 섹션 1: 최종 판정 ════ */}
        <div className={`rounded-2xl border-2 ${VC.border} ${VC.lightBg} p-6 mb-6`}>
          <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-4">최종 진단 결과</p>
          <div className="flex items-start gap-6">
            <TrafficLight />
            <div className="flex-1">
              <p className={`text-4xl font-black tracking-tight ${VC.text}`}>{VC.label}</p>
              <p className="text-sm text-text mt-2 leading-relaxed">{VC.desc}</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                {[
                  { label: '종합 만족도', value: DEMO.satMean.toFixed(2), sub: '/ 4점 만점' },
                  { label: '주변 추천 의향', value: `${DEMO.recTop2Pct}%`, sub: 'Top-2 Box' },
                  { label: '구매 의향', value: DEMO.purchaseMean.toFixed(2), sub: '/ 4점 만점' },
                  { label: '출시 성공 확률', value: `${DEMO.successProb}%`, sub: '종합 모델' },
                ].map((card) => (
                  <div key={card.label} className="bg-white/70 rounded-xl p-3 text-center">
                    <p className="text-xs text-text-muted mb-0.5">{card.label}</p>
                    <p className={`text-2xl font-black ${VC.text}`}>{card.value}</p>
                    <p className="text-xs text-text-muted">{card.sub}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <div className="flex-1 min-w-0 bg-go-bg rounded-lg px-3 py-2">
                  <p className="text-xs text-go font-semibold mb-0.5">시장 진입 타당성</p>
                  <p className="text-sm text-text leading-snug">{DEMO.coreUsp}</p>
                </div>
                <div className="flex-1 min-w-0 bg-nogo-bg rounded-lg px-3 py-2 border border-nogo/20">
                  <p className="text-xs text-nogo font-semibold mb-0.5">핵심 리스크</p>
                  <p className="text-sm text-text leading-snug">{DEMO.maxPenalty}</p>
                </div>
                <div className="flex-1 min-w-0 bg-surface rounded-lg px-3 py-2 border border-border">
                  <p className="text-xs text-navy font-semibold mb-0.5">Next Step</p>
                  <p className="text-sm text-text leading-snug">{DEMO.recommendedAction}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ════ 섹션 2: Kill Signal ════ */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 mb-6">
          <SectionTitle
            step="1단계 · Kill Signal 검증"
            title="치명적 결함 검증: 제형 충돌 리스크 점검"
            sub="발생률 5% 이상 → Warning / 10% 초과 → Fail"
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2.5 text-left text-xs font-semibold text-text-muted uppercase">항목</th>
                  <th className="py-2.5 text-center text-xs font-semibold text-text-muted uppercase">발생률</th>
                  <th className="py-2.5 text-center text-xs font-semibold text-text-muted uppercase">95% CI</th>
                  <th className="py-2.5 text-center text-xs font-semibold text-text-muted uppercase">판정</th>
                  <th className="py-2.5 text-left text-xs font-semibold text-text-muted uppercase pl-4">코멘트</th>
                </tr>
              </thead>
              <tbody>
                {DEMO.killSignals.map((ks) => (
                  <tr key={ks.name} className={`border-b border-border/50 last:border-0 ${
                    ks.level === 'danger' ? 'bg-nogo-bg/50' : ks.level === 'warning' ? 'bg-cgo-bg/50' : ''
                  }`}>
                    <td className="py-3 font-medium text-text">
                      {ks.level !== 'safe' && <span className="mr-2">{ks.level === 'danger' ? '🚨' : '⚠️'}</span>}
                      {ks.label}
                    </td>
                    <td className="py-3 text-center">
                      <span className={`font-bold text-base ${
                        ks.level === 'danger' ? 'text-nogo' : ks.level === 'warning' ? 'text-cgo' : 'text-text'
                      }`}>{(ks.ratio * 100).toFixed(1)}%</span>
                    </td>
                    <td className="py-3 text-center text-xs text-text-muted">
                      [{(ks.ci_lower * 100).toFixed(1)}% ~ {(ks.ci_upper * 100).toFixed(1)}%]
                    </td>
                    <td className="py-3 text-center"><KsBadge level={ks.level} /></td>
                    <td className="py-3 pl-4 text-text-muted text-xs leading-snug">{ks.comment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ════ 섹션 3: 핵심 강점 CI ════ */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 mb-6">
          <SectionTitle
            step="2단계 · CI 검증"
            title="통계가 입증한 핵심 경쟁력"
            sub="최하한 신뢰구간(Lower bound)도 만족 임계점 이상 → 타겟 고객 전체가 확실하게 체감"
          />
          <CiDotChart items={DEMO.strengths} threshold={DEMO.satThreshold} />
          <Callout icon="💡" variant="success">
            최하한 신뢰구간(Lower bound)도 모두 {DEMO.satThreshold.toFixed(1)}점 이상을 기록했습니다.
            이는 소수의 의견이 아닌, 타겟 고객 전체가 확실하게 체감하는 본 제품의 압도적 강점임을 증명합니다.
          </Callout>
        </div>

        {/* ════ 섹션 4: 구조적 약점 CI ════ */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 mb-6">
          <SectionTitle
            step="2단계 · CI 검증 (계속)"
            title="구조적 한계 및 R&D 개선 과제"
            sub="하한선이 만족 임계점 미달 → 개인 취향 차이가 아닌, 제형 밸런스 붕괴로 인한 구조적 약점"
          />
          <CiDotChart items={DEMO.weaknesses} threshold={DEMO.satThreshold} />
          <Callout icon="⚠" variant="warning">
            하한선이 {DEMO.satThreshold.toFixed(1)}점 미만까지 하락하며 응답자 간 평가 편차가 매우 큽니다.
            단순한 개인 취향 차이가 아닌, 제형 밸런스 붕괴로 인한 구조적인 약점임을 통계적으로 의미합니다.
          </Callout>
        </div>

        {/* ════ 섹션 5: Key Drivers ════ */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 mb-6">
          <SectionTitle
            step="3단계 · 피어슨 상관관계 분석"
            title="종합 만족도를 결정짓는 핵심 기여 요인"
            sub="'무엇이 좋아 보이는가'가 아닌 '실제 구매를 움직이는가'를 발굴"
          />
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold text-text-muted mb-3 uppercase tracking-wide">Contribution Bar Graph</p>
              <div className="space-y-1">
                {DEMO.drivers.map((d) => (
                  <DriverBar key={d.label} label={d.label} r={d.r} rank={d.rank} />
                ))}
              </div>
              <p className="text-xs text-text-muted mt-2">Pearson Correlation coefficient (r)</p>
            </div>
            <div className={`rounded-xl p-4 border ${VC.lightBg} ${VC.border}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">⚙️</span>
                <p className="text-sm font-bold text-text">R&D 전략적 가이드</p>
              </div>
              <p className="text-sm text-text-muted leading-relaxed">
                고객의 최종 만족도는 상위 기여 요인에서 결정됩니다.<br />
                따라서 구조적 약점으로 지적된 항목을 개선하기 위한 처방 변경 시,
                핵심 기여 요인의 경쟁력을 절대 훼손하지 않아야 합니다.
              </p>
              {DEMO.drivers.slice(0, 1).map((d) => (
                <div key={d.label} className="mt-2 text-xs text-text-muted">
                  • <strong className="text-text">{d.label}</strong>이 1위 기여 요인
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ════ 섹션 6: 코호트 분석 ════ */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 mb-6">
          <SectionTitle
            step="4단계 · 코호트별 심층 분석"
            title="타겟 세분화 및 타겟팅 확장성 검증"
            sub="전체 평균 뒤에 숨어 있는 특정 타겟층만의 동인 파악"
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2.5 text-left text-xs font-semibold text-text-muted">코호트</th>
                  <th className="py-2.5 text-right text-xs font-semibold text-text-muted">만족도</th>
                  <th className="py-2.5 text-right text-xs font-semibold text-text-muted">구매의향</th>
                  <th className="py-2.5 text-right text-xs font-semibold text-text-muted">추천의향</th>
                  <th className="py-2.5 text-right text-xs font-semibold text-text-muted">N</th>
                </tr>
              </thead>
              <tbody>
                {DEMO.cohorts.map((c) => {
                  const isTop = c.satisfaction === Math.max(...DEMO.cohorts.map((x) => x.satisfaction))
                  return (
                    <tr key={c.skin_type} className="border-b border-border/50 last:border-0 hover:bg-surface/40 transition-colors">
                      <td className="py-2.5 font-medium text-text flex items-center gap-1.5">
                        {isTop && <span className="text-go text-xs">●</span>}
                        {c.skin_type}
                      </td>
                      <td className={`py-2.5 text-right font-semibold ${c.satisfaction >= DEMO.satThreshold ? 'text-go' : 'text-cgo'}`}>
                        {c.satisfaction.toFixed(2)}
                      </td>
                      <td className={`py-2.5 text-right ${c.purchase >= DEMO.satThreshold ? 'text-go' : 'text-cgo'}`}>
                        {c.purchase.toFixed(2)}
                      </td>
                      <td className={`py-2.5 text-right ${c.recommend >= DEMO.satThreshold ? 'text-go' : 'text-cgo'}`}>
                        {c.recommend.toFixed(2)}
                      </td>
                      <td className="py-2.5 text-right text-text-muted">{c.count}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* 연령대 T-test */}
          <div className="mt-5 pt-5 border-t border-border">
            <p className="text-sm font-semibold text-text mb-3">연령대별 타겟팅 확장성 검증 (Welch's T-test)</p>
            <div className="flex items-center gap-4">
              <div className="flex-1 text-center p-3 bg-surface rounded-xl">
                <p className="text-xs text-text-muted">{DEMO.ageCohort.group_a_label}</p>
                <p className="text-2xl font-bold text-navy">{DEMO.ageCohort.group_a_mean.toFixed(2)}점</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-text">
                  통계적 유의미한 차이 {DEMO.ageCohort.is_significant ? '있음' : '없음'}
                </p>
                <p className="text-xs text-text-muted">(p-value = {DEMO.ageCohort.p_value.toFixed(3)})</p>
              </div>
              <div className="flex-1 text-center p-3 bg-surface rounded-xl">
                <p className="text-xs text-text-muted">{DEMO.ageCohort.group_b_label}</p>
                <p className="text-2xl font-bold text-navy">{DEMO.ageCohort.group_b_mean.toFixed(2)}점</p>
              </div>
            </div>
            <Callout icon="📢" variant="info">{DEMO.ageCohort.insight}</Callout>
          </div>
        </div>

        {/* ════ 섹션 7: R&D 가이드 ════ */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 mb-6">
          <SectionTitle
            step="6단계 · 페널티 분석"
            title="R&D 및 제조사 즉각 처방 수정 지침"
            sub="핵심 강점 유지, 구조적 약점 개선, Kill Signal 완벽 제거"
          />
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border-2 border-nogo/30 bg-nogo-bg/50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-7 h-7 rounded-full bg-nogo text-white flex items-center justify-center text-sm font-bold flex-shrink-0">✕</span>
                <p className="font-bold text-nogo">[DON'T] 절대 지양 사항</p>
              </div>
              <ul className="space-y-2">
                {DEMO.rdGuide.dont.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-text">
                    <span className="text-nogo mt-0.5 flex-shrink-0">•</span>{item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border-2 border-go/30 bg-go-bg/50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-7 h-7 rounded-full bg-go text-white flex items-center justify-center text-sm font-bold flex-shrink-0">✓</span>
                <p className="font-bold text-go">[DO] 세부 요청 사항</p>
              </div>
              <ul className="space-y-2">
                {DEMO.rdGuide.do.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-text">
                    <span className="text-go mt-0.5 flex-shrink-0">•</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* ════ 섹션 8: 마케팅 가이드 ════ */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 mb-6">
          <SectionTitle step="마케팅 가이드" title="마케팅 및 세일즈 커뮤니케이션 기획 가이드" />
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-surface rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">👤</span>
                <p className="text-sm font-bold text-text">타겟팅 전략</p>
              </div>
              <p className="text-sm text-text-muted leading-relaxed">{DEMO.marketing.targeting}</p>
            </div>
            <div className="bg-surface rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">📱</span>
                <p className="text-sm font-bold text-text">매체 전략</p>
              </div>
              <p className="text-sm text-text-muted leading-relaxed">{DEMO.marketing.channel}</p>
            </div>
            <div className="md:col-span-2 bg-navy/5 border border-navy/15 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">💬</span>
                <p className="text-sm font-bold text-navy">핵심 카피 방향</p>
              </div>
              <p className="text-sm text-navy/80 leading-relaxed italic">"{DEMO.marketing.message}"</p>
            </div>
          </div>
        </div>

        {/* ════ 섹션 9: Next Steps ════ */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 mb-6">
          <SectionTitle step="9단계 · 종합 판정" title="향후 프로젝트 로드맵 (Next Steps)" />
          <div className="flex items-start gap-0 overflow-x-auto">
            {DEMO.nextSteps.map((s, i) => (
              <div key={s.step} className="flex items-start flex-shrink-0">
                <div className="bg-surface border border-border rounded-xl p-4 w-52">
                  <div className="w-8 h-8 rounded-full bg-navy text-white text-sm font-bold flex items-center justify-center mb-2">
                    {s.step}
                  </div>
                  <p className="text-sm font-bold text-text mb-1">{s.title}</p>
                  <p className="text-xs text-text-muted leading-snug">{s.description}</p>
                </div>
                {i < DEMO.nextSteps.length - 1 && (
                  <div className="flex items-center mt-8 flex-shrink-0">
                    <div className="w-8 h-px bg-navy/30" />
                    <svg className="w-3 h-3 text-navy/50" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M7.293 4.707L13.586 11l-6.293 6.293 1.414 1.414L16.414 11 8.707 3.293z" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── 푸터 ── */}
        <div className="text-center text-xs text-text-muted mt-8 pt-6 border-t border-border">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="font-semibold text-navy">나들목(Nadlemok) 관능 평가 인증 시스템</span>
          </div>
          <p>본 리포트는 N={DEMO.n}명의 관능 평가 데이터를 기반으로 자동 생성되었습니다.</p>
          <p className="mt-0.5 text-navy/60 font-medium">※ 이 화면은 데모용 샘플 데이터입니다.</p>
        </div>

      </div>
    </section>
  )
}
