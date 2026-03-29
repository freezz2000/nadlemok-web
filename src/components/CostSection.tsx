"use client";

import { useTranslation } from "@/i18n/useTranslation";

const verdictColors = ["bg-go text-white", "bg-cgo text-white", "bg-nogo text-white"];
const verdictBg = ["bg-go-bg border-go/20", "bg-cgo-bg border-cgo/20", "bg-nogo-bg border-nogo/20"];

export default function CostSection() {
  const { t } = useTranslation();
  return (
    <section className="py-24 bg-navy">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3">{t.cost.title}</h2>
          <p className="text-white/60">{t.cost.subtitle}</p>
        </div>

        {/* Cost comparison */}
        <div className="grid md:grid-cols-2 gap-8 mb-16 max-w-4xl mx-auto">
          <div className="bg-white/5 backdrop-blur rounded-xl p-8 border border-white/10 text-center">
            <div className="text-sm text-white/50 mb-2">Without Nadlemok</div>
            <div className="text-4xl font-bold text-nogo mb-2">3,000만원+</div>
            <div className="text-sm text-white/60">{t.cost.production}</div>
          </div>
          <div className="bg-white/5 backdrop-blur rounded-xl p-8 border border-gold/30 text-center">
            <div className="text-sm text-gold mb-2">With Nadlemok</div>
            <div className="text-4xl font-bold text-gold mb-2">300만원</div>
            <div className="text-sm text-white/60">{t.cost.nadlemok}</div>
          </div>
        </div>

        {/* Scenarios */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {t.cost.scenarios.map((s, i) => (
            <div key={i} className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/10">
              <span className={`inline-block px-2.5 py-1 rounded text-xs font-bold mb-3 ${verdictColors[i === 0 ? 2 : i === 1 ? 1 : 0]}`}>
                {s.verdict}
              </span>
              <p className="text-sm text-white/80 mb-2">{s.desc}</p>
              <div className="text-gold font-medium text-sm">{s.savings}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
