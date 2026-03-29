"use client";

import { useState } from "react";
import { useTranslation } from "@/i18n/useTranslation";

const tabIcons = ["A", "B", "C"];
const colors = ["bg-navy", "bg-gold", "bg-navy-light"];

export default function DeliverablesSection() {
  const { t } = useTranslation();
  const [active, setActive] = useState(0);

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-navy mb-3">{t.deliverables.title}</h2>
          <p className="text-text-muted">{t.deliverables.subtitle}</p>
        </div>

        {/* Tab buttons */}
        <div className="flex justify-center gap-3 mb-10">
          {t.deliverables.reports.map((r, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active === i
                  ? "bg-navy text-white"
                  : "bg-surface text-text-muted hover:bg-surface-dark"
              }`}
            >
              {r.id}. {r.title}
            </button>
          ))}
        </div>

        {/* Active report */}
        {t.deliverables.reports.map((r, i) => (
          active === i && (
            <div key={i} className="max-w-2xl mx-auto bg-surface rounded-xl p-8 border border-border">
              <div className="flex items-center gap-4 mb-6">
                <span className={`w-10 h-10 rounded-lg ${colors[i]} text-white font-bold flex items-center justify-center`}>
                  {tabIcons[i]}
                </span>
                <div>
                  <h3 className="font-bold text-navy">{r.title}</h3>
                  <p className="text-sm text-text-muted">{r.audience}</p>
                </div>
              </div>
              <ul className="space-y-3 mb-6">
                {r.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2.5 text-sm text-text">
                    <span className="text-gold mt-0.5 shrink-0">&#10003;</span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="text-xs text-text-muted bg-white rounded-lg px-4 py-2.5 border border-border">
                {r.format}
              </div>
            </div>
          )
        ))}
      </div>
    </section>
  );
}
