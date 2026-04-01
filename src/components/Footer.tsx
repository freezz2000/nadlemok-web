"use client";

import { useTranslation } from "@/i18n/useTranslation";

export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="bg-navy-dark text-white/60 py-12">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-center md:text-left">
          <div className="text-white font-bold text-lg mb-1">나들목 <span className="text-sm font-normal text-white/40">Nadlemok</span></div>
          <div className="text-sm">{t.footer.company} | {t.footer.ceo}{t.footer.address ? ` | ${t.footer.address}` : ''}</div>
        </div>
        <div className="text-center md:text-right text-sm">
          <div className="mb-1">official@linebreakers.co.kr · 070-8098-7123</div>
          <div className="text-white/40">&copy; 2026 LineBreakers. All rights reserved.</div>
        </div>
      </div>
    </footer>
  );
}
