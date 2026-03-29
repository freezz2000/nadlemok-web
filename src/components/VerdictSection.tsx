"use client";

import { useTranslation } from "@/i18n/useTranslation";

const styles = [
  { bg: "bg-go-bg", border: "border-go/30", badge: "bg-go text-white", icon: "text-go" },
  { bg: "bg-cgo-bg", border: "border-cgo/30", badge: "bg-cgo text-white", icon: "text-cgo" },
  { bg: "bg-nogo-bg", border: "border-nogo/30", badge: "bg-nogo text-white", icon: "text-nogo" },
];

export default function VerdictSection() {
  const { t } = useTranslation();
  return (
    <section className="py-24 bg-surface">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-navy text-center mb-16">{t.verdict.title}</h2>

        <div className="grid md:grid-cols-3 gap-6">
          {t.verdict.items.map((item, i) => (
            <div key={i} className={`rounded-xl p-8 border ${styles[i].bg} ${styles[i].border}`}>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold mb-4 ${styles[i].badge}`}>
                {item.label}
              </span>
              <h3 className="text-lg font-bold text-text mb-2">{item.labelKo}</h3>
              <div className="mb-4">
                <div className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1">
                  {i === 0 ? "Criteria" : i === 1 ? "Criteria" : "Criteria"}
                </div>
                <p className="text-sm text-text">{item.criteria}</p>
              </div>
              <div className={`text-sm font-medium ${styles[i].icon}`}>{item.action}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
