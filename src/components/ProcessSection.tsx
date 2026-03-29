"use client";

import { useTranslation } from "@/i18n/useTranslation";

export default function ProcessSection() {
  const { t } = useTranslation();
  return (
    <section id="process" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-navy mb-3">{t.process.title}</h2>
          <p className="text-text-muted max-w-2xl mx-auto">{t.process.subtitle}</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {t.process.steps.map((step, i) => (
            <div key={i} className="relative bg-surface rounded-xl p-6 border border-border">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-8 h-8 rounded-full bg-navy text-white text-sm font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <h3 className="font-bold text-navy">{step.title}</h3>
              </div>
              <p className="text-sm text-text-muted leading-relaxed pl-11">{step.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <span className="inline-block px-5 py-2.5 bg-gold/10 text-gold border border-gold/20 rounded-lg text-sm font-medium">
            {t.process.prep}
          </span>
        </div>
      </div>
    </section>
  );
}
