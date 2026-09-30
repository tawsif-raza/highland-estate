import { describe, expect, it } from "vitest";
import {
  applyOverride,
  mapEnvironment,
  mixHex,
  parseEnvOverride,
  type EnvironmentInput,
} from "./hero-environment";

// A fixed synthetic day: sunrise at t=0, sunset 12 h later.
const SUNRISE = 0;
const SUNSET = 12 * 3600;

function at(secondsSinceSunrise: number, extra: Partial<EnvironmentInput> = {}): EnvironmentInput {
  return {
    now: secondsSinceSunrise * 1000,
    sunrise: SUNRISE,
    sunset: SUNSET,
    weatherId: 800,
    humidity: 60,
    windSpeed: 3,
    visibility: 10000,
    ...extra,
  };
}

describe("mapEnvironment — time of day", () => {
  it("classifies dawn, day, dusk and night around sunrise/sunset", () => {
    expect(mapEnvironment(at(20 * 60)).phase).toBe("dawn");
    expect(mapEnvironment(at(6 * 3600)).phase).toBe("day");
    expect(mapEnvironment(at(12 * 3600 - 10 * 60)).phase).toBe("dusk");
    expect(mapEnvironment(at(12 * 3600 + 5 * 3600)).phase).toBe("night");
  });

  it("treats the minutes just before sunrise as dawn, not night", () => {
    expect(mapEnvironment(at(-20 * 60)).phase).toBe("dawn");
  });

  it("puts the sun high at midday and below the horizon at night", () => {
    expect(mapEnvironment(at(6 * 3600)).sunElevation).toBeGreaterThan(0.95);
    const midnight = mapEnvironment(at(12 * 3600 + 6 * 3600));
    expect(midnight.sunElevation).toBeLessThan(-0.5);
    expect(midnight.celestialIsMoon).toBe(true);
  });

  it("only shows stars at night, and lights the cabin windows", () => {
    const day = mapEnvironment(at(6 * 3600));
    const night = mapEnvironment(at(12 * 3600 + 6 * 3600));
    expect(day.starOpacity).toBe(0);
    expect(night.starOpacity).toBeGreaterThan(0.8);
    expect(night.windowGlow).toBeGreaterThan(day.windowGlow);
  });

  it("uses a different sky for the same elevation in the morning vs the evening", () => {
    const dawn = mapEnvironment(at(20 * 60));
    const dusk = mapEnvironment(at(12 * 3600 - 20 * 60));
    expect(dawn.isMorning).toBe(true);
    expect(dusk.isMorning).toBe(false);
    expect(dawn.skyHorizon).not.toBe(dusk.skyHorizon);
  });

  it("falls back to a sensible day from the visitor's hour when sunrise/sunset are unknown", () => {
    const base = { now: 0, sunrise: null, sunset: null, weatherId: 800 };
    expect(mapEnvironment({ ...base, fallbackHour: 12 }).phase).toBe("day");
    expect(mapEnvironment({ ...base, fallbackHour: 23 }).phase).toBe("night");
    expect(mapEnvironment({ ...base, fallbackHour: 18.4 }).phase).toBe("dusk");
  });

  it("survives nonsense sunrise/sunset data", () => {
    const env = mapEnvironment(at(6 * 3600, { sunrise: 100, sunset: 100 }));
    expect(Number.isFinite(env.sunElevation)).toBe(true);
  });
});

describe("mapEnvironment — weather", () => {
  it("makes rain only for rain-family conditions", () => {
    expect(mapEnvironment(at(6 * 3600, { weatherId: 800 })).rainIntensity).toBe(0);
    expect(mapEnvironment(at(6 * 3600, { weatherId: 803 })).rainIntensity).toBe(0);
    expect(mapEnvironment(at(6 * 3600, { weatherId: 741 })).rainIntensity).toBe(0);
    expect(mapEnvironment(at(6 * 3600, { weatherId: 500 })).rainIntensity).toBeGreaterThan(0);
    expect(mapEnvironment(at(6 * 3600, { weatherId: 211 })).rainIntensity).toBeGreaterThan(0.8);
  });

  it("scales rain with severity", () => {
    const light = mapEnvironment(at(6 * 3600, { weatherId: 500 })).rainIntensity;
    const heavy = mapEnvironment(at(6 * 3600, { weatherId: 502 })).rainIntensity;
    expect(heavy).toBeGreaterThan(light);
  });

  it("thickens fog and mist for mist, high humidity and low visibility", () => {
    const clear = mapEnvironment(at(6 * 3600, { weatherId: 800, humidity: 40, visibility: 10000 }));
    const misty = mapEnvironment(at(6 * 3600, { weatherId: 741, humidity: 95, visibility: 1500 }));
    expect(misty.fogDensity).toBeGreaterThan(clear.fogDensity);
    expect(misty.mistOpacity).toBeGreaterThan(clear.mistOpacity);
  });

  it("hides stars under cloud at night", () => {
    const midnight = 12 * 3600 + 6 * 3600;
    const clear = mapEnvironment(at(midnight, { weatherId: 800 }));
    const overcast = mapEnvironment(at(midnight, { weatherId: 804 }));
    expect(overcast.starOpacity).toBeLessThan(clear.starOpacity);
  });

  it("keeps every numeric output in range and never produces NaN", () => {
    for (const weatherId of [null, 200, 301, 500, 502, 601, 741, 800, 802, 804, 999]) {
      for (let s = 0; s < 86400; s += 3600) {
        const env = mapEnvironment(
          at(s, { weatherId, humidity: null, windSpeed: null, visibility: null }),
        );
        for (const value of [
          env.fogDensity,
          env.mistOpacity,
          env.rainIntensity,
          env.windStrength,
          env.cloudCover,
          env.starOpacity,
          env.windowGlow,
        ]) {
          expect(Number.isFinite(value)).toBe(true);
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(1);
        }
        expect(env.skyZenith).toMatch(/^#[0-9a-f]{6}$/);
        expect(env.skyHorizon).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });
});

describe("mixHex", () => {
  it("interpolates and clamps endpoints", () => {
    expect(mixHex("#000000", "#ffffff", 0)).toBe("#000000");
    expect(mixHex("#000000", "#ffffff", 1)).toBe("#ffffff");
    expect(mixHex("#000000", "#ffffff", 0.5)).toBe("#808080");
  });
});

describe("demo override (?env=&wx=)", () => {
  it("parses only known values", () => {
    expect(parseEnvOverride("?env=night&wx=rain")).toEqual({ phase: "night", weather: "rain" });
    expect(parseEnvOverride("?env=midnight&wx=hail")).toEqual({});
    expect(parseEnvOverride("")).toEqual({});
  });

  it("lands squarely inside each requested phase", () => {
    const base = at(0, { sunrise: 999999, sunset: 1000000, now: 123 });
    for (const phase of ["dawn", "day", "dusk", "night"] as const) {
      expect(mapEnvironment(applyOverride(base, { phase })).phase).toBe(phase);
    }
  });

  it("forces the weather regardless of the live reading", () => {
    const base = at(6 * 3600, { weatherId: 800 });
    expect(mapEnvironment(applyOverride(base, { weather: "rain" })).rainIntensity).toBeGreaterThan(0);
    expect(mapEnvironment(applyOverride(base, { weather: "storm" })).rainIntensity).toBeGreaterThan(0.8);
    expect(mapEnvironment(applyOverride(base, { weather: "mist" })).fogDensity).toBeGreaterThan(
      mapEnvironment(base).fogDensity,
    );
  });

  it("leaves the input untouched when there is no override", () => {
    const base = at(6 * 3600);
    expect(applyOverride(base, {})).toBe(base);
  });
});
