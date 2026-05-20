"use client";

import { useEffect, useRef, useState } from "react";
import { useScroll, useSpring, motion } from "framer-motion";

const VIDEO_SRC = "/wind.mp4";

interface WindExplosionProps {
  onProgress: (progress: number) => void;
  onLoaded?: () => void;
}

export default function WindExplosion({ onProgress, onLoaded }: WindExplosionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const durationRef = useRef<number>(0);
  const targetTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number>(0);
  const [ready, setReady] = useState(false);
  const [loadingPercent, setLoadingPercent] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
  });

  // Track download progress + readiness
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    let done = false;
    const markReady = () => {
      if (done) return;
      done = true;
      durationRef.current = v.duration || 0;
      setLoadingPercent(100);
      setReady(true);
      onLoaded?.();
    };

    const onProgressEvt = () => {
      if (v.duration && v.buffered.length > 0) {
        const loaded = v.buffered.end(v.buffered.length - 1);
        const pct = Math.round((loaded / v.duration) * 100);
        setLoadingPercent(pct);
        if (pct >= 99) markReady();
      }
    };
    const onLoadedMeta = () => {
      durationRef.current = v.duration || 0;
    };

    v.addEventListener("progress", onProgressEvt);
    v.addEventListener("loadeddata", markReady);
    v.addEventListener("canplay", markReady);
    v.addEventListener("canplaythrough", markReady);
    v.addEventListener("loadedmetadata", onLoadedMeta);

    // Safety fallback: if events somehow stall, force-ready after 8s once any data loaded
    const fallback = window.setTimeout(() => {
      if (v.readyState >= 2) markReady();
    }, 8000);

    return () => {
      v.removeEventListener("progress", onProgressEvt);
      v.removeEventListener("loadeddata", markReady);
      v.removeEventListener("canplay", markReady);
      v.removeEventListener("canplaythrough", markReady);
      v.removeEventListener("loadedmetadata", onLoadedMeta);
      window.clearTimeout(fallback);
    };
  }, [onLoaded]);

  // Drive video currentTime from scroll
  useEffect(() => {
    if (!ready) return;
    const v = videoRef.current;
    if (!v) return;

    let lastApplied = -1;

    const tick = () => {
      const progress = smoothProgress.get();
      onProgress(progress);
      const dur = durationRef.current;
      if (dur > 0) {
        const t = Math.min(Math.max(progress * dur, 0), dur - 0.001);
        targetTimeRef.current = t;
        // Only seek when meaningfully changed (~1/4 frame at 24fps = 0.01s)
        if (Math.abs(t - lastApplied) > 0.01) {
          try {
            v.currentTime = t;
            lastApplied = t;
          } catch {}
        }
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [ready, smoothProgress, onProgress]);

  const [showIndicator, setShowIndicator] = useState(true);
  useEffect(() => {
    const unsub = smoothProgress.on("change", (v: number) => {
      setShowIndicator(v < 0.1);
    });
    return unsub;
  }, [smoothProgress]);

  return (
    <div ref={containerRef} className="relative" style={{ height: "400vh" }}>
      <div className="sticky top-0 h-screen w-full flex items-center justify-center bg-[#050505] overflow-hidden">
        {!ready && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#050505]">
            <div className="w-16 h-16 border-2 border-white/20 border-t-[#FF3B30] rounded-full animate-spin mb-6" />
            <p className="text-white/60 text-sm mb-2">Загрузка...</p>
            <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div className="h-full bg-[#FF3B30]" animate={{ width: loadingPercent + "%" }} transition={{ duration: 0.3 }} />
            </div>
            <p className="text-white/40 text-xs mt-2">{loadingPercent}%</p>
          </div>
        )}

        <video
          ref={videoRef}
          src={VIDEO_SRC}
          className="absolute inset-0 w-full h-full object-contain"
          style={{ visibility: ready ? "visible" : "hidden" }}
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
        />

        {ready && showIndicator && (
          <motion.div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2" initial={{ opacity: 1 }} animate={{ opacity: showIndicator ? 1 : 0 }} transition={{ duration: 0.3 }}>
            <span className="text-white/40 text-sm">Прокрути вниз</span>
            <motion.div className="w-5 h-5 border-r-2 border-b-2 border-white/40 rotate-45" animate={{ y: [0, 8, 0] }} transition={{ duration: 1.5, repeat: Infinity }} />
          </motion.div>
        )}
      </div>
    </div>
  );
}
