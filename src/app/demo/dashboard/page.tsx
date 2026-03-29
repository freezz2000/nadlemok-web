"use client";

import Link from "next/link";
import { I18nProvider, useTranslation } from "@/i18n/useTranslation";
import Header from "@/components/Header";
import DemoDashboardSection from "@/components/DemoDashboardSection";
import Footer from "@/components/Footer";

function BackLink() {
  const { t } = useTranslation();
  return (
    <div className="pt-20 pb-4 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <Link href="/" className="text-sm text-text-muted hover:text-navy transition-colors">
          {t.demoPage.backToHome}
        </Link>
      </div>
    </div>
  );
}

export default function DemoDashboardPage() {
  return (
    <I18nProvider>
      <Header />
      <main>
        <BackLink />
        <DemoDashboardSection />
      </main>
      <Footer />
    </I18nProvider>
  );
}
