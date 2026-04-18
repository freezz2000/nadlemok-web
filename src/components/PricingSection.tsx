"use client";

import Link from "next/link";
import { useTranslation } from "@/i18n/useTranslation";

export default function PricingSection() {
  const { t } = useTranslation();

  const rows = [
    { label: "패널",     key: "panel"    },
    { label: "분석",     key: "analysis" },
    { label: "운영대행료", key: "fee"    },
    { label: "추천 대상", key: "target"  },
  ] as const;

  return (
    <section id="pricing" className="py-24 bg-surface">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-navy text-center mb-16">
          {t.pricing.title}
        </h2>

        {/* ── 플랜 카드 2개 ── */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-6">
          {t.pricing.plans.map((plan, i) => (
            <div
              key={i}
              className={`relative rounded-xl p-8 border transition-all ${
                plan.recommended
                  ? "bg-navy text-white border-navy ring-2 ring-gold"
                  : "bg-white text-text border-border"
              }`}
            >
              {plan.recommended && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gold text-navy text-xs font-bold rounded-full whitespace-nowrap">
                  ★ 소비자 검증 추천
                </span>
              )}

              {/* 플랜명 + 가격 */}
              <div className="text-center mb-6">
                <h3 className={`text-lg font-bold mb-2 ${plan.recommended ? "text-white" : "text-navy"}`}>
                  {plan.name}
                </h3>
                <div className={`text-3xl font-bold ${plan.recommended ? "text-gold" : "text-navy"}`}>
                  {plan.price}
                  <span className={`text-sm font-normal ml-1 ${plan.recommended ? "text-white/60" : "text-text-muted"}`}>
                    {plan.unit}
                  </span>
                </div>
              </div>

              {/* 항목 리스트 */}
              <div className="space-y-3 mb-6">
                {rows.map(({ label, key }) => (
                  <div key={key} className="flex justify-between items-start text-sm gap-4">
                    <span className={`flex-shrink-0 ${plan.recommended ? "text-white/60" : "text-text-muted"}`}>
                      {label}
                    </span>
                    <span className={`font-medium text-right ${plan.recommended ? "text-white" : "text-navy"}`}>
                      {plan[key]}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA 버튼 */}
              <Link
                href="/register"
                className={`block text-center py-3 rounded-lg text-sm font-medium transition-colors ${
                  plan.recommended
                    ? "bg-gold text-navy hover:bg-yellow-300"
                    : "bg-navy/5 text-navy hover:bg-navy/10"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* ── 부가 옵션 ── */}
        <div className="max-w-3xl mx-auto mb-8">
          <div className="rounded-xl border border-border bg-white px-6 py-4">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-3">
              {t.pricing.addonTitle}
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              {t.pricing.addons.map((addon, i) => (
                <div key={i} className="flex items-center gap-4 flex-1">
                  <span className="w-7 h-7 rounded-full bg-navy/5 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3.5 h-3.5 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </span>
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-text">{addon.name}</span>
                    <span className="text-sm text-text-muted ml-2">— {addon.desc}</span>
                  </div>
                  <span className="text-sm font-bold text-navy whitespace-nowrap">{addon.price}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── 하단 주석 ── */}
        <p className="text-center text-sm text-text-muted max-w-2xl mx-auto">
          {t.pricing.pilot}
        </p>
      </div>
    </section>
  );
}
