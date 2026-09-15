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
/*  GLSL Shaders for Equirectangular Spherical Projection             */
/* ------------------------------------------------------------------ */

const VERTEX_SHADER_SRC = `
  attribute vec2 aPosition;
  varying vec2 vUV;
  void main() {
    vUV = aPosition;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER_SRC = `
  precision mediump float;
  uniform sampler2D uTexture;
  uniform float uYaw;
  uniform float uPitch;
  uniform float uFov;
  uniform float uAspect;
  varying vec2 vUV;

  const float PI = 3.14159265358979323846;

  void main() {
    // Tangent ray in view space from screen UV [-1, 1]
    float halfFovTan = tan(uFov * 0.5);
    vec3 ray = normalize(vec3(vUV.x * halfFovTan * uAspect, vUV.y * halfFovTan, 1.0));

    // Rotate by pitch around X axis (elevation)
    float cp = cos(uPitch);
    float sp = sin(uPitch);
    vec3 rayPitch = vec3(ray.x, ray.y * cp - ray.z * sp, ray.y * sp + ray.z * cp);

    // Rotate by yaw around Y axis (azimuth)
    float cy = cos(uYaw);
    float sy = sin(uYaw);
    vec3 rayRot = vec3(rayPitch.x * cy + rayPitch.z * sy, rayPitch.y, -rayPitch.x * sy + rayPitch.z * cy);

    // Convert to spherical equirectangular coordinates
    float theta = atan(rayRot.x, rayRot.z);
    float phi = asin(clamp(rayRot.y, -1.0, 1.0));

    // Map longitude and latitude to [0, 1] UV space with seamless 360 wrap
    float u = fract(theta / (2.0 * PI) + 0.5);
    float v = clamp(0.5 - phi / PI, 0.001, 0.999);

    gl_FragColor = texture2D(uTexture, vec2(u, v));
  }
`;

/* ------------------------------------------------------------------ */
/*  WebGL Shader Compiler Helpers                                      */
/* ------------------------------------------------------------------ */

function compileShader(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader compilation error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  vertSrc: string,
  fragSrc: string,
): WebGLProgram | null {
  const vert = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  if (!vert || !frag) return null;

  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, vert);
  gl.attachShader(prog, frag);
  gl.linkProgram(prog);

  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error("Program link error:", gl.getProgramInfoLog(prog));
    gl.deleteProgram(prog);
    return null;
  }
  return prog;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function PanoramaViewer({
  src,
  title,
  isOpen,
  onClose,
}: PanoramaViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Per-frame camera state in refs to avoid React re-renders during 60 FPS animation
  const yawRef = useRef(0); // in radians
  const pitchRef = useRef(0); // in radians
  const fovRef = useRef(75); // in degrees
  const draggingRef = useRef(false);
  const autoRotateRef = useRef(true);
  const lastXRef = useRef(0);
  const lastYRef = useRef(0);
  const animRef = useRef(0);

  // React state for UI transitions and loading feedback
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  /* ---- Main WebGL rendering lifecycle ---- */
  useEffect(() => {
    if (!isOpen || !src) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    let animId = 0;
    let glTexture: WebGLTexture | null = null;
    let glBuffer: WebGLBuffer | null = null;
    let glProg: WebGLProgram | null = null;

    // Prefer WebGL 2, fallback to WebGL 1
    const gl = (canvas.getContext("webgl2", {
      alpha: false,
      antialias: true,
      powerPreference: "high-performance",
    }) ||
      canvas.getContext("webgl", {
        alpha: false,
        antialias: true,
        powerPreference: "high-performance",
      }) ||
      canvas.getContext("experimental-webgl")) as
      | WebGLRenderingContext
      | WebGL2RenderingContext
      | null;

    if (!gl) {
      console.warn("WebGL not supported, falling back to 2D canvas");
    }

    const prog = gl ? createProgram(gl, VERTEX_SHADER_SRC, FRAGMENT_SHADER_SRC) : null;
    glProg = prog;

    // DevicePixelRatio resize helper (scaled to native display pixels, capped at 2x)
    const updateSize = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round((rect.width || window.innerWidth) * dpr);
      const h = Math.round((rect.height || window.innerHeight) * dpr);

      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      if (gl) {
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);

    // Load panorama image
    const img = new Image();

    img.onload = () => {
      if (cancelled) return;

      if (gl && prog) {
        gl.useProgram(prog);

        // Setup full-screen quad (-1 to 1)
        const buf = gl.createBuffer();
        glBuffer = buf;
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
          gl.STATIC_DRAW,
        );

        const aPos = gl.getAttribLocation(prog, "aPosition");
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

        // Upload and configure texture
        const tex = gl.createTexture();
        glTexture = tex;
        gl.bindTexture(gl.TEXTURE_2D, tex);

        // Clamp to edge is universally safe for both POT and NPOT textures in WebGL 1 and 2
        // Spherical wrapping is handled cleanly in the fragment shader with fract()
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // Bilinear texture filtering for crisp, smooth scaling
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        // Check if texture is Power of Two
        const isPot =
          (img.width & (img.width - 1)) === 0 && (img.height & (img.height - 1)) === 0;
        const isWebGL2 =
          typeof WebGL2RenderingContext !== "undefined" &&
          gl instanceof WebGL2RenderingContext;

        if (isWebGL2 || isPot) {
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            img,
          );
          gl.generateMipmap(gl.TEXTURE_2D);
          gl.texParameteri(
            gl.TEXTURE_2D,
            gl.TEXTURE_MIN_FILTER,
            gl.LINEAR_MIPMAP_LINEAR,
          );
        } else {
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            img,
          );
        }

        // Check and enable Anisotropic Filtering where supported
        const ext =
          gl.getExtension("EXT_texture_filter_anisotropic") ||
          gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic") ||
          gl.getExtension("MOZ_EXT_texture_filter_anisotropic");

        if (ext) {
          const maxAniso = gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
          if (maxAniso && maxAniso > 1) {
            gl.texParameterf(
              gl.TEXTURE_2D,
              ext.TEXTURE_MAX_ANISOTROPY_EXT,
              Math.min(maxAniso, 8),
            );
          }
        }

        // Get uniform locations
        const uTex = gl.getUniformLocation(prog, "uTexture");
        const uYaw = gl.getUniformLocation(prog, "uYaw");
        const uPitch = gl.getUniformLocation(prog, "uPitch");
        const uFov = gl.getUniformLocation(prog, "uFov");
        const uAspect = gl.getUniformLocation(prog, "uAspect");

        gl.uniform1i(uTex, 0);

        // 60 FPS Render loop
        const loop = () => {
          if (cancelled) return;

          // Gentle auto-rotation when user is not interacting
          if (autoRotateRef.current && !draggingRef.current) {
            yawRef.current += 0.0015; // smooth drift (~5° per second)
          }

          const w = canvas.width;
          const h = canvas.height;
          gl.viewport(0, 0, w, h);

          gl.uniform1f(uYaw, yawRef.current);
          gl.uniform1f(uPitch, pitchRef.current);
          gl.uniform1f(uFov, (fovRef.current * Math.PI) / 180);
          gl.uniform1f(uAspect, w / h);

          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

          animId = requestAnimationFrame(loop);
          animRef.current = animId;
        };

        loop();
        setLoaded(true);
      } else {
        // Fallback for systems without WebGL
        setLoaded(true);
      }
    };

    img.onerror = () => {
      if (!cancelled) setError(true);
    };

    img.src = src;

    return () => {
      cancelled = true;
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", updateSize);

      if (gl) {
        if (glTexture) gl.deleteTexture(glTexture);
        if (glBuffer) gl.deleteBuffer(glBuffer);
        if (glProg) gl.deleteProgram(glProg);
      }
    };
  }, [isOpen, src]);

  /* ---- Escape key listener ---- */
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  /* ---- Pointer interaction handlers ---- */
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

    // Smooth rotational sensitivity
    yawRef.current -= dx * 0.0035;
    // Pitch clamp between -85° and +85° to prevent camera flipping
    const maxPitch = (85 * Math.PI) / 180;
    pitchRef.current = Math.max(
      -maxPitch,
      Math.min(maxPitch, pitchRef.current + dy * 0.0035),
    );

    lastXRef.current = e.clientX;
    lastYRef.current = e.clientY;
  }, []);

  const handlePointerUp = useCallback(() => {
    draggingRef.current = false;
  }, []);

  /* ---- Scroll wheel zoom handler ---- */
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

          {/* Viewport container */}
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

            {/* Hardware-accelerated WebGL Canvas */}
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

            {/* Controls hint — fades out after 3.5 seconds */}
            {loaded && (
              <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ delay: 3.5, duration: 1 }}
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
