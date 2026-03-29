"use client";

import { useState } from "react";
import { useTranslation } from "@/i18n/useTranslation";

function DashboardOverview() {
  return (
    <div className="bg-white rounded-xl p-6 border border-border">
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-4 bg-surface rounded-lg">
          <div className="text-2xl font-bold text-navy">3.8</div>
          <div className="text-xs text-text-muted mt-1">Sensory Score</div>
          <div className="text-xs text-go font-medium">/ 5.0</div>
        </div>
        <div className="text-center p-4 bg-cgo-bg rounded-lg">
          <div className="text-2xl font-bold text-cgo">62%</div>
          <div className="text-xs text-text-muted mt-1">Purchase Intent</div>
        </div>
        <div className="text-center p-4 bg-nogo-bg rounded-lg">
          <div className="text-2xl font-bold text-nogo">High</div>
          <div className="text-xs text-text-muted mt-1">Risk Level</div>
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 p-3 bg-cgo-bg rounded-lg border border-cgo/30">
        <span className="px-2 py-0.5 bg-cgo text-white text-xs rounded font-bold">Conditional Go</span>
        <span className="text-sm text-text-muted">Improvement recommended before launch</span>
      </div>
    </div>
  );
}

function SensoryRadar() {
  const items = [
    { label: "Absorption", value: 4.2, pct: 84 },
    { label: "Moisture", value: 4.0, pct: 80 },
    { label: "Spreadability", value: 4.2, pct: 84 },
    { label: "Scent", value: 3.8, pct: 76 },
    { label: "Irritation", value: 3.5, pct: 70 },
    { label: "Finish", value: 2.5, pct: 50 },
  ];
  return (
    <div className="bg-white rounded-xl p-6 border border-border">
      <div className="space-y-4">
        {items.map((item, i) => (
          <div key={i}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-text-muted">{item.label}</span>
              <span className="font-medium text-navy">{item.value}</span>
            </div>
            <div className="w-full bg-surface rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${item.pct < 60 ? "bg-nogo" : item.pct < 75 ? "bg-cgo" : "bg-go"}`}
                style={{ width: `${item.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KillSignalMonitor() {
  const signals = [
    { label: "Stickiness", rate: "40%", level: "Red Flag", color: "nogo" },
    { label: "Scent Intensity", rate: "15%", level: "Warning", color: "cgo" },
    { label: "Irritation", rate: "5%", level: "Safe", color: "go" },
  ];
  return (
    <div className="bg-white rounded-xl p-6 border border-border">
      <div className="space-y-4">
        {signals.map((s, i) => (
          <div key={i} className={`p-4 rounded-lg border ${
            s.color === "nogo" ? "bg-nogo-bg border-nogo/30" :
            s.color === "cgo" ? "bg-cgo-bg border-cgo/30" :
            "bg-go-bg border-go/30"
          }`}>
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium text-sm text-text">{s.label}</div>
                <div className="text-xs text-text-muted mt-0.5">{s.level}</div>
              </div>
              <div className={`text-2xl font-bold ${
                s.color === "nogo" ? "text-nogo" : s.color === "cgo" ? "text-cgo" : "text-go"
              }`}>{s.rate}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CohortHeatmap() {
  const data = [
    { group: "20s Dry", scores: [4.1, 4.2, 3.9, 4.3, 4.1], verdict: "Go" },
    { group: "30s Combo", scores: [3.5, 3.8, 3.2, 2.1, 2.8], verdict: "No-Go" },
    { group: "40s Dry", scores: [4.0, 4.1, 3.7, 3.5, 3.9], verdict: "CGo" },
  ];
  const cols = ["Spread", "Moisture", "Scent", "Finish", "Overall"];
  return (
    <div className="bg-white rounded-xl p-6 border border-border overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left text-text-muted font-medium pb-3">Cohort</th>
            {cols.map((c) => <th key={c} className="text-center text-text-muted font-medium pb-3">{c}</th>)}
            <th className="text-center text-text-muted font-medium pb-3">Verdict</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-t border-border">
              <td className="py-3 font-medium text-navy">{row.group}</td>
              {row.scores.map((s, j) => (
                <td key={j} className="text-center py-3">
                  <span className={`inline-block w-8 h-8 leading-8 rounded text-xs font-medium ${
                    s >= 3.8 ? "bg-go/10 text-go" : s >= 3.0 ? "bg-cgo/10 text-cgo" : "bg-nogo/10 text-nogo"
                  }`}>{s}</span>
                </td>
              ))}
              <td className="text-center py-3">
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                  row.verdict === "Go" ? "bg-go text-white" :
                  row.verdict === "CGo" ? "bg-cgo text-white" :
                  "bg-nogo text-white"
                }`}>{row.verdict}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const panels = [DashboardOverview, SensoryRadar, KillSignalMonitor, CohortHeatmap];

export default function DemoDashboardSection() {
  const { t } = useTranslation();
  const [active, setActive] = useState(0);
  const Panel = panels[active];

  return (
    <section id="demo-dashboard" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-navy mb-3">{t.demoDashboard.title}</h2>
          <p className="text-text-muted">{t.demoDashboard.subtitle}</p>
        </div>

        {/* Tab bar */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {t.demoDashboard.tabs.map((tab, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                active === i ? "bg-navy text-white" : "bg-surface text-text-muted hover:bg-surface-dark"
              }`}
            >
              {tab.title}
            </button>
          ))}
        </div>

        {/* Active panel */}
        <div className="max-w-2xl mx-auto mb-8">
          <Panel />
          <p className="text-center text-sm text-text-muted mt-4">{t.demoDashboard.tabs[active].desc}</p>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {t.demoDashboard.highlights.map((h, i) => (
            <span key={i} className="px-3 py-1.5 bg-navy/5 text-navy text-xs rounded-full border border-navy/10">
              {h}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
