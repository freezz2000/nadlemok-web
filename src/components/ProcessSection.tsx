"use client";

import { useTranslation } from "@/i18n/useTranslation";

interface Step {
  title: string;
  desc: string;
  day?: string;
}

function TrackSteps({ steps, color }: { steps: Step[]; color: "go" | "navy" }) {
  const lineColor  = color === "go"   ? "bg-go/30"    : "bg-navy/30";
  const dotActive  = color === "go"   ? "bg-go text-white"    : "bg-navy text-white";
  const dayBg      = color === "go"   ? "bg-go/10 text-go border-go/20"   : "bg-gold/10 text-gold border-gold/20";

  return (
    <div className="space-y-0">
      {steps.map((step, i) => (
        <div key={i} className="flex gap-4">
          {/* 타임라인 라인 + 번호 */}
          <div className="flex flex-col items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${dotActive}`}>
              {i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className={`w-0.5 flex-1 my-1 min-h-[24px] ${lineColor}`} />
            )}
          </div>

          {/* 내용 */}
          <div className={`pb-5 ${i === steps.length - 1 ? "pb-0" : ""}`}>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-text leading-snug">{step.title}</p>
              {step.day && (
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${dayBg}`}>
                  {step.day}
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{step.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ProcessSection() {
  const { t } = useTranslation();
  const { internal, external } = t.process;

  return (
    <section id="process" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">

        {/* 헤더 */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-navy mb-3">{t.process.title}</h2>
          <p className="text-text-muted max-w-2xl mx-auto">{t.process.subtitle}</p>
        </div>

        {/* 두 트랙 */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-10">

          {/* 내부 패널 트랙 */}
          <div className="rounded-xl border border-go/30 bg-go-bg/40 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-xs font-semibold text-go uppercase tracking-widest">{internal.badge}</span>
                <h3 className="text-lg font-bold text-text mt-0.5">{internal.label}</h3>
              </div>
              <div className="text-right">
                <p className="text-xs text-text-muted">완료까지</p>
                <p className="text-2xl font-black text-go">{internal.duration}</p>
              </div>
            </div>
            <TrackSteps steps={internal.steps} color="go" />
          </div>

          {/* 외부 패널 트랙 */}
          <div className="rounded-xl border border-navy/20 bg-navy/[0.03] p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-xs font-semibold text-navy uppercase tracking-widest">{external.badge}</span>
                <h3 className="text-lg font-bold text-text mt-0.5">{external.label}</h3>
              </div>
              <div className="text-right">
                <p className="text-xs text-text-muted">완료까지</p>
                <p className="text-2xl font-black text-navy">{external.duration}</p>
              </div>
            </div>
            <TrackSteps steps={external.steps} color="navy" />
          </div>
        </div>

        {/* 준비물 */}
        <div className="text-center">
          <span className="inline-block px-5 py-2.5 bg-gold/10 text-gold border border-gold/20 rounded-lg text-sm font-medium">
            {t.process.prep}
          </span>
        </div>

      </div>
    </section>
  );
}
