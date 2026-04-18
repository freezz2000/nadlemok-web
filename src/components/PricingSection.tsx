"use client";

import Link from "next/link";
import { useTranslation } from "@/i18n/useTranslation";

export default function PricingSection() {
  const { t } = useTranslation();
  const { basic, credits } = t.pricing;

  return (
    <section id="pricing" className="py-24 bg-surface">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-navy text-center mb-16">
          {t.pricing.title}
        </h2>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-6">

          {/* ── Basic 카드 ── */}
          <div className="rounded-xl border border-border bg-white p-8 flex flex-col">
            <div className="mb-6">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-1">내부 패널</p>
              <h3 className="text-xl font-bold text-navy">{basic.name}</h3>
              <div className="mt-3">
                <span className="text-4xl font-black text-navy">{basic.price}</span>
                <span className="text-sm text-text-muted ml-2">{basic.unit}</span>
              </div>
            </div>

            <ul className="space-y-2.5 mb-6 flex-1">
              {basic.features.map((f: string, i: number) => (
                <li key={i} className="flex items-center gap-2.5 text-sm text-text">
                  <svg className="w-4 h-4 text-go flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>

            <p className="text-xs text-text-muted mb-4">{basic.target}</p>
            <Link
              href="/register"
              className="block text-center py-3 rounded-lg text-sm font-medium bg-navy/5 text-navy hover:bg-navy/10 transition-colors"
            >
              {basic.cta}
            </Link>
          </div>

          {/* ── 외부 패널 크레딧 카드 ── */}
          <div className="rounded-xl border-2 border-navy bg-navy p-8 flex flex-col">
            <div className="mb-6">
              <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-1">외부 패널</p>
              <h3 className="text-xl font-bold text-white">{credits.title}</h3>
              <p className="text-sm text-white/60 mt-1">{credits.subtitle}</p>
            </div>

            {/* 크레딧 패키지 2종 */}
            <div className="space-y-3 mb-5 flex-1">
              {credits.packages.map((pkg: {
                credits: number; price: string; perCredit: string;
                label: string; saving?: string; recommended: boolean;
              }, i: number) => (
                <div
                  key={i}
                  className={`rounded-xl p-4 border transition-all ${
                    pkg.recommended
                      ? "bg-gold/20 border-gold/50"
                      : "bg-white/10 border-white/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-white">{pkg.credits}크레딧</span>
                        {pkg.recommended && (
                          <span className="text-xs px-2 py-0.5 bg-gold text-navy font-bold rounded-full">추천</span>
                        )}
                        {pkg.saving && (
                          <span className="text-xs px-2 py-0.5 bg-white/20 text-white rounded-full">{pkg.saving}</span>
                        )}
                      </div>
                      <p className="text-xs text-white/50 mt-0.5">{pkg.label}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-xl font-black ${pkg.recommended ? "text-gold" : "text-white"}`}>
                        {pkg.price}
                      </p>
                      <p className="text-xs text-white/50">{pkg.perCredit}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 운영대행료 안내 */}
            <p className="text-xs text-white/50 mb-4">{credits.operationFee}</p>

            <Link
              href="/register"
              className="block text-center py-3 rounded-lg text-sm font-medium bg-gold text-navy hover:bg-yellow-300 transition-colors font-semibold"
            >
              무료로 시작하기
            </Link>
          </div>
        </div>


      </div>
    </section>
  );
}
