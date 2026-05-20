"use client";

import { useState, useCallback, Fragment } from "react";
import { motion } from "framer-motion";
import WindExplosion from "@/components/WindExplosion";

type Beat = "A" | "B" | "C" | "D";

interface BeatConfig {
  range: [number, number];
  title: string;
  subtitle: string;
  align: "center" | "left" | "right";
  accent?: boolean;
  showCTA?: boolean;
  instant?: boolean;  // appear at full opacity immediately, no fade-in
  gradient?: boolean; // render title with a colour gradient instead of solid
}

const beats: Record<Beat, BeatConfig> = {
  A: {
    range: [0, 0.20],
    title: "УПРАВЛЯЙ ВЕТРОМ",
    subtitle: "Прокрути вниз — и посмотри что будет",
    align: "center",
    instant: true,
    gradient: true,
  },
  B: {
    range: [0.25, 0.45],
    title: "ВЕТЕР ПОДНИМАЕТСЯ",
    subtitle: "Что-то надвигается снизу...",
    align: "left",
    gradient: true,
  },
  C: {
    range: [0.50, 0.70],
    title: "ВЗРЫВ",
    subtitle: "Платье сорвано. Одежда парит в воздухе.",
    align: "right",
    accent: true,
  },
  D: {
    range: [0.75, 0.95],
    title: "ХОЧЕШЬ ТАКОЙ САЙТ?",
    subtitle: "Пиши мне — сделаю динамический сайт для тебя",
    align: "center",
    showCTA: true,
  },
};

function calcOpacity(progress: number, [start, end]: [number, number], instant = false): number {
  const fadeOutStart = end - 0.10;
  const fadeOutEnd = end;

  if (instant) {
    // No fade-in: start at full opacity, only fade out at the end
    if (progress < fadeOutStart) return 1;
    if (progress < fadeOutEnd) return 1 - (progress - fadeOutStart) / (fadeOutEnd - fadeOutStart);
    return 0;
  }

  const fadeInStart = start;
  const fadeInEnd = start + 0.10;

  if (progress < fadeInStart) return 0;
  if (progress < fadeInEnd) return (progress - fadeInStart) / (fadeInEnd - fadeInStart);
  if (progress < fadeOutStart) return 1;
  if (progress < fadeOutEnd) return 1 - (progress - fadeOutStart) / (fadeOutEnd - fadeOutStart);
  return 0;
}

function calcY(progress: number, [start, end]: [number, number], instant = false): number {
  const fadeOutStart = end - 0.10;
  const fadeOutEnd = end;

  if (instant) {
    // No slide-in: start at rest position, only slide out at the end
    if (progress < fadeOutStart) return 0;
    if (progress < fadeOutEnd) return -20 * ((progress - fadeOutStart) / (fadeOutEnd - fadeOutStart));
    return -20;
  }

  const fadeInStart = start;
  const fadeInEnd = start + 0.10;

  if (progress < fadeInStart) return 20;
  if (progress < fadeInEnd) return 20 * (1 - (progress - fadeInStart) / (fadeInEnd - fadeInStart));
  if (progress < fadeOutStart) return 0;
  if (progress < fadeOutEnd) return -20 * ((progress - fadeOutStart) / (fadeOutEnd - fadeOutStart));
  return -20;
}

// Desktop alignment (unchanged from original)
const alignClasses: Record<string, string> = {
  center: "text-center left-1/2 -translate-x-1/2",
  left: "text-left left-[5%] sm:left-[10%]",
  right: "text-right right-[5%] sm:right-[10%]",
};

export default function Home() {
  const [progress, setProgress] = useState(0);

  const handleProgress = useCallback((p: number) => {
    setProgress(p);
  }, []);

  const handleTelegram = () => {
    window.open("https://t.me/iog11", "_blank", "noopener,noreferrer");
  };

  return (
    <main className="relative bg-[#050505] min-h-screen">
      <WindExplosion onProgress={handleProgress} />

      {/* Text overlays */}
      <div className="fixed inset-0 pointer-events-none z-10">

        {/* Mobile-only: bottom gradient so text stays readable over video */}
        <div className="sm:hidden absolute bottom-0 left-0 right-0 h-[45%] bg-gradient-to-t from-black/80 to-transparent" />

        {Object.entries(beats).map(([key, beat]) => {
          const opacity = calcOpacity(progress, beat.range, beat.instant);
          const y = calcY(progress, beat.range, beat.instant);

          if (opacity <= 0) return null;

          const h2ColorClass = beat.gradient
            ? "bg-gradient-to-r from-[#38BDF8] to-[#FF3B30] bg-clip-text text-transparent"
            : beat.accent
              ? "text-[#FF3B30]"
              : "text-white/90";
          // Desktop h2 sizes (applied from sm+ since the block is hidden below sm)
          const h2SizeDesktop = beat.align === "center"
            ? "text-[6.3rem] md:text-[8.4rem]"
            : "text-[4.725rem] md:text-[6.3rem]";
          const pMargin  = beat.align === "left"  ? "0" : "auto";
          const pMarginR = beat.align === "right" ? "0" : "auto";

          const sharedStyle = { opacity, transform: `translateY(${y}px)` };

          return (
            <Fragment key={key}>

              {/* ── MOBILE (hidden on sm+) ──────────────────────────────────
                  Positioned at the bottom of the screen, always centered.
                  Font is ~30px — readable without overflowing narrow screens. */}
              <motion.div
                className="sm:hidden absolute bottom-[18%] left-0 w-full px-5 text-center"
                style={sharedStyle}
              >
                <h2
                  className={`font-black tracking-tight leading-none mb-2 ${h2ColorClass} text-[1.875rem]`}
                  style={{ filter: "drop-shadow(0 2px 12px rgba(0,0,0,0.95))" }}
                >
                  {beat.title}
                </h2>
                <p
                  className="text-white/70 text-[0.9rem] mx-auto max-w-xs"
                  style={{ textShadow: "0 1px 8px rgba(0,0,0,0.9)" }}
                >
                  {beat.subtitle}
                </p>
                {beat.showCTA && (
                  <button
                    onClick={handleTelegram}
                    className="pointer-events-auto mt-5 px-7 py-3 bg-[#FF3B30] text-white font-semibold text-base rounded-full active:scale-95 transition-all duration-200 shadow-lg shadow-red-500/25"
                  >
                    Заказать сайт
                  </button>
                )}
              </motion.div>

              {/* ── DESKTOP (hidden below sm) ───────────────────────────────
                  Original layout: center / left / right at viewport midpoint. */}
              <motion.div
                className="hidden sm:block absolute top-1/2 w-full max-w-4xl px-6"
                style={sharedStyle}
              >
                <div className={`absolute top-0 -translate-y-1/2 ${alignClasses[beat.align]}`}>
                  <h2 className={`font-black tracking-tight leading-none mb-3 ${h2ColorClass} ${h2SizeDesktop}`}>
                    {beat.title}
                  </h2>
                  <p
                    className="text-white/60 text-[1.31rem] md:text-[1.575rem] max-w-lg"
                    style={{ marginLeft: pMargin, marginRight: pMarginR }}
                  >
                    {beat.subtitle}
                  </p>
                  {beat.showCTA && (
                    <button
                      onClick={handleTelegram}
                      className="pointer-events-auto mt-6 px-8 py-3 bg-[#FF3B30] text-white font-semibold text-lg rounded-full hover:bg-red-600 hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg shadow-red-500/25"
                    >
                      Заказать сайт
                    </button>
                  )}
                </div>
              </motion.div>

            </Fragment>
          );
        })}
      </div>
    </main>
  );
}
