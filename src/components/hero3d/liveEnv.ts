import { useRef, type RefObject } from "react";
import { Color, MathUtils, Vector2 } from "three";
import type { SceneEnvironment } from "@/lib/hero-environment";
import { gradeFor, type PhotoGrade } from "@/lib/hero-grade";

// The look of the scene *right now*. Every frame it eases toward the target
// (real time + real weather, or a manual override), so a change of hour or
// weather glides instead of popping. Children read it inside useFrame only.
export interface LiveGrade {
  exposure: number;
  saturation: number;
  shadowLift: number;
  skyReplace: number;
  lightGain: number;
  rays: number;
  wet: number;
  cloudShadow: number;
  farHaze: number;
  mist: number;
  cloud: number;
  wind: number;
  rain: number;
  stars: number;
  day: number;
  sunLevel: number;
  moonLevel: number;
  tint: Color;
  zenith: Color;
  horizon: Color;
  fog: Color;
  sunColor: Color;
  /** Sun and moon positions in the photo's own space (y measured from the top). */
  sunUv: Vector2;
  moonUv: Vector2;
}

export type LiveRef = RefObject<LiveGrade>;

export const MOON_COLOR = new Color("#a9bcff");
const SUN_DAY_COLOR = new Color("#fff1d0");

const tmp = new Color();
const tmpA = new Vector2();
const tmpB = new Vector2();

// The photo's baked sunset glow sits upper-left, so the sun sets on the left and
// rises on the right. The moon travels across the OPEN sky (upper right), because
// the tall trees on the left would hide it.
function sunPosition(env: SceneEnvironment, out: Vector2) {
  if (!env.celestialIsMoon) {
    const d = env.celestialDirection;
    return out.set(0.5 - d[0] * 0.54, 0.27 - d[1] * 0.4);
  }
  return out.set(env.isMorning ? 0.8 : 0.2, 0.27);
}

function moonPosition(env: SceneEnvironment, out: Vector2) {
  if (env.celestialIsMoon) {
    const d = env.celestialDirection;
    return out.set(0.82 - d[0] * 0.22, 0.3 - (d[1] - 0.1) * 0.25);
  }
  return out.set(0.86, 0.3);
}

function sunColor(env: SceneEnvironment, out: Color) {
  return env.celestialIsMoon ? out.copy(SUN_DAY_COLOR) : out.set(env.celestialColor);
}

export function createLive(env: SceneEnvironment, grade: PhotoGrade): LiveGrade {
  return {
    exposure: grade.exposure,
    saturation: grade.saturation,
    shadowLift: grade.shadowLift,
    skyReplace: grade.skyReplace,
    lightGain: grade.lightGain,
    rays: grade.rays,
    wet: grade.wet,
    cloudShadow: grade.cloudShadow,
    farHaze: grade.farHaze,
    mist: grade.mist,
    cloud: grade.cloud,
    wind: grade.wind,
    rain: grade.rain,
    stars: grade.stars,
    day: grade.day,
    sunLevel: grade.sunLevel,
    moonLevel: grade.moonLevel,
    tint: new Color().setRGB(grade.tint[0], grade.tint[1], grade.tint[2]),
    zenith: new Color(env.skyZenith),
    horizon: new Color(env.skyHorizon),
    fog: new Color(env.fogColor),
    sunColor: sunColor(env, new Color()),
    sunUv: sunPosition(env, new Vector2()),
    moonUv: moonPosition(env, new Vector2()),
  };
}

/** One LiveGrade per scene, created once from the starting environment. */
export function useLive(initial: SceneEnvironment): LiveRef {
  const ref = useRef<LiveGrade | null>(null);
  if (ref.current === null) ref.current = createLive(initial, gradeFor(initial));
  return ref as LiveRef;
}

/** Ease `live` toward the target. `delta` is seconds; higher `lambda` = faster. */
export function easeLive(
  live: LiveGrade,
  env: SceneEnvironment,
  grade: PhotoGrade,
  delta: number,
  lambda = 1.1,
) {
  const k = 1 - Math.exp(-lambda * delta);
  const damp = (current: number, target: number) => MathUtils.damp(current, target, lambda, delta);

  live.exposure = damp(live.exposure, grade.exposure);
  live.saturation = damp(live.saturation, grade.saturation);
  live.shadowLift = damp(live.shadowLift, grade.shadowLift);
  live.skyReplace = damp(live.skyReplace, grade.skyReplace);
  live.lightGain = damp(live.lightGain, grade.lightGain);
  live.rays = damp(live.rays, grade.rays);
  live.wet = damp(live.wet, grade.wet);
  live.cloudShadow = damp(live.cloudShadow, grade.cloudShadow);
  live.farHaze = damp(live.farHaze, grade.farHaze);
  live.mist = damp(live.mist, grade.mist);
  live.cloud = damp(live.cloud, grade.cloud);
  live.wind = damp(live.wind, grade.wind);
  live.rain = damp(live.rain, grade.rain);
  live.stars = damp(live.stars, grade.stars);
  live.day = damp(live.day, grade.day);
  live.sunLevel = damp(live.sunLevel, grade.sunLevel);
  live.moonLevel = damp(live.moonLevel, grade.moonLevel);

  live.tint.lerp(tmp.setRGB(grade.tint[0], grade.tint[1], grade.tint[2]), k);
  live.zenith.lerp(tmp.set(env.skyZenith), k);
  live.horizon.lerp(tmp.set(env.skyHorizon), k);
  live.fog.lerp(tmp.set(env.fogColor), k);
  live.sunColor.lerp(sunColor(env, tmp), k);
  live.sunUv.lerp(sunPosition(env, tmpA), k);
  live.moonUv.lerp(moonPosition(env, tmpB), k);
}
