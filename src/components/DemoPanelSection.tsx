"use client";

import { useState } from "react";
import { useTranslation } from "@/i18n/useTranslation";

// Mock panel evaluation UI
function PanelMockup({ screenIndex }: { screenIndex: number }) {
  if (screenIndex === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-lg max-w-xs mx-auto border border-border">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-full bg-navy text-white text-xs flex items-center justify-center font-bold">N</div>
          <span className="font-bold text-navy text-sm">나들목 패널</span>
        </div>
        <div className="space-y-3">
          {["비타민C 앰플 테스트", "시카 크림 테스트"].map((name, i) => (
            <div key={i} className="bg-surface rounded-lg p-4 border border-border">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-navy">{name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${i === 0 ? "bg-go/10 text-go" : "bg-cgo/10 text-cgo"}`}>
                  {i === 0 ? "Day 7" : "Day 3"}
                </span>
              </div>
              <div className="w-full bg-border rounded-full h-1.5">
                <div className={`h-1.5 rounded-full ${i === 0 ? "bg-go w-3/4" : "bg-cgo w-2/5"}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (screenIndex === 1) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-lg max-w-xs mx-auto border border-border">
        <div className="text-sm font-bold text-navy mb-4">제품 평가</div>
        {["발림성", "수분감", "향", "자극도"].map((label, i) => (
          <div key={i} className="mb-4">
            <div className="text-xs text-text-muted mb-1.5">{label}</div>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((v) => (
                <button
                  key={v}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                    (i === 0 && v === 4) || (i === 1 && v === 3) || (i === 2 && v === 3) || (i === 3 && v === 1)
                      ? "bg-navy text-white border-navy"
                      : "bg-surface text-text-muted border-border hover:border-navy/30"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg max-w-xs mx-auto border border-border">
      <div className="text-sm font-bold text-navy mb-4">Day별 체크포인트</div>
      <div className="flex gap-3 mb-6">
        {["D1", "D3", "D7", "D14"].map((d, i) => (
          <div key={i} className={`flex-1 text-center py-2 rounded-lg text-xs font-medium ${
            i <= 2 ? "bg-navy text-white" : "bg-surface text-text-muted border border-border"
          }`}>{d}</div>
        ))}
      </div>
      <div className="space-y-3">
        {["수분감 변화", "자극 반응", "전반 만족도"].map((label, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-text-muted">{label}</span>
            <div className="flex gap-1">
              {[1, 2, 3].map((_, j) => (
                <div key={j} className={`w-4 h-4 rounded-sm ${j <= i + 1 ? "bg-gold" : "bg-border"}`} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DemoPanelSection() {
  const { t } = useTranslation();
  const [active, setActive] = useState(0);

  return (
    <section id="demo-panel" className="py-24 bg-surface">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-navy mb-3">{t.demoPanel.title}</h2>
          <p className="text-text-muted">{t.demoPanel.subtitle}</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Mock device */}
          <div className="flex justify-center">
            <div className="relative bg-navy/5 rounded-3xl p-8 w-full max-w-sm">
              <PanelMockup screenIndex={active} />
            </div>
          </div>

          {/* Screen selector + highlights */}
          <div>
            <div className="space-y-3 mb-8">
              {t.demoPanel.screens.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    active === i
                      ? "bg-navy text-white border-navy"
                      : "bg-white text-text border-border hover:border-navy/30"
                  }`}
                >
                  <div className="font-medium text-sm">{s.title}</div>
                  <div className={`text-xs mt-1 ${active === i ? "text-white/70" : "text-text-muted"}`}>{s.desc}</div>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {t.demoPanel.highlights.map((h, i) => (
                <span key={i} className="px-3 py-1.5 bg-gold/10 text-gold text-xs rounded-full border border-gold/20">
                  {h}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
