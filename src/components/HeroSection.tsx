"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useTranslation } from "@/i18n/useTranslation";

const FRAME_COUNT = 80;
// Total extra pixels to scroll for the full 80-frame animation (40 px / frame)
const SCROLL_RANGE = 3200;

export default function HeroSection() {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<HTMLImageElement[]>([]);
  const [framesLoaded, setFramesLoaded] = useState(false);
  const renderedFrameRef = useRef(-1);

  // ── Draw a single frame onto the canvas ──────────────────────────────
  const drawFrame = useCallback((index: number) => {
    const canvas = canvasRef.current;
    const img = framesRef.current[index];
    if (!canvas || !img?.complete) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    renderedFrameRef.current = index;
  }, []);

  // ── Preload all 80 WebP frames ────────────────────────────────────────
  useEffect(() => {
    const frames: HTMLImageElement[] = new Array(FRAME_COUNT);
    let loaded = 0;

    const onDone = () => {
      loaded++;
      if (loaded === FRAME_COUNT) {
        framesRef.current = frames;
        drawFrame(0); // show first frame immediately
        setFramesLoaded(true);
      }
    };

    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      img.onload = onDone;
      img.onerror = onDone; // don't stall if a file is missing
      img.src = `/hero-frames/frame-${String(i).padStart(3, "0")}.webp`;
      frames[i] = img;
    }
  }, [drawFrame]);

  // ── Map scroll position → frame index ────────────────────────────────
  useEffect(() => {
    if (!framesLoaded) return;

    const handleScroll = () => {
      const section = sectionRef.current;
      if (!section) return;

      // Pixels of the section that have scrolled above viewport top
      const scrolled = -section.getBoundingClientRect().top;
      // Total scrollable distance = section height − viewport height
      const scrollable = section.offsetHeight - window.innerHeight;
      if (scrollable <= 0) return;

      const progress = Math.max(0, Math.min(1, scrolled / scrollable));
      const targetFrame = Math.min(
        FRAME_COUNT - 1,
        Math.floor(progress * FRAME_COUNT)
      );

      if (targetFrame !== renderedFrameRef.current) {
        drawFrame(targetFrame);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // sync on first render / soft-nav

    return () => window.removeEventListener("scroll", handleScroll);
  }, [framesLoaded, drawFrame]);

  return (
    // ── Tall scroll container: viewport + 3200 px extra scroll room ─────
    <div
      ref={sectionRef}
      style={{ height: `calc(100vh + ${SCROLL_RANGE}px)` }}
      className="relative"
    >
      {/* Sticky full-viewport panel that stays fixed during scroll */}
      <div className="sticky top-0 h-screen flex items-center bg-navy overflow-hidden">

        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy-light to-navy-dark opacity-90" />
        <div className="absolute top-20 right-20 w-96 h-96 rounded-full bg-gold/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 left-10 w-72 h-72 rounded-full bg-gold/5 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 right-1/3 w-56 h-56 rounded-full bg-gold/[0.03] blur-3xl pointer-events-none" />

        {/* Main content grid */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* ── Left column: text + CTA ── */}
            <div>
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

              <p className="text-lg text-white/70 leading-relaxed mb-10 max-w-xl whitespace-pre-line">
                {t.hero.description}
              </p>

              <div className="flex flex-col sm:flex-row items-start gap-4">
                <Link
                  href="/register"
                  className="px-8 py-4 bg-gold text-navy font-semibold rounded-lg hover:bg-gold-light transition-colors text-base"
                >
                  {t.hero.cta}
                </Link>
                <span className="text-sm text-white/50 self-center">
                  {t.hero.ctaSub}
                </span>
              </div>

              {/* Scroll hint */}
              <div className="mt-12 flex items-center gap-2 text-white/30">
                <svg
                  className="w-4 h-4 animate-bounce"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                <span className="text-xs">스크롤하며 체험해보세요</span>
              </div>
            </div>

            {/* ── Right column: phone mockup with frame canvas ── */}
            <div className="hidden lg:flex justify-center items-center">
              <div className="relative">
                {/* Ambient glow behind phone */}
                <div className="absolute -inset-10 bg-gold/8 blur-3xl rounded-full pointer-events-none" />

                {/* Phone body */}
                <div
                  className="relative rounded-[44px] bg-black"
                  style={{
                    width: "260px",
                    border: "8px solid rgba(255,255,255,0.14)",
                    boxShadow:
                      "0 32px 80px rgba(0,0,0,0.72), inset 0 1px 0 rgba(255,255,255,0.12)",
                  }}
                >
                  {/* Dynamic island */}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-full z-20" />

                  {/* Screen */}
                  <div className="rounded-[36px] overflow-hidden bg-black relative">
                    <canvas
                      ref={canvasRef}
                      width={360}
                      height={640}
                      className="w-full block"
                    />
                    {/* Loading overlay */}
                    {!framesLoaded && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-navy-dark gap-3">
                        <div className="w-8 h-8 border-2 border-gold/60 border-t-transparent rounded-full animate-spin" />
                        <span className="text-white/30 text-xs">로딩 중…</span>
                      </div>
                    )}
                  </div>

                  {/* Home indicator */}
                  <div className="flex justify-center py-2.5">
                    <div className="w-24 h-1 bg-white/20 rounded-full" />
                  </div>
                </div>

                {/* Volume / power buttons (decorative chrome detail) */}
                <div className="absolute left-[-9px] top-[100px] w-[5px] h-7 bg-white/15 rounded-l-md" />
                <div className="absolute left-[-9px] top-[140px] w-[5px] h-10 bg-white/15 rounded-l-md" />
                <div className="absolute left-[-9px] top-[192px] w-[5px] h-10 bg-white/15 rounded-l-md" />
                <div className="absolute right-[-9px] top-[132px] w-[5px] h-14 bg-white/15 rounded-r-md" />
              </div>
            </div>

          </div>
        </div>

        {/* Bottom scroll arrow */}
        <div className="absolute bottom-7 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>
    </div>
  );
}
