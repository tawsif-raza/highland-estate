"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface PanoramaViewerProps {
  src: string;
  title: string;
  isOpen: boolean;
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/*  Equirectangular → screen projection on a 2-D canvas               */
/* ------------------------------------------------------------------ */

/**
 * Renders one frame of the panorama onto `canvas`.
 * Uses equirectangular → sphere projection via a sampled 2-D canvas.
 * step=2 gives a good quality / speed balance; step=4 if you need more FPS.
 */
function renderFrame(
  canvas: HTMLCanvasElement,
  panoData: ImageData,
  panoW: number,
  panoH: number,
  yawDeg: number,
  pitchDeg: number,
  fovDeg: number,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const out = ctx.createImageData(w, h);
  const od = out.data;
  const pd = panoData.data;

  const fovRad = (fovDeg * Math.PI) / 180;
  const halfTan = Math.tan(fovRad / 2);
  const aspect = w / h;

  const yr = (yawDeg * Math.PI) / 180;
  const pr = (pitchDeg * Math.PI) / 180;
  const cP = Math.cos(pr);
  const sP = Math.sin(pr);
  const cY = Math.cos(yr);
  const sY = Math.sin(yr);

  const step = 2; // sample every N pixels for performance

  for (let sy = 0; sy < h; sy += step) {
    for (let sx = 0; sx < w; sx += step) {
      // Map screen pixel → unit sphere ray
      const nx = ((2 * sx) / w - 1) * halfTan * aspect;
      const ny = (1 - (2 * sy) / h) * halfTan;

      // Rotate by pitch (around X axis)
      const y1 = ny * cP - sP;
      const z1 = ny * sP + cP;

      // Rotate by yaw (around Y axis)
      const x2 = nx * cY + z1 * sY;
      const z2 = -nx * sY + z1 * cY;

      // Convert to equirectangular UV
      const theta = Math.atan2(x2, z2);
      const phi = Math.atan2(y1, Math.sqrt(x2 * x2 + z2 * z2));
      let px = ((theta / Math.PI + 1) / 2) * panoW;
      let py = (0.5 - phi / Math.PI) * panoH;

      px = ((Math.floor(px) % panoW) + panoW) % panoW;
      py = Math.max(0, Math.min(panoH - 1, Math.floor(py)));

      const pi = (py * panoW + px) * 4;

      // Fill step×step block of output pixels
      for (let dy = 0; dy < step && sy + dy < h; dy++) {
        for (let dx = 0; dx < step && sx + dx < w; dx++) {
          const di = ((sy + dy) * w + (sx + dx)) * 4;
          od[di]     = pd[pi];
          od[di + 1] = pd[pi + 1];
          od[di + 2] = pd[pi + 2];
          od[di + 3] = 255;
        }
      }
    }
  }

  ctx.putImageData(out, 0, 0);
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PanoramaViewer({
  src,
  title,
  isOpen,
  onClose,
}: PanoramaViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // All per-frame view state in refs — avoids re-renders mid-animation.
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const fovRef = useRef(75);
  const draggingRef = useRef(false);
  const autoRotateRef = useRef(true);
  const lastXRef = useRef(0);
  const lastYRef = useRef(0);
  const animRef = useRef(0);

  // `loaded` and `error` drive Tailwind conditional classes for show/hide.
  // Because the parent keys this component on the active spot's id, React
  // remounts it fresh for each panorama — no need to reset state inside an
  // effect (which would violate react-hooks/set-state-in-effect).
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  /* ---- load + render loop ---- */
  useEffect(() => {
    if (!isOpen || !src) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas to fill the viewport before we start drawing.
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    let cancelled = false;

    const img = new Image();
    // No crossOrigin needed — images are served from the same origin (/public).

    img.onload = () => {
      if (cancelled) return;

      // Read panorama pixels into an ImageData once, reuse every frame.
      const tmp = document.createElement("canvas");
      tmp.width  = img.width;
      tmp.height = img.height;
      const tCtx = tmp.getContext("2d");
      if (!tCtx) return;
      tCtx.drawImage(img, 0, 0);
      const panoData = tCtx.getImageData(0, 0, img.width, img.height);

      // ---- animation loop ----
      const loop = () => {
        if (cancelled) return;

        // Resize to match the window if it changed.
        const cvs = canvasRef.current;
        if (!cvs) return;
        if (cvs.width !== window.innerWidth || cvs.height !== window.innerHeight) {
          cvs.width  = window.innerWidth;
          cvs.height = window.innerHeight;
        }

        if (autoRotateRef.current && !draggingRef.current) {
          yawRef.current += 0.05; // degrees/frame ≈ 3°/s at 60 FPS
        }

        renderFrame(
          cvs,
          panoData,
          img.width,
          img.height,
          yawRef.current,
          pitchRef.current,
          fovRef.current,
        );

        animRef.current = requestAnimationFrame(loop);
      };

      loop();

      // Reveal canvas (hides the spinner)
      setLoaded(true);
    };

    img.onerror = () => {
      if (!cancelled) setError(true);
    };

    img.src = src;

    return () => {
      cancelled = true;
      cancelAnimationFrame(animRef.current);
    };
  }, [isOpen, src]);

  /* ---- window resize ---- */
  useEffect(() => {
    if (!loaded) return;
    const onResize = () => {
      const c = canvasRef.current;
      if (!c) return;
      c.width  = window.innerWidth;
      c.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [loaded]);

  /* ---- Escape key ---- */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  /* ---- pointer handlers ---- */
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    draggingRef.current = true;
    autoRotateRef.current = false;
    lastXRef.current = e.clientX;
    lastYRef.current = e.clientY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - lastXRef.current;
    const dy = e.clientY - lastYRef.current;
    yawRef.current  -= dx * 0.3;
    pitchRef.current = Math.max(-85, Math.min(85, pitchRef.current + dy * 0.3));
    lastXRef.current = e.clientX;
    lastYRef.current = e.clientY;
  }, []);

  const handlePointerUp = useCallback(() => {
    draggingRef.current = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    fovRef.current = Math.max(30, Math.min(100, fovRef.current + e.deltaY * 0.05));
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[60] flex flex-col bg-black"
        >
          {/* Header bar */}
          <div className="flex items-center justify-between bg-black/80 px-5 py-3 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <span className="text-lg">🔭</span>
              <h3 className="font-lora text-lg text-white">{title}</h3>
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/60">
                360°
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xl text-white/80 transition-colors hover:bg-white/20 hover:text-white"
              aria-label="Close panorama viewer"
            >
              ×
            </button>
          </div>

          {/* Viewport */}
          <div className="relative flex-1">
            {/* Loading spinner */}
            {!loaded && !error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                <p className="text-sm text-white/60">Loading panorama…</p>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <p className="text-sm text-red-400">Could not load panorama image.</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full bg-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/20"
                >
                  Go Back
                </button>
              </div>
            )}

            {/* Canvas — always in DOM once isOpen; opacity driven by React state */}
            <canvas
              ref={canvasRef}
              className={`h-full w-full cursor-grab active:cursor-grabbing transition-opacity duration-500 ${
                loaded ? "opacity-100" : "opacity-0"
              }`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onWheel={handleWheel}
            />

            {/* Controls hint — fades out after 3 s */}
            {loaded && (
              <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ delay: 3, duration: 1 }}
                className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-5 py-2.5 text-sm text-white/80 backdrop-blur-sm"
              >
                Drag to look around · Scroll to zoom · Esc to close
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
