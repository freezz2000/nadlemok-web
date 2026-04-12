"use client";

import Link from "next/link";
import { useTranslation } from "@/i18n/useTranslation";

export default function HeroSection() {
  const { t } = useTranslation();
  return (
    <section className="relative min-h-screen flex items-center bg-navy overflow-hidden">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy-light to-navy-dark opacity-90" />
      {/* Decorative circles */}
      <div className="absolute top-20 right-20 w-96 h-96 rounded-full bg-gold/5 blur-3xl" />
      <div className="absolute bottom-20 left-10 w-72 h-72 rounded-full bg-gold/5 blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-32 w-full">
        <div className="max-w-3xl">
          <div className="flex gap-3 mb-8">
            <span className="px-3 py-1 text-xs rounded-full bg-white/10 text-gold border border-gold/30">
              {t.hero.badge1}
            </span>
            <span className="px-3 py-1 text-xs rounded-full bg-white/10 text-white/70 border border-white/20">
              {t.hero.badge2}
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6 whitespace-pre-line">
            {t.hero.headline}
          </h1>

          <p className="text-lg text-white/70 leading-relaxed mb-10 max-w-2xl whitespace-pre-line">
            {t.hero.description}
          </p>

          <div className="flex flex-col sm:flex-row items-start gap-4">
            <Link
              href="/register"
              className="px-8 py-4 bg-gold text-navy font-semibold rounded-lg hover:bg-gold-light transition-colors text-base"
            >
              {t.hero.cta}
            </Link>
            <span className="text-sm text-white/50 self-center">{t.hero.ctaSub}</span>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <svg className="w-6 h-6 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </section>
  );
}
