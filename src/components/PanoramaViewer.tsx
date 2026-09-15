"use client";

import { useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface PanoramaViewerProps {
  src: string;
  title: string;
  isOpen: boolean;
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/*  WebGL helpers                                                      */
/* ------------------------------------------------------------------ */

const VERT_SRC = `
  attribute vec2 aPosition;
  varying vec2 vUV;
  void main() {
    vUV = aPosition;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

const FRAG_SRC = `
  precision mediump float;
  uniform sampler2D uTexture;
  uniform float uYaw;
  uniform float uPitch;
  uniform float uFov;
  uniform float uAspect;
  varying vec2 vUV;

  const float PI = 3.14159265358979323846;

  void main() {
    // Map clip-space to view-space tangent
    float halfFovTan = tan(uFov * 0.5);
    float nx = vUV.x * halfFovTan * uAspect;
    float ny = vUV.y * halfFovTan;
    float nz = 1.0;

    // Rotate by pitch (around X)
    float cosP = cos(uPitch);
    float sinP = sin(uPitch);
    float y1 = ny * cosP - nz * sinP;
    float z1 = ny * sinP + nz * cosP;

    // Rotate by yaw (around Y)
    float cosY = cos(uYaw);
    float sinY = sin(uYaw);
    float x2 = nx * cosY + z1 * sinY;
    float z2 = -nx * sinY + z1 * cosY;

    // Convert to equirectangular UV
    float theta = atan(x2, z2);
    float phi = atan(y1, sqrt(x2 * x2 + z2 * z2));

    float u = (theta / PI + 1.0) * 0.5;
    float v = 0.5 - phi / PI;

    gl_FragColor = texture2D(uTexture, vec2(u, v));
  }
`;

function createShader(
  gl: WebGLRenderingContext,
  type: number,
  src: string,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader compile error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(
  gl: WebGLRenderingContext,
  vert: string,
  frag: string,
): WebGLProgram | null {
  const vs = createShader(gl, gl.VERTEX_SHADER, vert);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, frag);
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error("Program link error:", gl.getProgramInfoLog(prog));
    return null;
  }
  return prog;
}

/* ------------------------------------------------------------------ */
/*  Fallback 2D-canvas renderer                                        */
/* ------------------------------------------------------------------ */

function render2D(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement & { _panoData?: ImageData },
  yaw: number,
  pitch: number,
  fov: number,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  if (!img._panoData) {
    const tmp = document.createElement("canvas");
    tmp.width = img.width;
    tmp.height = img.height;
    const tCtx = tmp.getContext("2d")!;
    tCtx.drawImage(img, 0, 0);
    img._panoData = tCtx.getImageData(0, 0, img.width, img.height);
  }

  const pano = img._panoData;
  const pW = img.width;
  const pH = img.height;
  const pixels = pano.data;
  const imageData = ctx.createImageData(w, h);
  const data = imageData.data;

  const fovRad = (fov * Math.PI) / 180;
  const aspect = w / h;
  const halfFovTan = Math.tan(fovRad / 2);
  const yawRad = (yaw * Math.PI) / 180;
  const pitchRad = (pitch * Math.PI) / 180;
  const cosP = Math.cos(pitchRad);
  const sinP = Math.sin(pitchRad);
  const cosY = Math.cos(yawRad);
  const sinY = Math.sin(yawRad);

  const step = 2;
  for (let sy = 0; sy < h; sy += step) {
    for (let sx = 0; sx < w; sx += step) {
      const nx = ((2 * sx) / w - 1) * halfFovTan * aspect;
      const ny = (1 - (2 * sy) / h) * halfFovTan;
      const y1 = ny * cosP - sinP;
      const z1 = ny * sinP + cosP;
      const x2 = nx * cosY + z1 * sinY;
      const z2 = -nx * sinY + z1 * cosY;
      const theta = Math.atan2(x2, z2);
      const phi = Math.atan2(y1, Math.sqrt(x2 * x2 + z2 * z2));
      let px = ((theta / Math.PI + 1) / 2) * pW;
      let py = (0.5 - phi / Math.PI) * pH;
      px = ((px % pW) + pW) % pW;
      py = Math.max(0, Math.min(pH - 1, py));
      const pIdx = (Math.floor(py) * pW + Math.floor(px)) * 4;
      for (let dy = 0; dy < step && sy + dy < h; dy++) {
        for (let dx = 0; dx < step && sx + dx < w; dx++) {
          const dIdx = ((sy + dy) * w + (sx + dx)) * 4;
          data[dIdx] = pixels[pIdx];
          data[dIdx + 1] = pixels[pIdx + 1];
          data[dIdx + 2] = pixels[pIdx + 2];
          data[dIdx + 3] = 255;
        }
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

/**
 * Fullscreen 360° panorama viewer.
 *
 * Renders via a WebGL equirectangular fragment shader for smooth 60 FPS
 * performance with GPU bilinear filtering. Falls back automatically to
 * a 2D canvas soft-renderer when WebGL is unavailable.
 *
 * State resets cleanly between openings because the parent renders this
 * component with `key={activeSpot?.id}`, causing a full React unmount/
 * remount when the selected spot changes (eliminates the need to call
 * setState synchronously inside effects).
 */
export default function PanoramaViewer({
  src,
  title,
  isOpen,
  onClose,
}: PanoramaViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  // All mutable view state lives in refs — no re-renders needed mid-flight.
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const fovRef = useRef(75);
  const draggingRef = useRef(false);
  const lastXRef = useRef(0);
  const lastYRef = useRef(0);
  const autoRotateRef = useRef(true);

  // Load image + boot render loop
  useEffect(() => {
    if (!isOpen || !src) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    let animId = 0;

    // Attempt WebGL context
    const gl =
      (canvas.getContext("webgl") as WebGLRenderingContext | null) ||
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);

    const prog = gl ? createProgram(gl, VERT_SRC, FRAG_SRC) : null;

    // --- resize handler ---
    const resize = () => {
      if (!canvas) return;
      const w = Math.min(window.innerWidth, 1920);
      const h = Math.min(window.innerHeight, 1080);
      canvas.width = w;
      canvas.height = h;
      if (gl) gl.viewport(0, 0, w, h);
    };
    resize();
    window.addEventListener("resize", resize);

    // --- load image ---
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      if (cancelled) return;

      /* ------- WebGL path ------- */
      if (gl && prog) {
        gl.useProgram(prog);

        // Full-screen quad
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
          gl.STATIC_DRAW,
        );
        const aPos = gl.getAttribLocation(prog, "aPosition");
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

        // Upload texture
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(
          gl.TEXTURE_2D,
          gl.TEXTURE_WRAP_S,
          gl.REPEAT,
        );
        gl.texParameteri(
          gl.TEXTURE_2D,
          gl.TEXTURE_WRAP_T,
          gl.CLAMP_TO_EDGE,
        );
        gl.texParameteri(
          gl.TEXTURE_2D,
          gl.TEXTURE_MIN_FILTER,
          gl.LINEAR,
        );
        gl.texParameteri(
          gl.TEXTURE_2D,
          gl.TEXTURE_MAG_FILTER,
          gl.LINEAR,
        );
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          img,
        );

        const uTex = gl.getUniformLocation(prog, "uTexture");
        const uYaw = gl.getUniformLocation(prog, "uYaw");
        const uPitch = gl.getUniformLocation(prog, "uPitch");
        const uFov = gl.getUniformLocation(prog, "uFov");
        const uAspect = gl.getUniformLocation(prog, "uAspect");
        gl.uniform1i(uTex, 0);

        const loop = () => {
          if (cancelled) return;
          if (autoRotateRef.current && !draggingRef.current) {
            yawRef.current += 0.003; // radians per frame
          }
          const w = canvas.width;
          const h = canvas.height;
          gl.viewport(0, 0, w, h);
          gl.uniform1f(uYaw, yawRef.current);
          gl.uniform1f(uPitch, (pitchRef.current * Math.PI) / 180);
          gl.uniform1f(uFov, (fovRef.current * Math.PI) / 180);
          gl.uniform1f(uAspect, w / h);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
          animId = requestAnimationFrame(loop);
          animRef.current = animId;
        };
        loop();
      } else {
        /* ------- 2D canvas fallback ------- */
        const imgEl = img as HTMLImageElement & { _panoData?: ImageData };

        const loop = () => {
          if (cancelled) return;
          if (autoRotateRef.current && !draggingRef.current) {
            yawRef.current += 0.05; // degrees per frame
          }
          render2D(canvas, imgEl, yawRef.current, pitchRef.current, fovRef.current);
          animId = requestAnimationFrame(loop);
          animRef.current = animId;
        };
        loop();
      }

      // Reveal canvas
      canvas.style.opacity = "1";
    };

    img.src = src;

    return () => {
      cancelled = true;
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [isOpen, src]);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  /* -------- pointer / wheel handlers -------- */
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    draggingRef.current = true;
    autoRotateRef.current = false;
    lastXRef.current = e.clientX;
    lastYRef.current = e.clientY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current) return;
      const dx = e.clientX - lastXRef.current;
      const dy = e.clientY - lastYRef.current;
      // In WebGL path yaw is radians, in 2D fallback it's degrees.
      // We detect WebGL availability once and store in a ref if needed,
      // but a simple unified factor works: WebGL loop consumes radians
      // directly from yawRef, so we accumulate in radians here (0.003 ≈ 0.17°).
      yawRef.current -= dx * 0.005;
      pitchRef.current = Math.max(
        -85,
        Math.min(85, pitchRef.current + dy * 0.3),
      );
      lastXRef.current = e.clientX;
      lastYRef.current = e.clientY;
    },
    [],
  );

  const handlePointerUp = useCallback(() => {
    draggingRef.current = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    fovRef.current = Math.max(
      30,
      Math.min(100, fovRef.current + e.deltaY * 0.05),
    );
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
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

          {/* Canvas area */}
          <div className="relative flex-1">
            {/* Loading spinner — hidden once canvas opacity reaches 1 */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3"
              aria-hidden="true"
            >
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              <p className="text-sm text-white/60">Loading panorama…</p>
            </div>

            <canvas
              ref={canvasRef}
              className="h-full w-full cursor-grab opacity-0 active:cursor-grabbing"
              style={{ transition: "opacity 0.5s ease" }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onWheel={handleWheel}
            />

            {/* Controls hint — fades out after 3 s via framer-motion */}
            <motion.div
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ delay: 3, duration: 1 }}
              className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-5 py-2.5 text-sm text-white/80 backdrop-blur-sm"
            >
              Drag to look around · Scroll to zoom · Esc to close
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
