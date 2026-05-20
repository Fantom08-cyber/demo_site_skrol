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
  const animFrameRef = useRef<number>(0);
  const blobUrlRef = useRef<string>("");
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

  // Pre-fetch entire video as blob so all frames are in memory before seeking starts.
  // This avoids the "canplay fires early → seek to unbuffered frame → freeze" problem.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    let cancelled = false;

    const fetchVideo = async () => {
      try {
        const response = await fetch(VIDEO_SRC);
        const contentLength = +(response.headers.get("Content-Length") ?? 0);
        const reader = response.body?.getReader();
        if (!reader) return;

        const chunks: Uint8Array<ArrayBuffer>[] = [];
        let received = 0;

        // Stream download with real-time progress
        while (true) {
          const { done, value } = await reader.read();
          if (done || cancelled) break;
          chunks.push(value);
          received += value.length;
          if (contentLength > 0) {
            setLoadingPercent(Math.round((received / contentLength) * 100));
          }
        }

        if (cancelled) return;

        // All bytes in memory → create blob URL
        const blob = new Blob(chunks, { type: "video/mp4" });
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        v.src = url;

        // Wait for metadata so we have an accurate duration
        await new Promise<void>((resolve) => {
          if (v.readyState >= 1) { resolve(); return; }
          const onMeta = () => { v.removeEventListener("loadedmetadata", onMeta); resolve(); };
          v.addEventListener("loadedmetadata", onMeta);
        });

        if (cancelled) return;
        durationRef.current = v.duration || 0;
        setLoadingPercent(100);
        setReady(true);
        onLoaded?.();
      } catch (err) {
        console.error("[WindExplosion] fetch failed:", err);
      }
    };

    fetchVideo();

    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = "";
      }
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

        {/* src is set dynamically via JS after blob is ready — do NOT set src attribute here */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover sm:object-contain"
          style={{ visibility: ready ? "visible" : "hidden" }}
          muted
          playsInline
          preload="none"
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
