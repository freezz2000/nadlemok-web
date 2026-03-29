"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useTranslation } from "@/i18n/useTranslation";

export default function Header() {
  const { locale, t, setLocale } = useTranslation();
  const [open, setOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const demoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (demoRef.current && !demoRef.current.contains(e.target as Node)) {
        setDemoOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const links = [
    { href: "/#problem", label: t.nav.problem },
    { href: "/#solution", label: t.nav.service },
    { href: "/#process", label: t.nav.process },
    { href: "/#pricing", label: t.nav.pricing },
    { href: "/#cta", label: t.nav.contact },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-navy">나들목</span>
          <span className="text-xs text-text-muted">Nadlemok</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-text-muted hover:text-navy transition-colors"
            >
              {link.label}
            </Link>
          ))}

          {/* Demo dropdown */}
          <div ref={demoRef} className="relative">
            <button
              onClick={() => setDemoOpen(!demoOpen)}
              className="flex items-center gap-1 text-sm text-text-muted hover:text-navy transition-colors"
            >
              {t.nav.demo}
              <svg className={`w-3.5 h-3.5 transition-transform ${demoOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {demoOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg border border-border shadow-lg py-1">
                <Link
                  href="/demo/panel"
                  className="block px-4 py-3 text-sm hover:bg-surface transition-colors"
                  onClick={() => setDemoOpen(false)}
                >
                  <div className="font-medium text-navy">{t.nav.demoPanel}</div>
                  <div className="text-xs text-text-muted mt-0.5">{t.demoBanner.panelDesc}</div>
                </Link>
                <Link
                  href="/demo/dashboard"
                  className="block px-4 py-3 text-sm hover:bg-surface transition-colors"
                  onClick={() => setDemoOpen(false)}
                >
                  <div className="font-medium text-navy">{t.nav.demoDashboard}</div>
                  <div className="text-xs text-text-muted mt-0.5">{t.demoBanner.dashboardDesc}</div>
                </Link>
              </div>
            )}
          </div>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden md:inline-flex text-sm text-text-muted hover:text-navy transition-colors"
          >
            로그인
          </Link>
          <Link
            href="/register"
            className="hidden md:inline-flex items-center px-4 py-2 bg-navy text-white text-sm font-medium rounded-lg hover:bg-navy-dark transition-colors"
          >
            회원가입
          </Link>

          <button
            onClick={() => setLocale(locale === "ko" ? "en" : "ko")}
            className="text-xs px-3 py-1.5 rounded-full border border-border text-text-muted hover:bg-surface transition-colors"
          >
            {locale === "ko" ? "EN" : "KO"}
          </button>

          <button
            className="md:hidden p-2"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden bg-white border-t border-border">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block px-6 py-3 text-sm text-text-muted hover:bg-surface"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="border-t border-border px-6 py-3 flex gap-3">
            <Link
              href="/login"
              className="flex-1 text-center py-2 text-sm text-navy border border-navy rounded-lg hover:bg-navy/5"
              onClick={() => setOpen(false)}
            >
              로그인
            </Link>
            <Link
              href="/register"
              className="flex-1 text-center py-2 text-sm text-white bg-navy rounded-lg hover:bg-navy-dark"
              onClick={() => setOpen(false)}
            >
              회원가입
            </Link>
          </div>
          <div className="border-t border-border">
            <Link
              href="/demo/panel"
              className="block px-6 py-3 text-sm text-text-muted hover:bg-surface"
              onClick={() => setOpen(false)}
            >
              {t.nav.demoPanel}
            </Link>
            <Link
              href="/demo/dashboard"
              className="block px-6 py-3 text-sm text-text-muted hover:bg-surface"
              onClick={() => setOpen(false)}
            >
              {t.nav.demoDashboard}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
