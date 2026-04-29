"use client";

import { useTranslation } from "@/i18n/useTranslation";

const QuoteIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
  </svg>
);

export default function ProblemSection() {
  const { t } = useTranslation();
  const quotes = t.problem.quotes;

  return (
    <section id="problem" className="py-24 bg-white bg-dot-pattern">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-display-md mb-4 bg-gradient-to-br from-navy to-gold bg-clip-text text-transparent">
            {t.problem.title}
          </h2>
          <p className="text-text-muted">{t.problem.subtitle}</p>
        </div>

        {/* VOC Cards — asymmetric bento grid */}
        <div className="grid md:grid-cols-12 gap-6 mb-16">

          {/* Left large card: first quote, full height */}
          <div className="md:col-span-5 bg-surface rounded-xl border border-border p-8 flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <QuoteIcon className="w-10 h-10 text-gold/25 mb-5 flex-shrink-0" />
            <p className="text-lg text-text font-medium leading-relaxed mb-6 flex-1">
              &ldquo;{quotes[0]?.text}&rdquo;
            </p>
            <div className="text-sm text-text-muted pt-4 border-t border-border">
              <div className="font-semibold text-navy">{quotes[0]?.source}</div>
              <div className="mt-0.5">{quotes[0]?.detail}</div>
            </div>
          </div>

          {/* Right column: second and third quotes stacked */}
          <div className="md:col-span-7 flex flex-col gap-6">

            {/* Second quote */}
            <div className="bg-surface rounded-xl border border-border p-6 flex gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex-1">
              <QuoteIcon className="w-7 h-7 text-gold/30 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-text font-medium leading-relaxed mb-3">
                  &ldquo;{quotes[1]?.text}&rdquo;
                </p>
                <div className="text-sm text-text-muted">
                  <div className="font-semibold text-navy">{quotes[1]?.source}</div>
                  <div className="mt-0.5">{quotes[1]?.detail}</div>
                </div>
              </div>
            </div>

            {/* Third quote */}
            <div className="bg-surface rounded-xl border border-border p-6 flex gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex-1">
              <QuoteIcon className="w-7 h-7 text-gold/30 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-text font-medium leading-relaxed mb-3">
                  &ldquo;{quotes[2]?.text}&rdquo;
                </p>
                <div className="text-sm text-text-muted">
                  <div className="font-semibold text-navy">{quotes[2]?.source}</div>
                  <div className="mt-0.5">{quotes[2]?.detail}</div>
                </div>
              </div>
            </div>

          </div>
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
