"use client";

import { lazy, Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { MathUtils, type DirectionalLight, type FogExp2, type HemisphereLight } from "three";
import type { MotionValue } from "framer-motion";
import type { QualityTier } from "@/hooks/useQualityTier";
import type { SceneEnvironment } from "@/lib/hero-environment";
import CameraRig from "./CameraRig";
import Cabins from "./Cabins";
import Mist from "./Mist";
import Particles from "./Particles";
import Ridges from "./Ridges";
import Sky from "./Sky";
import { easeLive, useLive } from "./liveEnv";

// Post-processing is only ever downloaded on the high tier.
const Effects = lazy(() => import("./Effects"));

export interface HeroSceneProps {
  /** Where the scene is heading (live time + weather, or a manual override). */
  environment: SceneEnvironment;
  /** Where the scene starts — matches the dusk poster so the fade-in is seamless. */
  initialEnvironment: SceneEnvironment;
  tier: QualityTier;
  scroll: MotionValue<number>;
  /** False pauses rendering entirely (off-screen or tab hidden). */
  active: boolean;
  onReady: () => void;
  onContextLost: () => void;
  /** Called when the measured frame rate is too low; the parent lowers the tier. */
  onDegrade: () => void;
}

const FIRST_FRAMES_BEFORE_READY = 4;

const MONITOR_WARMUP_SECONDS = 4;
const MONITOR_WINDOW_SECONDS = 3;
const MONITOR_MIN_FPS = 28;

// Watches real frame times. If the device can't keep up, the parent steps the
// quality tier down (and eventually falls back to the still poster).
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

  const envRef = useRef(environment);
  useEffect(() => {
    envRef.current = environment;
  }, [environment]);

  const fogRef = useRef<FogExp2>(null);
  const hemiRef = useRef<HemisphereLight>(null);
  const sunRef = useRef<DirectionalLight>(null);
  const frames = useRef(0);
  const announced = useRef(false);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const l = live.current;
    easeLive(l, envRef.current, delta);

    const fog = fogRef.current;
    if (fog) {
      fog.color.copy(l.fog);
      fog.density = l.fogDensity;
    }

    const hemi = hemiRef.current;
    if (hemi) {
      hemi.color.copy(l.zenith);
      hemi.intensity = MathUtils.lerp(0.55, 1.05, l.day);
    }

    const sun = sunRef.current;
    if (sun) {
      sun.color.copy(l.celestial);
      sun.intensity = MathUtils.lerp(0.35, 1.3, l.day) * (1 - l.cloud * 0.5);
      sun.position.copy(l.sunDir).multiplyScalar(60);
    }

    frames.current += 1;
    if (!announced.current && frames.current >= FIRST_FRAMES_BEFORE_READY) {
      announced.current = true;
      onReady();
    }
  });

  return (
    <>
      <fogExp2 ref={fogRef} attach="fog" args={["#4a3f4f", 0.02]} />
      <hemisphereLight ref={hemiRef} args={["#8fa6d0", "#1a120c", 0.7]} />
      <directionalLight ref={sunRef} args={["#ffb36b", 0.8]} />

      <Sky live={live} />
      <Ridges live={live} tier={tier} />
      <Mist live={live} tier={tier} />
      <Cabins live={live} />
      <Particles live={live} tier={tier} />
      <CameraRig scroll={scroll} />
      <FrameMonitor onDegrade={onDegrade} />

      <Suspense fallback={null}>{tier === "high" && <Effects />}</Suspense>
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
  onDegrade,
}: HeroSceneProps) {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, tier === "high" ? 1.75 : 1.5]}
      flat
      // MSAA stays on for every tier (it's cheap on mobile GPUs and ridge edges
      // look stair-stepped without it); the frame monitor drops tiers if it can't keep up.
      gl={{ antialias: true, powerPreference: "high-performance", alpha: false }}
      camera={{ fov: 55, near: 0.1, far: 700, position: [0, 1.3, 14] }}
      style={{ position: "absolute", inset: 0 }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener("webglcontextlost", (event) => {
          event.preventDefault();
          onContextLost();
        });
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
