"use client";

import Link from "next/link";
import { useTranslation } from "@/i18n/useTranslation";

const CI_ITEMS = [
  { l: "발림성", s: 3.82, w: 95 },
  { l: "흡수력", s: 3.64, w: 91 },
  { l: "수분감", s: 3.41, w: 85 },
  { l: "주름개선", s: 2.94, w: 73 },
];

const SCALE_LABELS = ["매우\n아니다", "아니다", "그렇다", "매우\n그렇다"];

export default function DemoBannerSection() {
  const { t } = useTranslation();
  return (
    <section id="demo" className="py-24 bg-surface">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-display-md text-navy mb-3">{t.demoBanner.title}</h2>
          <p className="text-text-muted">{t.demoBanner.subtitle}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">

          {/* ── Panel Demo Card ── */}
          <Link
            href="/demo/panel"
            className="group bg-white rounded-xl border border-border p-8 hover:border-gold/40 hover:shadow-lg transition-all"
          >
            {/* Survey UI mockup */}
            <div className="mb-5 rounded-xl border border-border bg-surface p-4">
              <p className="text-xs font-semibold text-text mb-3">발림성이 부드럽다고 느끼셨나요?</p>
              <div className="grid grid-cols-4 gap-1.5">
                {SCALE_LABELS.map((label, i) => (
                  <div
                    key={i}
                    className={`py-2.5 rounded-lg text-center text-[10px] border leading-tight whitespace-pre-line ${
                      i === 2
                        ? "bg-navy text-white border-navy font-semibold"
                        : "border-border text-text-muted"
                    }`}
                  >
                    <span className="block text-[9px] mb-0.5 opacity-60">{i + 1}</span>
                    {label}
                  </div>
                ))}
              </div>
              <div className="mt-2.5 flex items-center gap-1.5">
                <span className="text-[10px] px-1.5 py-0.5 bg-nogo-bg text-nogo rounded font-medium">KS 문항</span>
                <span className="text-[10px] text-text-muted">사용감 그룹 · 4점 척도</span>
              </div>
            </div>

            <div className="w-12 h-12 rounded-lg bg-navy/5 flex items-center justify-center mb-5 group-hover:bg-gold/10 transition-colors">
              <svg className="w-6 h-6 text-navy group-hover:text-gold transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-navy mb-2 group-hover:text-gold transition-colors">
              {t.demoBanner.panelTitle}
            </h3>
            <p className="text-sm text-text-muted leading-relaxed mb-6">
              {t.demoBanner.panelDesc}
            </p>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gold">
              {t.demoBanner.panelCta}
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </Link>

          {/* ── Dashboard Demo Card ── */}
          <Link
            href="/demo/dashboard"
            className="group bg-white rounded-xl border border-border p-8 hover:border-gold/40 hover:shadow-lg transition-all"
          >
            {/* CI bar chart mockup */}
            <div className="mb-5 rounded-xl border border-border bg-surface p-4">
              <p className="text-xs font-semibold text-text mb-3">핵심 강점 분석 (CI 95%)</p>
              {CI_ITEMS.map((item) => (
                <div key={item.l} className="flex items-center gap-2 mb-2 last:mb-0">
                  <span className="text-[11px] text-text-muted w-14 flex-shrink-0">{item.l}</span>
                  <div className="flex-1 h-2 bg-surface-dark rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.s >= 3.2 ? "bg-navy" : "bg-cgo"}`}
                      style={{ width: `${item.w}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-navy w-8 text-right flex-shrink-0">{item.s}</span>
                </div>
              ))}
            </div>

            <div className="w-12 h-12 rounded-lg bg-navy/5 flex items-center justify-center mb-5 group-hover:bg-gold/10 transition-colors">
              <svg className="w-6 h-6 text-navy group-hover:text-gold transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-navy mb-2 group-hover:text-gold transition-colors">
              {t.demoBanner.dashboardTitle}
            </h3>
            <p className="text-sm text-text-muted leading-relaxed mb-6">
              {t.demoBanner.dashboardDesc}
            </p>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gold">
              {t.demoBanner.dashboardCta}
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </Link>

        </div>
      </div>
    </section>
  );
}
