import { useRef, type RefObject } from "react";
import { Color, MathUtils, Vector3 } from "three";
import type { SceneEnvironment } from "@/lib/hero-environment";

// The scene's *current* look. Every frame the driver eases this toward the
// target SceneEnvironment, so a change of phase or weather glides instead of
// popping. Children read it inside useFrame only — never during render.
export interface LiveEnv {
  zenith: Color;
  horizon: Color;
  celestial: Color;
  fog: Color;
  sunDir: Vector3;
  fogDensity: number;
  mist: number;
  rain: number;
  wind: number;
  cloud: number;
  stars: number;
  windowGlow: number;
  moon: number; // 0 = sun, 1 = moon
  day: number; // 0 (night) … 1 (full daylight)
}

export type LiveRef = RefObject<LiveEnv>;

function dayness(env: SceneEnvironment) {
  return MathUtils.smoothstep(env.sunElevation, -0.05, 0.45);
}

export function createLive(env: SceneEnvironment): LiveEnv {
  return {
    zenith: new Color(env.skyZenith),
    horizon: new Color(env.skyHorizon),
    celestial: new Color(env.celestialColor),
    fog: new Color(env.fogColor),
    sunDir: new Vector3(...env.celestialDirection).normalize(),
    fogDensity: env.fogDensity,
    mist: env.mistOpacity,
    rain: env.rainIntensity,
    wind: env.windStrength,
    cloud: env.cloudCover,
    stars: env.starOpacity,
    windowGlow: env.windowGlow,
    moon: env.celestialIsMoon ? 1 : 0,
    day: dayness(env),
  };
}

/** One LiveEnv per scene, created once from the starting environment. */
export function useLive(initial: SceneEnvironment): LiveRef {
  const ref = useRef<LiveEnv | null>(null);
  if (ref.current === null) ref.current = createLive(initial);
  return ref as LiveRef;
}

const target = {
  zenith: new Color(),
  horizon: new Color(),
  celestial: new Color(),
  fog: new Color(),
  sunDir: new Vector3(),
};

/** Ease `live` toward `env`. `delta` is seconds; `lambda` is how fast (higher = quicker). */
export function easeLive(live: LiveEnv, env: SceneEnvironment, delta: number, lambda = 1.4) {
  const k = 1 - Math.exp(-lambda * delta);

  live.zenith.lerp(target.zenith.set(env.skyZenith), k);
  live.horizon.lerp(target.horizon.set(env.skyHorizon), k);
  live.celestial.lerp(target.celestial.set(env.celestialColor), k);
  live.fog.lerp(target.fog.set(env.fogColor), k);

  target.sunDir.set(...env.celestialDirection).normalize();
  live.sunDir.lerp(target.sunDir, k).normalize();

  live.fogDensity = MathUtils.damp(live.fogDensity, env.fogDensity, lambda, delta);
  live.mist = MathUtils.damp(live.mist, env.mistOpacity, lambda, delta);
  live.rain = MathUtils.damp(live.rain, env.rainIntensity, lambda, delta);
  live.wind = MathUtils.damp(live.wind, env.windStrength, lambda, delta);
  live.cloud = MathUtils.damp(live.cloud, env.cloudCover, lambda, delta);
  live.stars = MathUtils.damp(live.stars, env.starOpacity, lambda, delta);
  live.windowGlow = MathUtils.damp(live.windowGlow, env.windowGlow, lambda, delta);
  live.moon = MathUtils.damp(live.moon, env.celestialIsMoon ? 1 : 0, lambda * 1.5, delta);
  live.day = MathUtils.damp(live.day, dayness(env), lambda, delta);
}
