import type { SceneEnvironment } from "./hero-environment";

// Photographic "grade" for the live hero: how the real photo is exposed, tinted
// and lit for the current time of day and weather. Pure and deterministic, so
// it is unit-testable and safe to compute during render.
//
// The photo itself is a blue-hour shot (lit windows, misty dusk). That is the
// "native" look, where every value below is neutral; other hours move away from it.

export interface PhotoGrade {
  /** Multiplies scene light (windows/lamps are handled separately by lightGain). */
  exposure: number;
  tint: [number, number, number];
  saturation: number;
  /** Lifts shadows in daylight so the dark photo doesn't look murky. */
  shadowLift: number;
  /** 0 = keep the photo's own sky, 1 = fully procedural sky (stars, moon, day blue). */
  skyReplace: number;
  /** Gain on window / lamp glow. */
  lightGain: number;
  /** God-ray strength (low sun through mist). */
  rays: number;
  /** Wet-surface sheen on the path. */
  wet: number;
  /** Strength of slow cloud shadows drifting over the land. */
  cloudShadow: number;
  /** Extra atmospheric haze toward the distance. */
  farHaze: number;
  /** Volumetric mist amount. */
  mist: number;
  /** Cloud cover over the (replaced) sky. */
  cloud: number;
  wind: number;
  rain: number;
  stars: number;
  /** 1 while the sun is up, used for birds and rays. */
  day: number;
  /** How visible the sun / moon are (they fade in and out around the horizon). */
  sunLevel: number;
  moonLevel: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

// Works for edge0 > edge1 as well (a falling ramp).
function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function mix(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function mix3(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
}

const NIGHT_TINT: [number, number, number] = [0.74, 0.88, 1.22];
const NATIVE_TINT: [number, number, number] = [1, 1, 1];
const DAY_TINT: [number, number, number] = [1.03, 1.05, 0.95];
const DAWN_TINT: [number, number, number] = [1.16, 0.98, 0.86];

export function gradeFor(env: SceneEnvironment): PhotoGrade {
  const e = env.sunElevation;
  const cloud = env.cloudCover;
  const rain = env.rainIntensity;

  const dayness = smoothstep(0.05, 0.55, e);
  const nightness = smoothstep(-0.05, -0.35, e);

  // 0.6 at deep night, 1.0 at the photo's native twilight, ~2.5 in full sun: the source
  // photo is a dark blue-hour exposure, so daylight needs roughly two and a half times the light
  // (the shader rolls highlights off filmically so nothing clips).
  let exposure = 0.6 + 0.4 * smoothstep(-0.35, 0.05, e) + 1.8 * smoothstep(0.1, 0.6, e);
  exposure *= 1 - 0.22 * cloud - 0.12 * rain;

  // Tint: night blue → native → day cool, with a warm pink pass at sunrise.
  let tint = mix3(NIGHT_TINT, NATIVE_TINT, smoothstep(-0.35, 0.05, e));
  tint = mix3(tint, DAY_TINT, smoothstep(0.1, 0.6, e));
  if (env.isMorning) {
    const dawn = clamp(1 - Math.abs(e - 0.12) / 0.32, 0, 1);
    tint = mix3(tint, DAWN_TINT, dawn * 0.85);
  }

  const saturation = clamp(mix(0.72, 1, smoothstep(-0.35, 0.05, e)) * mix(1, 1.05, dayness) - 0.15 * cloud - 0.08 * rain, 0.45, 1.15);

  // The sky is the photo's own around native dusk, and fully replaced by night or day.
  const skyReplace = clamp(0.08 + Math.abs(e - 0.05) * 2.4 + (env.isMorning ? 0.25 : 0), 0, 1);

  const rays =
    smoothstep(0.02, 0.25, e) * (1 - smoothstep(0.35, 0.75, e)) * (1 - cloud * 0.7) * (0.4 + env.mistOpacity * 0.6);

  return {
    exposure: clamp(exposure, 0.3, 3.2),
    tint,
    saturation,
    shadowLift: 0.16 * dayness * (1 - 0.5 * cloud) + 0.05 * rain,
    skyReplace,
    // Lamps are barely visible in daylight (~0.25) and strongest at night; rain keeps the cabins cosy.
    lightGain: clamp((0.22 + env.windowGlow * 0.85) * (1 + 0.15 * rain), 0.2, 1.25),
    rays: clamp(rays, 0, 1),
    wet: clamp(rain * 1.2 + env.mistOpacity * 0.12, 0, 1),
    cloudShadow: clamp(dayness * (0.1 + 0.12 * cloud), 0, 0.3),
    // Daylight burns off haze and mist, so a clear day reads crisp instead of milky.
    farHaze: clamp((0.15 + env.mistOpacity * 0.3) * (1 - 0.6 * dayness) + 0.06 * dayness, 0, 0.8),
    mist: clamp(env.mistOpacity * (1 - 0.7 * dayness), 0, 1),
    cloud,
    wind: env.windStrength,
    rain,
    stars: env.starOpacity * nightness,
    day: dayness,
    sunLevel: smoothstep(-0.12, 0.05, e),
    moonLevel: smoothstep(0.02, -0.22, e) * (1 - 0.6 * cloud),
  };
}
