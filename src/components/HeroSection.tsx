"use client";

import Link from "next/link";
import { useTranslation } from "@/i18n/useTranslation";

const KS_ITEMS: Array<{ l: string; p: number; lv: "safe" | "danger" | "warning" }> = [
  { l: "자극감", p: 4, lv: "safe" },
  { l: "끈적임", p: 18, lv: "danger" },
  { l: "원료취", p: 7, lv: "warning" },
];

const METRICS = [
  { l: "전반 만족도", v: "3.41" },
  { l: "구매 의향", v: "3.12" },
  { l: "추천 의향", v: "3.28" },
];

export default function HeroSection() {
  const { t } = useTranslation();

  return (
    <section className="relative bg-navy overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy-light to-navy-dark opacity-90" />
      <div className="absolute top-20 right-20 w-96 h-96 rounded-full bg-gold/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-72 h-72 rounded-full bg-gold/5 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-1/3 w-56 h-56 rounded-full bg-gold/[0.03] blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 md:py-32">
        <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* ── Left column: text + CTA ── */}
          <div>
            <div className="flex flex-wrap gap-3 mb-8">
              <span className="px-3 py-1 text-xs rounded-full bg-white/10 text-gold border border-gold/30">
                {t.hero.badge1}
              </span>
              <span className="px-3 py-1 text-xs rounded-full bg-white/10 text-white/70 border border-white/20">
                {t.hero.badge2}
              </span>
            </div>

            <h1 className="text-display-lg text-white leading-tight mb-6 whitespace-pre-line">
              {t.hero.headline}
            </h1>

            <p className="text-lg text-white/70 leading-relaxed mb-10 max-w-xl whitespace-pre-line">
              {t.hero.description}
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-4">
              <Link
                href="/register"
                className="px-8 py-4 bg-gold text-navy font-semibold rounded-full hover:bg-gold-light transition-colors text-base"
              >
                {t.hero.cta}
              </Link>
              <span className="text-sm text-white/50 self-center">
                {t.hero.ctaSub}
              </span>
            </div>
          </div>

          {/* ── Right column: analysis result dashboard card ── */}
          <div className="flex justify-center md:justify-end">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-[0_32px_80px_rgba(0,0,0,0.35)] overflow-hidden">

              {/* Browser chrome */}
              <div className="flex items-center gap-1.5 px-4 py-3 bg-navy-dark border-b border-white/10">
                <div className="w-2.5 h-2.5 rounded-full bg-nogo/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-gold/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-go/70" />
                <span className="ml-3 text-[10px] text-white/40 font-mono">분석 결과 — 모이스처 크림</span>
              </div>

              {/* CONDITIONAL GO verdict */}
              <div className="px-5 py-4 bg-cgo-bg border-b border-cgo/20 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-text-muted uppercase tracking-widest mb-0.5">최종 판정</p>
                  <p className="text-xl font-black text-cgo">CONDITIONAL GO</p>
                  <p className="text-xs text-text-muted mt-0.5">조건부 출시 가능</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-text-muted">성공 확률</p>
                  <p className="text-3xl font-black text-cgo">72%</p>
                  <p className="text-[10px] text-text-muted">응답자 42명</p>
                </div>
              </div>

              {/* Kill Signal bars */}
              <div className="px-5 py-3.5 border-b border-border">
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-widest mb-2.5">Kill Signal 모니터</p>
                {KS_ITEMS.map((ks) => (
                  <div key={ks.l} className="mb-2 last:mb-0">
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-text">{ks.l}</span>
                      <span className={
                        ks.lv === "danger" ? "text-nogo font-semibold" :
                        ks.lv === "warning" ? "text-cgo font-semibold" :
                        "text-go font-semibold"
                      }>
                        {ks.p}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-dark rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          ks.lv === "danger" ? "bg-nogo" :
                          ks.lv === "warning" ? "bg-cgo" :
                          "bg-go"
                        }`}
                        style={{ width: `${Math.min(ks.p * 4, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Core metrics 3-col */}
              <div className="px-5 py-3.5 grid grid-cols-3 gap-2">
                {METRICS.map((s) => (
                  <div key={s.l} className="bg-surface rounded-lg p-2.5 text-center">
                    <p className="text-[9px] text-text-muted mb-1">{s.l}</p>
                    <p className="text-base font-black text-navy">{s.v}</p>
                    <p className="text-[9px] text-text-muted">/ 4.0</p>
                  </div>
                ))}
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
