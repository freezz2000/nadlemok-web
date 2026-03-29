"use client";

import { I18nProvider } from "@/i18n/useTranslation";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import ProblemSection from "@/components/ProblemSection";
import SolutionSection from "@/components/SolutionSection";
import ProcessSection from "@/components/ProcessSection";
import VerdictSection from "@/components/VerdictSection";
import DeliverablesSection from "@/components/DeliverablesSection";
import DemoBannerSection from "@/components/DemoBannerSection";
import CostSection from "@/components/CostSection";
import PricingSection from "@/components/PricingSection";
import WhyUsSection from "@/components/WhyUsSection";
import CtaSection from "@/components/CtaSection";
import Footer from "@/components/Footer";
import { useEffect } from "react";

function ScrollAnimator() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("section-visible");
            entry.target.classList.remove("section-hidden");
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll("[data-animate]").forEach((el) => {
      el.classList.add("section-hidden");
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return null;
}

export default function Home() {
  return (
    <I18nProvider>
      <ScrollAnimator />
      <Header />
      <main>
        <HeroSection />
        <div data-animate><ProblemSection /></div>
        <div data-animate><SolutionSection /></div>
        <div data-animate><ProcessSection /></div>
        <div data-animate><VerdictSection /></div>
        <div data-animate><DeliverablesSection /></div>
        <div data-animate><DemoBannerSection /></div>
        <CostSection />
        <div data-animate><PricingSection /></div>
        <div data-animate><WhyUsSection /></div>
        <CtaSection />
      </main>
      <Footer />
    </I18nProvider>
  );
}
