"use client";

import Link from "next/link";
import { useTranslation } from "@/i18n/useTranslation";

export default function DemoBannerSection() {
  const { t } = useTranslation();
  return (
    <section id="demo" className="py-24 bg-surface">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-navy mb-3">{t.demoBanner.title}</h2>
          <p className="text-text-muted">{t.demoBanner.subtitle}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Panel Demo Card */}
          <Link
            href="/demo/panel"
            className="group bg-white rounded-xl border border-border p-8 hover:border-gold/40 hover:shadow-lg transition-all"
          >
            <div className="w-12 h-12 rounded-lg bg-navy/5 flex items-center justify-center mb-5 group-hover:bg-gold/10 transition-colors">
              <svg className="w-6 h-6 text-navy group-hover:text-gold transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-navy mb-2 group-hover:text-gold transition-colors">
              {t.demoBanner.panelTitle}
            </h3>
            <p className="text-sm text-text-muted leading-relaxed mb-6">
              {t.demoBanner.panelDesc}
            </p>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gold">
              {t.demoBanner.panelCta}
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </Link>

          {/* Dashboard Demo Card */}
          <Link
            href="/demo/dashboard"
            className="group bg-white rounded-xl border border-border p-8 hover:border-gold/40 hover:shadow-lg transition-all"
          >
            <div className="w-12 h-12 rounded-lg bg-navy/5 flex items-center justify-center mb-5 group-hover:bg-gold/10 transition-colors">
              <svg className="w-6 h-6 text-navy group-hover:text-gold transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-navy mb-2 group-hover:text-gold transition-colors">
              {t.demoBanner.dashboardTitle}
            </h3>
            <p className="text-sm text-text-muted leading-relaxed mb-6">
              {t.demoBanner.dashboardDesc}
            </p>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gold">
              {t.demoBanner.dashboardCta}
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
