"use client";

import { useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { MotionValue } from "framer-motion";
import type { QualityTier } from "@/hooks/useQualityTier";
import type { SceneEnvironment } from "@/lib/hero-environment";
import { gradeFor } from "@/lib/hero-grade";
import { easeLive, useLive } from "./liveEnv";
import Birds from "./photo/Birds";
import CameraRig from "./photo/CameraRig";
import Fireflies from "./photo/Fireflies";
import PhotoLayer from "./photo/PhotoLayer";
import Rain from "./photo/Rain";
import { usePhotoTextures } from "./photo/usePhotoTextures";
import { useView } from "./photo/view";

export interface HeroSceneProps {
  /** Where the scene is heading (live time + weather, or a manual override). */
  environment: SceneEnvironment;
  /** Where the scene starts — matches the dusk photo so the fade-in is seamless. */
  initialEnvironment: SceneEnvironment;
  tier: QualityTier;
  scroll: MotionValue<number>;
  /** False pauses rendering entirely (off-screen or tab hidden). */
  active: boolean;
  onReady: () => void;
  onContextLost: () => void;
  /** The browser restored a lost WebGL context: the parent remounts the scene. */
  onContextRestored: () => void;
  /** Called when the measured frame rate is too low; the parent lowers the tier. */
  onDegrade: () => void;
}

const FIRST_FRAMES_BEFORE_READY = 4;

const MONITOR_WARMUP_SECONDS = 4;
const MONITOR_WINDOW_SECONDS = 3;
// 24, not 30: phones in low-power mode cap at 30 fps and must not be punished for it.
const MONITOR_MIN_FPS = 24;

// Watches real frame times. If the device can't keep up, the parent steps the
// quality tier down (and eventually falls back to the still photo).
function FrameMonitor({ onDegrade }: { onDegrade: () => void }) {
  const state = useRef({ warmup: MONITOR_WARMUP_SECONDS, time: 0, frames: 0 });

  useFrame((_, delta) => {
    const s = state.current;
    // A huge gap means rendering was paused (tab hidden / scrolled away): start over.
    if (delta > 0.5) {
      s.warmup = 2;
      s.time = 0;
      s.frames = 0;
      return;
    }
    if (s.warmup > 0) {
      s.warmup -= delta;
      return;
    }
    s.time += delta;
    s.frames += 1;
    if (s.time >= MONITOR_WINDOW_SECONDS) {
      const fps = s.frames / s.time;
      s.time = 0;
      s.frames = 0;
      if (fps < MONITOR_MIN_FPS) {
        s.warmup = 2; // let the new tier settle before judging it
        onDegrade();
      }
    }
  });

  return null;
}

function SceneContents({
  environment,
  initialEnvironment,
  tier,
  scroll,
  onReady,
  onDegrade,
}: Pick<HeroSceneProps, "environment" | "initialEnvironment" | "tier" | "scroll" | "onReady" | "onDegrade">) {
  const live = useLive(initialEnvironment);
  const view = useView();
  const textures = usePhotoTextures();

  const envRef = useRef(environment);
  const gradeRef = useRef(gradeFor(environment));
  useEffect(() => {
    envRef.current = environment;
    gradeRef.current = gradeFor(environment);
  }, [environment]);

  const frames = useRef(0);
  const announced = useRef(false);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    easeLive(live.current, envRef.current, gradeRef.current, delta);

    // Only announce once the photo, depth and masks have really been drawn.
    if (!textures || announced.current) return;
    frames.current += 1;
    if (frames.current >= FIRST_FRAMES_BEFORE_READY) {
      announced.current = true;
      onReady();
    }
  });

  return (
    <>
      {textures && (
        <>
          {/* key={tier}: the shader's #defines only take effect on a fresh material, so a
              tier change must recreate it or the quality step-down would do nothing. */}
          <PhotoLayer key={tier} live={live} view={view} tier={tier} textures={textures} />
          <Birds live={live} view={view} tier={tier} textures={textures} />
          <Fireflies live={live} view={view} tier={tier} textures={textures} />
          <Rain live={live} view={view} tier={tier} />
        </>
      )}
      <CameraRig view={view} scroll={scroll} running={textures !== null} />
      <FrameMonitor onDegrade={onDegrade} />
    </>
  );
}

export default function HeroScene({
  environment,
  initialEnvironment,
  tier,
  scroll,
  active,
  onReady,
  onContextLost,
  onContextRestored,
  onDegrade,
}: HeroSceneProps) {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, tier === "high" ? 1.5 : tier === "medium" ? 1.25 : 1]}
      flat
      // The photo is drawn by one full-screen shader, so MSAA has nothing to smooth.
      gl={{ antialias: false, powerPreference: "high-performance", alpha: false }}
      camera={{ position: [0, 0, 1] }}
      style={{ position: "absolute", inset: 0 }}
      onCreated={({ gl }) => {
        // The canvas element is discarded with the scene, so these need no cleanup.
        gl.domElement.addEventListener("webglcontextlost", (event) => {
          event.preventDefault();
          onContextLost();
        });
        gl.domElement.addEventListener("webglcontextrestored", () => onContextRestored());
      }}
    >
      <SceneContents
        environment={environment}
        initialEnvironment={initialEnvironment}
        tier={tier}
        scroll={scroll}
        onReady={onReady}
        onDegrade={onDegrade}
      />
    </Canvas>
  );
}
