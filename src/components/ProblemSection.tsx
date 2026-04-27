"use client";

import { useTranslation } from "@/i18n/useTranslation";

export default function ProblemSection() {
  const { t } = useTranslation();
  return (
    <section id="problem" className="py-24 bg-white bg-dot-pattern">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-br from-navy to-gold bg-clip-text text-transparent">{t.problem.title}</h2>
          <p className="text-text-muted">{t.problem.subtitle}</p>
        </div>

        {/* VOC Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {t.problem.quotes.map((q, i) => (
            <div key={i} className="bg-surface rounded-xl p-6 border border-border relative hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <svg className="w-8 h-8 text-gold/30 mb-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>
              <p className="text-text font-medium mb-4 leading-relaxed">&ldquo;{q.text}&rdquo;</p>
              <div className="text-sm text-text-muted">
                <div className="font-medium text-navy">{q.source}</div>
                <div>{q.detail}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Process Gap Diagram */}
        <div className="bg-surface rounded-xl p-8 border border-border">
          <h3 className="text-lg font-bold text-navy mb-6 text-center">{t.problem.gapTitle}</h3>
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            {t.problem.steps.map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <span
                  className={`px-3 py-2 rounded text-sm font-medium ${
                    i < 3
                      ? "bg-go/10 text-go border border-go/20"
                      : "bg-nogo/10 text-nogo border border-nogo/20"
                  }`}
                >
                  {step}
                </span>
                {i < t.problem.steps.length - 1 && (
                  <span className="text-text-muted">→</span>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-8 text-xs mb-6">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-go/20 border border-go" />
              {t.problem.editableLabel}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-nogo/20 border border-nogo" />
              {t.problem.lockedLabel}
            </span>
          </div>
          <p className="text-center text-text-muted text-sm">{t.problem.gapInsight}</p>
        </div>

        <div className="mt-12 text-center">
          <p className="inline-block px-6 py-3 bg-navy/5 text-navy font-medium rounded-lg text-sm">
            {t.problem.conclusion}
          </p>
        </div>
      </div>
    </section>
  );
}
