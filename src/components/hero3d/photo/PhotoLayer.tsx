"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, MathUtils, ShaderMaterial, Vector2 } from "three";
import type { QualityTier } from "@/hooks/useQualityTier";
import { MOON_COLOR, type LiveRef } from "../liveEnv";
import { coverFit, PHOTO_ASPECT, type ViewRef } from "./view";
import type { PhotoTextures } from "./usePhotoTextures";

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec2 vUv;

  uniform sampler2D uPhoto;
  uniform sampler2D uDepth;     // original depth (atmosphere, haze)
  uniform sampler2D uDepthFwd;  // dilated depth (parallax, one stable lookup)
  uniform sampler2D uMasks;     // G light emitters, B foliage sway
  uniform sampler2D uMasks2;    // R wet path
  uniform sampler2D uSky;       // R soft sky matte (true fractional coverage)
  uniform sampler2D uGlow;      // RGB emitter mask pre-blurred: tight / medium / wide

  uniform vec2 uCenter;
  uniform vec2 uVisible;
  uniform float uZoom;
  uniform vec2 uOffset;
  uniform float uTime;
  uniform float uGust;

  uniform float uExposure;
  uniform float uSaturation;
  uniform float uShadowLift;
  uniform float uSkyReplace;
  uniform float uLightGain;
  uniform float uRays;
  uniform float uWet;
  uniform float uCloudShadow;
  uniform float uFarHaze;
  uniform float uMist;
  uniform float uCloud;
  uniform float uWind;
  uniform float uStars;
  uniform float uDay;
  uniform float uLightning;
  uniform vec2 uFlashUv;
  uniform float uSunLevel;
  uniform float uMoonLevel;
  uniform vec3 uTint;
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform vec3 uFogColor;
  uniform vec3 uSunColor;
  uniform vec3 uMoonColor;
  uniform vec2 uSunUv;
  uniform vec2 uMoonUv;

  const float IMG_ASPECT = ${PHOTO_ASPECT.toFixed(5)};
  const vec3 WARM = vec3(1.0, 0.58, 0.24);

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < FBM_OCTAVES; i++) {
      v += a * noise(p);
      p = p * 2.03 + 11.7;
      a *= 0.5;
    }
    return v;
  }
  float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

  // A field of stars on an (azimuth, elevation) grid: a few cells hold a soft dot.
  float starLayer(vec2 p, float scale, float threshold, float radMin, float radRange, float seed) {
    vec2 sc = p * vec2(IMG_ASPECT, 1.0) * scale;
    vec2 cell = floor(sc);
    vec2 loc = fract(sc);
    float r = hash(cell + seed);
    vec2 jit = vec2(hash(cell + 1.7 + seed), hash(cell + 9.2 + seed)) * 0.6 + 0.2;
    float rad = radMin + hash(cell + 4.1 + seed) * radRange;
    float s = step(threshold, r) * (1.0 - smoothstep(0.0, rad, length(loc - jit)));
    return s * (0.55 + 0.45 * sin(uTime * 1.7 + r * 60.0));
  }

  void main() {
    // --- camera: cover-fit the photo, push in, parallax by depth -----------------
    vec2 iuv = uCenter + (vUv - 0.5) * uVisible / uZoom;
    vec2 dx = dFdx(iuv);
    vec2 dy = dFdy(iuv);

    // One stable forward lookup from the dilated depth (no iteration to oscillate at
    // depth cliffs). The sky is pinned: it has no parallax, only the trees in front do.
    float skyHere = texture2D(uSky, iuv).r;
    float dF = mix(texture2D(uDepthFwd, iuv).r, 0.35, skyHere);
    vec2 uv = iuv - uOffset * (dF - 0.35);

    // --- wind: per-bush, travelling, multi-frequency --------------------------------
    float wind = uWind * (0.35 + 0.95 * uGust);
    float foliage = textureGrad(uMasks, uv, dx, dy).b;
    float depthHere = texture2D(uDepth, uv).r;
    float far = 1.0 - depthHere;

    float bushPh = noise(uv * vec2(58.0, 46.0)) * 6.2831;           // each bush its own phase
    float front = uv.x * 11.0 - uv.y * 7.0;                           // a gust front sweeping across
    float swayA = sin(uTime * (1.25 + 0.7 * wind) + front + bushPh);
    float swayB = sin(uTime * 2.7 + bushPh * 1.7 + uv.x * 23.0);
    vec2 sway = vec2(swayA + 0.5 * swayB, 0.3 * sin(uTime * 1.9 + bushPh))
              * (0.0014 + 0.0032 * wind) * foliage * (0.6 + 0.8 * depthHere);
    vec2 flutter = (vec2(noise(uv * vec2(210.0, 170.0) + vec2(uTime * 1.1, 0.0)),
                         noise(uv * vec2(190.0, 230.0) + vec2(0.0, -uTime * 0.9))) - 0.5)
                 * (0.0007 + 0.0020 * wind) * foliage;
    vec2 suv = uv + sway + flutter;

    vec3 photo = textureLod(uPhoto, suv, 0.0).rgb;
    float glow = textureGrad(uMasks, suv, dx, dy).g;
    float skyA = textureGrad(uSky, suv, dx, dy).r;
    float wetMask = textureGrad(uMasks2, suv, dx, dy).r;

    // Leaf glints: the sheen of wet leaves shimmers as they move.
    photo *= 1.0 + 0.10 * (noise(suv * vec2(75.0, 60.0) + vec2(uTime * 1.6, uTime * 0.7)) - 0.5)
                   * foliage * (0.5 + wind);

#if QUALITY >= 1
    // Gentle unsharp mask: the source photo is upscaled, this restores edge bite.
    vec2 tx = vec2(1.0 / 1152.0, 1.0 / 896.0);
    vec3 blur = 0.25 * (
      textureLod(uPhoto, suv + vec2(tx.x, 0.0), 0.0).rgb + textureLod(uPhoto, suv - vec2(tx.x, 0.0), 0.0).rgb +
      textureLod(uPhoto, suv + vec2(0.0, tx.y), 0.0).rgb + textureLod(uPhoto, suv - vec2(0.0, tx.y), 0.0).rgb);
    photo += clamp((photo - blur) * 0.3, -0.05, 0.05);
#endif

    // Y measured from the TOP of the photo, like the image itself.
    float iy = 1.0 - suv.y;
    vec2 puv = vec2(suv.x, iy);

    // --- sky compositing: photo = leaf*(1-a) + sky*a, so subtract the old sky's share ---
    vec3 skyRef = mix(vec3(0.36, 0.25, 0.27), vec3(0.25, 0.25, 0.30), smoothstep(0.2, 0.9, suv.x));
    vec3 leafy = max(photo - skyRef * skyA * uSkyReplace, 0.0);

    // --- land: exposure for the hour; windows keep their own light -----------------------
    // Per-lamp life: smooth (not stepped) flicker, and a rare dip when a light is switched.
    float ph = noise(suv * vec2(14.0, 11.0)) * 6.2831;
    float flick = 1.0 + 0.06 * sin(uTime * 1.9 + ph) + 0.03 * sin(uTime * 5.3 + ph * 1.7)
                + 0.05 * (noise(vec2(uTime * 6.0, ph)) - 0.5);
    float cyc = fract(uTime * 0.018 + noise(suv * vec2(9.0, 7.0)));
    float dip = 1.0 - 0.55 * smoothstep(0.0, 0.004, cyc) * (1.0 - smoothstep(0.02, 0.03, cyc));

    vec3 land = mix(leafy * uExposure, leafy * uLightGain * flick * dip * 1.12, glow);
    land *= uTint;
    land = mix(vec3(luma(land)), land, uSaturation);
    // Filmic highlight roll-off: lets daylight exposure (~3x) brighten the dark photo without
    // clipping. Fades to nothing at dusk, so the native look is exact.
    land = mix(land, 1.0 - exp(-land * 1.25), clamp(uDay * 1.2, 0.0, 1.0));
    // A gentle S-curve keeps daylight punchy instead of flat and milky.
    land = mix(land, land * land * (3.0 - 2.0 * land), 0.38 * uDay);
    // Sun-warmed highlights by day.
    land *= mix(vec3(1.0), vec3(1.07, 1.03, 0.90), uDay * smoothstep(0.15, 0.5, luma(land)));
    land += (1.0 - land) * uShadowLift * (1.0 - clamp(luma(land) * 1.6, 0.0, 1.0)) * 0.55;
    // Night keeps a little cool, teal-leaning detail in the darks instead of crushing to black.
    float nightK = (1.0 - uDay) * (1.0 - smoothstep(0.7, 1.0, uExposure));
    land += vec3(0.008, 0.016, 0.026) * nightK * (1.0 - clamp(luma(land) * 5.0, 0.0, 1.0));

    // atmospheric haze toward the distance
    land = mix(land, uFogColor * 1.15 + 0.03, far * uFarHaze * 0.5);

#if QUALITY >= 1
    if (uCloudShadow > 0.002) {
      float cs = fbm(vec2(suv.x * 1.4 - uTime * 0.012 * (0.5 + wind), suv.y * 1.9 + 5.0));
      float shade = smoothstep(0.42, 0.72, cs);
      land *= 1.0 - uCloudShadow * shade + uCloudShadow * 0.3 * (1.0 - shade);
    }
#endif

    // --- the sky: real cloud structure, recoloured, with stars, sun and moon ---------------
    vec3 col = land;
    float skyAmt = skyA * uSkyReplace;
    vec3 skyAll = vec3(0.0);
    float sunHalo = 0.0;
    float moonHalo = 0.0;
    vec2 sd = (puv - uSunUv) * vec2(IMG_ASPECT, 1.0);
    float sdd = length(sd);
    vec2 md = (puv - uMoonUv) * vec2(IMG_ASPECT, 1.0);
    float mdd = length(md);
    sunHalo = exp(-sdd * 10.0) * 0.7 + exp(-sdd * 3.2) * 0.2 + exp(-sdd * 55.0) * 0.9;
    moonHalo = exp(-mdd * 14.0) * 0.5 + exp(-mdd * 4.0) * 0.15;

    if (skyA > 0.002) {
      float hh = clamp(1.0 - iy / 0.55, 0.0, 1.0);
      vec3 skyBase = mix(uHorizon, uZenith, smoothstep(0.0, 0.85, hh));
      // A humid tropical sky is paler than a clean-air one; a storm sky is heavy and grey.
      skyBase = mix(skyBase, uFogColor * 1.3, 0.28 * uDay);
      skyBase = mix(skyBase, uFogColor * 0.55, 0.5 * smoothstep(0.6, 1.0, uCloud));
      float pl = luma(textureLod(uPhoto, suv, 4.5).rgb);
      vec3 skyCol = skyBase * clamp(0.65 + 0.7 * pl / 0.3, 0.6, 1.7);

      vec2 cuv = vec2(suv.x * 2.4 + uTime * 0.008 * (0.4 + wind), suv.y * 3.6);
      float c = smoothstep(0.46 - uCloud * 0.3, 0.86, fbm(cuv));
      skyCol = mix(skyCol, mix(uHorizon, uFogColor, 0.5) * 0.95, c * (0.15 + uCloud * 0.6));
      float veil = 1.0 - smoothstep(0.35, 0.7, c + uCloud * 0.6);   // clouds hide the sun and moon

      // Two star layers: many faint ones, a few bright ones. Radii are over a pixel so they don't shimmer.
      float stars = starLayer(puv, 140.0, 0.93, 0.16, 0.12, 3.0) * 0.45
                  + starLayer(puv, 62.0, 0.984, 0.2, 0.14, 11.0) * 1.3;
      skyCol += vec3(1.0, 0.97, 0.9) * stars * uStars * (1.0 - c * 0.85) * 1.4;

      skyCol += uSunColor * sunHalo * uSunLevel * veil;
      float moonDisc = 1.0 - smoothstep(0.016, 0.0205, mdd);
      float maria = 0.86 + 0.14 * fbm(md * 34.0);
      skyCol = mix(skyCol, uMoonColor * 1.2 * maria, moonDisc * uMoonLevel * veil);
      skyCol += uMoonColor * moonHalo * uMoonLevel * (1.0 - c * 0.6);
      // lightning lights the cloud from within
      skyCol += vec3(0.6, 0.65, 0.9) * uLightning * (0.35 + 0.65 * exp(-length(puv - uFlashUv) * 2.6));
      skyAll = skyCol;
    }
    // Replace the sky's share by the new sky: alpha compositing, so branch gaps and edges are exact.
    col += skyAll * skyAmt;
    // Sun and moon glow also spills softly over the branches and mist in front of them.
    col += (uSunColor * sunHalo * uSunLevel + uMoonColor * moonHalo * uMoonLevel) * 0.16 * (1.0 - skyA);

    // --- volumetric mist: layers at different speeds, warped, lit by the windows -------------
    float band = smoothstep(0.16, 0.5, iy) * (1.0 - smoothstep(0.86, 1.0, iy));
    vec2 m1 = vec2(suv.x * 2.6 + uTime * 0.012 * (0.5 + wind) - uOffset.x * 2.0, suv.y * 5.0);
    vec2 m2 = vec2(suv.x * 4.4 - uTime * 0.008 * (0.5 + wind) - uOffset.x * 4.0, suv.y * 7.5 + 3.1);
#if QUALITY >= 1
    // domain warp: the fog swirls and folds instead of sliding as a rigid sheet
    vec2 warp = vec2(noise(m1 * 1.7 + uTime * 0.05), noise(m1 * 1.7 + 5.2 - uTime * 0.04)) - 0.5;
    m1 += warp * 1.1;
    m2 -= warp * 0.8;
#endif
    float mistAmt = smoothstep(0.32, 0.76, fbm(m1) * 0.6 + fbm(m2) * 0.4) * band * uMist * (0.3 + far * 0.95);

    // --- light from the windows: a tight core, surfaces lit by the lamps, scatter in the fog --
    vec3 gl = texture2D(uGlow, suv).rgb;     // tight / medium / wide
    float albedo = clamp(luma(photo) * 5.0, 0.15, 1.0);
    float pool = gl.g * 1.0 + gl.b * 0.9;
    float scatter = clamp(gl.g * 1.2 + gl.b * 1.4, 0.0, 1.0);

    vec3 mistCol = mix(uFogColor * 1.25 + 0.02, WARM, clamp(scatter * 1.6, 0.0, 1.0) * 0.7);
    col = mix(col, mistCol, clamp(mistAmt * 0.62, 0.0, 0.85) * (1.0 - skyA * 0.5));
    col += WARM * pool * albedo * uLightGain * 0.55;                  // lights the deck, walls, railings
    col += WARM * gl.r * uLightGain * 0.3;                            // the glow right at the pane
    col += WARM * gl.b * uMist * uLightGain * 0.28;                   // warm haze in the mist

#if QUALITY >= 1
    // --- god rays: the low sun through the mist (periodic noise: no seam) ----------------------
    if (uRays > 0.002) {
      vec2 dirn = sd / max(sdd, 0.0001);
      float rays = pow(fbm(dirn * 3.0 + vec2(uTime * 0.02, 0.0)), 2.4) * exp(-sdd * 2.2);
      rays *= smoothstep(0.03, 0.07, sdd);
      col += uSunColor * rays * uRays * (0.3 + far * 0.7) * (1.0 - foliage * 0.6) * 0.9;
    }
#endif

    // --- wet stone path catches the lamps ------------------------------------------------------
    if (wetMask * uWet > 0.002) {
      float spark = pow(noise(suv * vec2(620.0, 360.0) + vec2(0.0, uTime * 0.5)), 8.0)
                  + 0.6 * pow(noise(suv * vec2(330.0, 190.0) - vec2(uTime * 0.3, 0.0)), 8.0);
      col *= 1.0 - wetMask * uWet * 0.12;
      col += (WARM * scatter * 1.6 + vec3(0.18, 0.23, 0.32) * (0.35 + uDay * 0.9)) * wetMask * uWet * (0.18 + spark * 0.9);
    }

    // --- lightning lights the whole scene ---------------------------------------------------------
    col += vec3(0.5, 0.56, 0.8) * uLightning * 0.55 * (0.35 + far * 0.65);

    // --- film: a soft vignette and fine grain (a "live camera" feel) -------------------------------
    float vg = 1.0 - smoothstep(0.3, 1.25, length((vUv - 0.5) * vec2(1.0, 1.15)));
    col *= mix(0.74, 1.0, vg);
    // Multiplicative grain (dark areas stay clean); two decorrelated hashes avoid any pattern.
    float g1 = hash(gl_FragCoord.xy * 0.731 + fract(uTime * 0.61) * 173.0);
    float g2 = hash(gl_FragCoord.yx * 1.137 + fract(uTime * 0.37) * 91.0);
    col *= 1.0 + ((g1 + g2) * 0.5 - 0.5) * 0.07;

    gl_FragColor = vec4(max(col, 0.0), 1.0);
    #include <colorspace_fragment>
  }
`;

const QUALITY: Record<QualityTier, { quality: number; fbm: number }> = {
  high: { quality: 2, fbm: 4 },
  medium: { quality: 1, fbm: 4 },
  low: { quality: 0, fbm: 3 },
};

// Deterministic 0..1 pseudo-random for the lightning schedule (no Math.random in render code).
function unit(n: number) {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}

// On a portrait screen only x ≈ 0.19–0.53 of the photo is visible, so the moon and sun
// (which travel across x 0.2–0.8) would never be seen on phones: squeeze their path into view.
function portraitX(x: number) {
  return 0.24 + (x - 0.2) * 0.4;
}

export default function PhotoLayer({
  live,
  view,
  tier,
  textures,
}: {
  live: LiveRef;
  view: ViewRef;
  tier: QualityTier;
  textures: PhotoTextures;
}) {
  const materialRef = useRef<ShaderMaterial>(null);
  const storm = useRef({ clock: 0, next: 7, pulse: 0, count: 0, echo: false });

  const uniforms = useMemo(
    () => ({
      uPhoto: { value: textures.photo },
      uDepth: { value: textures.depth },
      uDepthFwd: { value: textures.depthFwd },
      uMasks: { value: textures.masks },
      uMasks2: { value: textures.masks2 },
      uSky: { value: textures.sky },
      uGlow: { value: textures.glow },
      uCenter: { value: new Vector2(0.5, 0.5) },
      uVisible: { value: new Vector2(1, 1) },
      uZoom: { value: 1 },
      uOffset: { value: new Vector2() },
      uTime: { value: 0 },
      uGust: { value: 0.4 },
      uExposure: { value: 1 },
      uSaturation: { value: 1 },
      uShadowLift: { value: 0 },
      uSkyReplace: { value: 0 },
      uLightGain: { value: 1 },
      uRays: { value: 0 },
      uWet: { value: 0 },
      uCloudShadow: { value: 0 },
      uFarHaze: { value: 0.2 },
      uMist: { value: 0.5 },
      uCloud: { value: 0.2 },
      uWind: { value: 0.3 },
      uStars: { value: 0 },
      uDay: { value: 0 },
      uLightning: { value: 0 },
      uFlashUv: { value: new Vector2(0.5, 0.15) },
      uSunLevel: { value: 0 },
      uMoonLevel: { value: 0 },
      uTint: { value: new Color(1, 1, 1) },
      uZenith: { value: new Color() },
      uHorizon: { value: new Color() },
      uFogColor: { value: new Color() },
      uSunColor: { value: new Color() },
      uMoonColor: { value: MOON_COLOR.clone() },
      uSunUv: { value: new Vector2(0.2, 0.27) },
      uMoonUv: { value: new Vector2(0.86, 0.3) },
    }),
    [textures],
  );

  // Recreated with the material (see key={tier} in HeroScene), so these always take effect.
  const defines = useMemo(() => {
    const q = QUALITY[tier];
    return { QUALITY: q.quality, FBM_OCTAVES: q.fbm };
  }, [tier]);

  useFrame((_, rawDelta) => {
    const material = materialRef.current;
    if (!material) return;
    const delta = Math.min(rawDelta, 0.05);
    const l = live.current;
    const v = view.current;
    const u = material.uniforms;

    const fit = coverFit(v.aspect);
    const halfX = fit.visibleX / (2 * v.zoom);
    const halfY = fit.visibleY / (2 * v.zoom);
    u.uCenter.value.set(
      MathUtils.clamp(fit.focusX, halfX, 1 - halfX),
      MathUtils.clamp(fit.focusY, halfY, 1 - halfY),
    );
    u.uVisible.value.set(fit.visibleX, fit.visibleY);
    u.uZoom.value = v.zoom;
    u.uOffset.value.set(v.offsetX, v.offsetY);
    u.uTime.value = v.time;
    u.uGust.value = v.gust;

    u.uExposure.value = l.exposure;
    u.uSaturation.value = l.saturation;
    u.uShadowLift.value = l.shadowLift;
    u.uSkyReplace.value = l.skyReplace;
    u.uLightGain.value = l.lightGain;
    u.uRays.value = l.rays;
    u.uWet.value = l.wet;
    u.uCloudShadow.value = l.cloudShadow;
    u.uFarHaze.value = l.farHaze;
    u.uMist.value = l.mist;
    u.uCloud.value = l.cloud;
    u.uWind.value = l.wind;
    u.uStars.value = l.stars;
    u.uDay.value = l.day;
    u.uSunLevel.value = l.sunLevel;
    u.uMoonLevel.value = l.moonLevel;
    u.uTint.value.copy(l.tint);
    u.uZenith.value.copy(l.zenith);
    u.uHorizon.value.copy(l.horizon);
    u.uFogColor.value.copy(l.fog);
    u.uSunColor.value.copy(l.sunColor);

    const portrait = v.aspect < 1;
    u.uSunUv.value.set(portrait ? portraitX(l.sunUv.x) : l.sunUv.x, l.sunUv.y);
    u.uMoonUv.value.set(portrait ? portraitX(l.moonUv.x) : l.moonUv.x, l.moonUv.y);

    // Thunderstorms flash every so often, sometimes twice in quick succession, each from a new place in the cloud.
    const s = storm.current;
    s.clock += delta;
    if (l.rain > 0.8 && s.clock > s.next) {
      s.pulse = 1;
      s.clock = 0;
      s.count += 1;
      s.next = 6 + unit(s.count) * 10;
      s.echo = unit(s.count + 40) > 0.45;
      u.uFlashUv.value.set(0.25 + unit(s.count + 7) * 0.55, 0.05 + unit(s.count + 13) * 0.2);
    }
    if (s.echo && s.pulse < 0.3 && s.clock > 0.12) {
      s.pulse = 0.8;
      s.echo = false;
    }
    s.pulse *= Math.exp(-delta * 9);
    u.uLightning.value = s.pulse < 0.01 ? 0 : s.pulse;
  });

  return (
    <mesh frustumCulled={false} renderOrder={0}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        defines={defines}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}
