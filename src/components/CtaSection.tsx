"use client";

import { useTranslation } from "@/i18n/useTranslation";

export default function CtaSection() {
  const { t } = useTranslation();
  return (
    <section id="cta" className="py-24 bg-navy relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-gold/5 blur-3xl" />
      <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{t.cta.title}</h2>
        <p className="text-white/70 leading-relaxed mb-8 whitespace-pre-line">{t.cta.description}</p>

        <a
          href={`mailto:${t.cta.email}`}
          className="inline-block px-10 py-4 bg-gold text-navy font-bold rounded-lg hover:bg-gold-light transition-colors text-lg mb-4"
        >
          {t.cta.button}
        </a>
        <div className="text-sm text-white/50 mb-10">{t.cta.offer}</div>

        <div className="flex flex-col sm:flex-row justify-center gap-6 text-sm text-white/60">
          <a href={`mailto:${t.cta.email}`} className="hover:text-gold transition-colors">
            {t.cta.email}
          </a>
          <span className="hidden sm:inline text-white/20">|</span>
          <a href={`tel:${t.cta.phone}`} className="hover:text-gold transition-colors">
            {t.cta.phone}
          </a>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10">
          <p className="text-gold/80 font-medium italic">{t.cta.closing}</p>
        </div>
      </div>
    </section>
  );
}
