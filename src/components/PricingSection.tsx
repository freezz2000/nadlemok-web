"use client";

import Link from "next/link";
import { useTranslation } from "@/i18n/useTranslation";

export default function PricingSection() {
  const { t } = useTranslation();
  return (
    <section id="pricing" className="py-24 bg-surface">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-navy text-center mb-16">{t.pricing.title}</h2>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-10">
          {t.pricing.plans.map((plan, i) => (
            <div
              key={i}
              className={`relative rounded-xl p-8 border transition-all ${
                plan.recommended
                  ? "bg-navy text-white border-navy ring-2 ring-gold scale-105"
                  : "bg-white text-text border-border"
              }`}
            >
              {plan.recommended && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gold text-navy text-xs font-bold rounded-full">
                  ★ RECOMMENDED
                </span>
              )}

              <div className="text-center mb-6">
                <h3 className={`text-lg font-bold mb-2 ${plan.recommended ? "text-white" : "text-navy"}`}>
                  {plan.name}
                </h3>
                <div className={`text-3xl font-bold ${plan.recommended ? "text-gold" : "text-navy"}`}>
                  {plan.price}
                  <span className={`text-sm font-normal ${plan.recommended ? "text-white/60" : "text-text-muted"}`}>
                    {" "}{plan.unit}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { label: "패널", value: plan.panel },
                  { label: "분석", value: plan.analysis },
                  { label: "제공 결과", value: plan.output },
                  { label: "추천 대상", value: plan.target },
                ].map((row, j) => (
                  <div key={j} className="flex justify-between text-sm">
                    <span className={plan.recommended ? "text-white/60" : "text-text-muted"}>{row.label}</span>
                    <span className={`font-medium text-right ${plan.recommended ? "text-white" : "text-navy"}`}>{row.value}</span>
                  </div>
                ))}
              </div>

              <Link
                href="/register"
                className={`block text-center mt-6 py-3 rounded-lg text-sm font-medium transition-colors ${
                  plan.recommended
                    ? "bg-gold text-navy hover:bg-gold-light"
                    : "bg-navy/5 text-navy hover:bg-navy/10"
                }`}
              >
                {plan.name === "Basic" ? "무료로 시작하기" : "구독하기"}
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-gold bg-gold/10 rounded-lg py-3 px-6 max-w-2xl mx-auto border border-gold/20">
          {t.pricing.pilot}
        </p>
      </div>
    </section>
  );
}
