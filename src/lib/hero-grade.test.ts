import { describe, expect, it } from "vitest";
import { applyOverride, mapEnvironment, type EnvironmentInput, type Phase } from "./hero-environment";
import { gradeFor } from "./hero-grade";

function env(phase: Phase, weatherId = 800, extra: Partial<EnvironmentInput> = {}) {
  const input: EnvironmentInput = {
    now: 0,
    sunrise: null,
    sunset: null,
    weatherId,
    humidity: 60,
    windSpeed: 3,
    visibility: 10000,
    ...extra,
  };
  return mapEnvironment(applyOverride(input, { phase }));
}

describe("gradeFor", () => {
  it("is darker at night than at dusk, and brightest in daylight", () => {
    const night = gradeFor(env("night")).exposure;
    const dusk = gradeFor(env("dusk")).exposure;
    const day = gradeFor(env("day")).exposure;
    expect(night).toBeLessThan(dusk);
    expect(dusk).toBeLessThan(day);
  });

  it("keeps the photo's own sky around dusk and replaces it at night and by day", () => {
    expect(gradeFor(env("dusk")).skyReplace).toBeLessThan(0.3);
    expect(gradeFor(env("night")).skyReplace).toBeGreaterThan(0.9);
    expect(gradeFor(env("day")).skyReplace).toBeGreaterThan(0.9);
  });

  it("glows the windows more at night than in daylight", () => {
    expect(gradeFor(env("night")).lightGain).toBeGreaterThan(gradeFor(env("day")).lightGain);
  });

  it("warms the dawn and cools the night", () => {
    const dawn = gradeFor(env("dawn")).tint;
    const night = gradeFor(env("night")).tint;
    expect(dawn[0]).toBeGreaterThan(dawn[2]); // red > blue
    expect(night[2]).toBeGreaterThan(night[0]); // blue > red
  });

  it("shows stars only at night", () => {
    expect(gradeFor(env("night")).stars).toBeGreaterThan(0.5);
    expect(gradeFor(env("day")).stars).toBe(0);
    expect(gradeFor(env("dusk")).stars).toBe(0);
  });

  it("makes rain wet the path and dulls exposure and colour", () => {
    const dry = gradeFor(env("day", 800));
    const wet = gradeFor(env("day", 502));
    expect(wet.wet).toBeGreaterThan(dry.wet);
    expect(wet.rain).toBeGreaterThan(0.8);
    expect(wet.exposure).toBeLessThan(dry.exposure);
    expect(wet.saturation).toBeLessThan(dry.saturation);
  });

  it("shows the sun by day and the moon at night, never both at full strength", () => {
    const day = gradeFor(env("day"));
    const night = gradeFor(env("night"));
    expect(day.sunLevel).toBeGreaterThan(0.9);
    expect(day.moonLevel).toBe(0);
    expect(night.sunLevel).toBe(0);
    expect(night.moonLevel).toBeGreaterThan(0.9);
    const dusk = gradeFor(env("dusk"));
    expect(dusk.sunLevel + dusk.moonLevel).toBeLessThan(1.6);
  });

  it("burns off mist in daylight", () => {
    expect(gradeFor(env("day", 741)).mist).toBeLessThan(gradeFor(env("night", 741)).mist);
  });

  it("only draws god rays with a low sun and open sky", () => {
    expect(gradeFor(env("night")).rays).toBe(0);
    expect(gradeFor(env("dawn", 800)).rays).toBeGreaterThan(gradeFor(env("dawn", 804)).rays);
  });

  it("keeps every value finite and in a sane range across the whole day and all weather", () => {
    for (const weatherId of [null, 211, 301, 500, 502, 601, 741, 800, 802, 804]) {
      for (let s = 0; s < 86400; s += 1800) {
        const g = gradeFor(
          mapEnvironment({ now: s * 1000, sunrise: 0, sunset: 43200, weatherId, humidity: null, windSpeed: null, visibility: null }),
        );
        for (const v of [g.exposure, g.saturation, g.shadowLift, g.skyReplace, g.lightGain, g.rays, g.wet, g.cloudShadow, g.farHaze, g.mist, g.cloud, g.wind, g.rain, g.stars, g.day, g.sunLevel, g.moonLevel, ...g.tint]) {
          expect(Number.isFinite(v)).toBe(true);
        }
        expect(g.exposure).toBeGreaterThanOrEqual(0.3);
        expect(g.exposure).toBeLessThanOrEqual(3.2);
        for (const v of [g.skyReplace, g.rays, g.wet, g.stars, g.day, g.mist, g.rain, g.wind]) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(1);
        }
      }
    }
  });
});
