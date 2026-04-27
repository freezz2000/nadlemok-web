"use client";

import { useTranslation } from "@/i18n/useTranslation";

export default function WhyUsSection() {
  const { t } = useTranslation();
  return (
    <section className="py-24 bg-white bg-dot-pattern">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-br from-navy to-gold bg-clip-text text-transparent">{t.whyUs.title}</h2>
          <p className="text-text-muted">{t.whyUs.subtitle}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {t.whyUs.stats.map((stat, i) => (
            <div key={i} className="text-center p-6 bg-surface rounded-xl border border-border hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <div className="text-4xl md:text-5xl font-black mb-1 bg-gradient-to-br from-navy to-gold bg-clip-text text-transparent">{stat.value}</div>
              <div className="text-sm text-text-muted">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Differentiators */}
        <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {t.whyUs.features.map((f, i) => (
            <div key={i} className="flex gap-4 p-6 bg-surface rounded-xl border border-border hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                <span className="text-gold font-bold text-sm">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <div>
                <h3 className="font-bold text-navy mb-1">{f.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
