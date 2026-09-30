// Pure mapping from "what time is it at the estate and what is the weather"
// to the parameters that drive the 3D hero scene. No Date, no window, no
// randomness — every input is explicit so this is unit-testable and safe to
// call during render without causing hydration mismatches.

export type Phase = "dawn" | "day" | "dusk" | "night";

export interface EnvironmentInput {
  /** Current time, epoch milliseconds. */
  now: number;
  /** Sunrise / sunset as unix SECONDS (OpenWeather shape). Null when unknown. */
  sunrise: number | null;
  sunset: number | null;
  /** Hour of day, 0–24, used only when sunrise/sunset are unknown. */
  fallbackHour?: number;
  weatherId: number | null;
  humidity?: number | null; // percent
  windSpeed?: number | null;
  visibility?: number | null; // metres
}

export interface SceneEnvironment {
  phase: Phase;
  /** -1…1. Positive = sun above horizon, negative = moon side of the sky. */
  sunElevation: number;
  isMorning: boolean;
  /** Direction of the sun (or moon when `celestialIsMoon`), unit-ish vector. */
  celestialDirection: [number, number, number];
  celestialIsMoon: boolean;
  skyZenith: string;
  skyHorizon: string;
  celestialColor: string;
  fogColor: string;
  fogDensity: number;
  mistOpacity: number;
  rainIntensity: number; // 0…1
  windStrength: number; // 0…1
  cloudCover: number; // 0…1
  starOpacity: number; // 0…1
  /** How lit the cabin windows are, 0…1. */
  windowGlow: number;
}

const DAY = 86400;
const MIN = 60;

// Reasonable Coorg defaults when the weather API can't tell us sunrise/sunset.
const DEFAULT_SUNRISE_HOUR = 6.25;
const DEFAULT_SUNSET_HOUR = 18.5;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function mod(value: number, n: number) {
  return ((value % n) + n) % n;
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function hexToRgb(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function rgbToHex([r, g, b]: [number, number, number]) {
  const to = (n: number) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function mixHex(a: string, b: string, t: number) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return rgbToHex([
    ca[0] + (cb[0] - ca[0]) * t,
    ca[1] + (cb[1] - ca[1]) * t,
    ca[2] + (cb[2] - ca[2]) * t,
  ]);
}

interface Palette {
  zenith: string;
  horizon: string;
  celestial: string;
  fog: string;
}

const PALETTES: Record<Phase, Palette> = {
  night: { zenith: "#050a1a", horizon: "#1a2a3f", celestial: "#9fb4ff", fog: "#0e1a24" },
  dawn: { zenith: "#2b3a5c", horizon: "#f2a48b", celestial: "#ffcf9a", fog: "#5a6474" },
  dusk: { zenith: "#2a2245", horizon: "#e8894a", celestial: "#ffb36b", fog: "#4a3f4f" },
  day: { zenith: "#3a78c6", horizon: "#bcd9ec", celestial: "#fff3d6", fog: "#a9c4d3" },
};

function blendPalette(elevation: number, isMorning: boolean): Palette {
  const twilight = PALETTES[isMorning ? "dawn" : "dusk"];
  const night = PALETTES.night;
  const day = PALETTES.day;

  let from: Palette;
  let to: Palette;
  let t: number;

  if (elevation < -0.05) {
    from = night;
    to = twilight;
    t = smoothstep(-0.3, -0.05, elevation);
  } else if (elevation < 0.12) {
    from = twilight;
    to = twilight;
    t = 0;
  } else {
    from = twilight;
    to = day;
    t = smoothstep(0.12, 0.55, elevation);
  }

  return {
    zenith: mixHex(from.zenith, to.zenith, t),
    horizon: mixHex(from.horizon, to.horizon, t),
    celestial: mixHex(from.celestial, to.celestial, t),
    fog: mixHex(from.fog, to.fog, t),
  };
}

interface WeatherProfile {
  rain: number;
  cloud: number;
  fog: number; // extra mist/fog, 0…1
}

// OpenWeatherMap condition groups: https://openweathermap.org/weather-conditions
function weatherProfile(weatherId: number | null): WeatherProfile {
  if (weatherId === null || Number.isNaN(weatherId)) {
    return { rain: 0, cloud: 0.25, fog: 0.15 };
  }
  if (weatherId >= 200 && weatherId < 300) return { rain: 0.9, cloud: 0.95, fog: 0.5 };
  if (weatherId >= 300 && weatherId < 400) return { rain: 0.25, cloud: 0.8, fog: 0.4 };
  if (weatherId >= 500 && weatherId < 600) {
    if (weatherId === 500) return { rain: 0.4, cloud: 0.8, fog: 0.4 };
    if (weatherId === 501) return { rain: 0.6, cloud: 0.88, fog: 0.45 };
    if (weatherId >= 520 && weatherId <= 531) return { rain: 0.65, cloud: 0.88, fog: 0.45 };
    return { rain: 0.9, cloud: 0.95, fog: 0.5 };
  }
  if (weatherId >= 600 && weatherId < 700) return { rain: 0, cloud: 0.9, fog: 0.6 };
  if (weatherId >= 700 && weatherId < 800) return { rain: 0, cloud: 0.6, fog: 1 };
  if (weatherId === 800) return { rain: 0, cloud: 0.05, fog: 0.1 };
  if (weatherId === 801) return { rain: 0, cloud: 0.2, fog: 0.15 };
  if (weatherId === 802) return { rain: 0, cloud: 0.4, fog: 0.2 };
  if (weatherId === 803) return { rain: 0, cloud: 0.7, fog: 0.3 };
  if (weatherId === 804) return { rain: 0, cloud: 0.9, fog: 0.35 };
  return { rain: 0, cloud: 0.25, fog: 0.15 };
}

export function mapEnvironment(input: EnvironmentInput): SceneEnvironment {
  // Work in "seconds since the most recent sunrise". Only differences matter,
  // so the estate's timezone never needs to be known.
  let sinceSunrise: number;
  let dayLength: number;

  if (input.sunrise !== null && input.sunset !== null) {
    sinceSunrise = mod(input.now / 1000 - input.sunrise, DAY);
    dayLength = mod(input.sunset - input.sunrise, DAY);
    if (dayLength < 3 * 3600) dayLength = 12 * 3600; // guard against bad data
  } else {
    const hour = mod(input.fallbackHour ?? 18.5, 24);
    sinceSunrise = mod(hour * 3600 - DEFAULT_SUNRISE_HOUR * 3600, DAY);
    dayLength = (DEFAULT_SUNSET_HOUR - DEFAULT_SUNRISE_HOUR) * 3600;
  }

  const nightLength = DAY - dayLength;
  const isDaylight = sinceSunrise < dayLength;

  let sunElevation: number;
  let progress: number; // 0…1 across the daylight or the night
  if (isDaylight) {
    progress = sinceSunrise / dayLength;
    sunElevation = Math.sin(Math.PI * progress);
  } else {
    progress = (sinceSunrise - dayLength) / nightLength;
    sunElevation = -0.6 * Math.sin(Math.PI * progress);
  }

  const isMorning = isDaylight ? progress < 0.5 : progress >= 0.5;

  let phase: Phase;
  if (sinceSunrise >= DAY - 45 * MIN || sinceSunrise < 60 * MIN) {
    phase = "dawn";
  } else if (sinceSunrise >= dayLength - 60 * MIN && sinceSunrise < dayLength + 45 * MIN) {
    phase = "dusk";
  } else if (isDaylight) {
    phase = "day";
  } else {
    phase = "night";
  }

  const weather = weatherProfile(input.weatherId);
  const humidity = clamp((input.humidity ?? 65) / 100, 0, 1);
  const visibility = input.visibility ?? 10000;
  const lowVisibility = 1 - clamp(visibility / 10000, 0, 1);

  const palette = blendPalette(sunElevation, isMorning);

  // Cloud cover dulls the sky toward the fog colour.
  const dull = weather.cloud * 0.55;
  const skyZenith = mixHex(palette.zenith, palette.fog, dull);
  const skyHorizon = mixHex(palette.horizon, palette.fog, dull * 0.8);

  // Full daylight burns off some of the haze, so a clear day reads crisp.
  const daylight = smoothstep(0.1, 0.55, sunElevation);
  const fogDensity = clamp(
    (0.012 + (humidity - 0.5) * 0.008 + weather.rain * 0.006 + weather.fog * 0.008 + lowVisibility * 0.01) *
      (1 - 0.3 * daylight),
    0.006,
    0.04,
  );
  const mistOpacity = clamp(0.3 + humidity * 0.25 + weather.fog * 0.3 + weather.rain * 0.1, 0.25, 0.9);

  const nightness = smoothstep(-0.05, -0.35, sunElevation);
  const starOpacity = clamp(nightness * (1 - weather.cloud * 0.9), 0, 1);

  const windowGlow = clamp(
    nightness + (1 - nightness) * (phase === "dusk" ? 0.75 : phase === "dawn" ? 0.45 : 0.08) + weather.cloud * 0.15,
    0,
    1,
  );

  // Sun sweeps east→west across the far horizon; the moon uses the same arc.
  const arc = Math.PI * progress;
  // Kept within the camera's field of view (x ≈ ±0.55 at z = −0.85 is ~33° off-axis).
  const celestialDirection: [number, number, number] = [
    -Math.cos(arc) * 0.55,
    isDaylight ? Math.max(Math.sin(arc) * 0.8, 0.03) : 0.1 + Math.sin(arc) * 0.26,
    -0.85,
  ];

  return {
    phase,
    sunElevation,
    isMorning,
    celestialDirection,
    celestialIsMoon: !isDaylight,
    skyZenith,
    skyHorizon,
    celestialColor: palette.celestial,
    fogColor: mixHex(palette.fog, palette.horizon, 0.35),
    fogDensity,
    mistOpacity,
    rainIntensity: weather.rain,
    windStrength: clamp((input.windSpeed ?? 4) / 15, 0, 1),
    cloudCover: weather.cloud,
    starOpacity,
    windowGlow,
  };
}

// ---------------------------------------------------------------------------
// Demo / capture override: ?env=night&wx=rain forces a phase and/or weather.
// ---------------------------------------------------------------------------

export type WeatherOverride = "clear" | "cloud" | "mist" | "rain" | "storm";

export interface EnvOverride {
  phase?: Phase;
  weather?: WeatherOverride;
}

const PHASES: Phase[] = ["dawn", "day", "dusk", "night"];
const WEATHERS: WeatherOverride[] = ["clear", "cloud", "mist", "rain", "storm"];

export function parseEnvOverride(search: string): EnvOverride {
  const params = new URLSearchParams(search);
  const env = params.get("env");
  const wx = params.get("wx");
  const override: EnvOverride = {};
  if (env && (PHASES as string[]).includes(env)) override.phase = env as Phase;
  if (wx && (WEATHERS as string[]).includes(wx)) override.weather = wx as WeatherOverride;
  return override;
}

const OVERRIDE_WEATHER_ID: Record<WeatherOverride, number> = {
  clear: 800,
  cloud: 803,
  mist: 741,
  rain: 501,
  storm: 211,
};

// Synthetic 12 h day (sunrise 0, sunset 12 h) and a "now" that lands squarely
// inside the requested phase, so an override looks like the real thing.
const PHASE_SECONDS_SINCE_SUNRISE: Record<Phase, number> = {
  dawn: 25 * MIN,
  day: 6 * 3600,
  dusk: 12 * 3600 - 5 * MIN,
  night: 12 * 3600 + 5 * 3600,
};

export function applyOverride(input: EnvironmentInput, override: EnvOverride): EnvironmentInput {
  let next = input;
  if (override.phase) {
    next = {
      ...next,
      sunrise: 0,
      sunset: 12 * 3600,
      now: PHASE_SECONDS_SINCE_SUNRISE[override.phase] * 1000,
    };
  }
  if (override.weather) {
    next = { ...next, weatherId: OVERRIDE_WEATHER_ID[override.weather] };
    if (override.weather === "mist") next = { ...next, humidity: 95, visibility: 1500 };
    if (override.weather === "rain" || override.weather === "storm") next = { ...next, humidity: 90 };
  }
  return next;
}
