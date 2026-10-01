"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferGeometry, DoubleSide, Float32BufferAttribute, MathUtils, ShaderMaterial, Vector2 } from "three";
import type { QualityTier } from "@/hooks/useQualityTier";
import type { LiveRef } from "../liveEnv";
import { coverFit, type ViewRef } from "./view";
import type { PhotoTextures } from "./usePhotoTextures";

// A few birds crossing the sky. Each is two flapping wing triangles built in
// the vertex shader. They are hidden wherever the sky matte says there are
// branches or hills, so they only ever appear against open sky. Every crossing
// picks a new height and direction.

const vertexShader = /* glsl */ `
  attribute float aSeed;
  attribute float aVert;
  uniform float uTime;
  uniform float uAspect;
  varying vec2 vScreen;
  varying float vShade;
  varying float vEdge;
  void main() {
    float period = mix(30.0, 52.0, fract(aSeed * 7.13));
    float cycle = uTime / period + aSeed;
    float loopId = floor(cycle);
    float t = fract(cycle);
    // New route each loop: direction and height vary, so it never feels scripted.
    bool rightward = fract(aSeed * 3.7 + loopId * 0.61) > 0.5;
    float x = rightward ? mix(-0.08, 1.08, t) : mix(1.08, -0.08, t);
    float y = mix(0.62, 0.9, fract(aSeed * 5.31 + loopId * 0.37)) + 0.02 * sin(t * 38.0 + aSeed * 30.0) + 0.02 * sin(t * 6.0);
    float scale = mix(0.008, 0.017, fract(aSeed * 9.7 + loopId * 0.13));
    float flap = sin(uTime * mix(7.0, 10.5, fract(aSeed * 2.9)) + aSeed * 40.0);

    float side = aVert < 2.5 ? -1.0 : 1.0;
    float k = mod(aVert, 3.0);
    vec2 off = vec2(0.0);
    vEdge = 0.0;
    if (k > 0.5 && k < 1.5) { off = vec2(side * 1.0, flap * 0.62); vEdge = 1.0; }   // wing tip
    else if (k > 1.5)       { off = vec2(side * 0.42, -0.2 + flap * 0.2); }          // trailing edge
    off *= vec2(scale / uAspect, scale);

    vec2 p = vec2(x, y) + off;
    vScreen = p;
    vShade = mix(1.0, 0.55, fract(aSeed * 2.3 + loopId * 0.29)); // farther birds are fainter
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec2 vScreen;
  varying float vShade;
  varying float vEdge;
  uniform sampler2D uSky;
  uniform vec2 uCenter;
  uniform vec2 uVisible;
  uniform float uZoom;
  uniform float uLevel;
  void main() {
    // Same camera mapping as the photo, so we can look up the sky matte under this pixel.
    vec2 suv = uCenter + (vScreen - 0.5) * uVisible / uZoom;
    float openSky = smoothstep(0.55, 0.9, texture2D(uSky, suv).r);
    gl_FragColor = vec4(vec3(0.02, 0.025, 0.035), 0.8 * vShade * uLevel * openSky * (1.0 - 0.35 * vEdge));
  }
`;

const BIRD_COUNT = { high: 5, medium: 4, low: 2 } as const;

export default function Birds({
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
  const count = BIRD_COUNT[tier];
  const materialRef = useRef<ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 6 * 3);
    const seeds = new Float32Array(count * 6);
    const verts = new Float32Array(count * 6);
    for (let b = 0; b < count; b++) {
      const seed = (b + 0.37) / count + (b % 2) * 0.11;
      for (let v = 0; v < 6; v++) {
        seeds[b * 6 + v] = seed;
        verts[b * 6 + v] = v;
      }
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(positions, 3));
    g.setAttribute("aSeed", new Float32BufferAttribute(seeds, 1));
    g.setAttribute("aVert", new Float32BufferAttribute(verts, 1));
    return g;
  }, [count]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAspect: { value: 1.6 },
      uSky: { value: textures.sky },
      uCenter: { value: new Vector2(0.5, 0.5) },
      uVisible: { value: new Vector2(1, 1) },
      uZoom: { value: 1 },
      uLevel: { value: 0 },
    }),
    [textures],
  );

  useFrame(() => {
    const material = materialRef.current;
    if (!material) return;
    const l = live.current;
    const v = view.current;
    const u = material.uniforms;

    const fit = coverFit(v.aspect);
    const halfX = fit.visibleX / (2 * v.zoom);
    const halfY = fit.visibleY / (2 * v.zoom);
    u.uCenter.value.set(MathUtils.clamp(fit.focusX, halfX, 1 - halfX), MathUtils.clamp(fit.focusY, halfY, 1 - halfY));
    u.uVisible.value.set(fit.visibleX, fit.visibleY);
    u.uZoom.value = v.zoom;
    u.uTime.value = v.time;
    u.uAspect.value = v.aspect;
    // Birds fly by day and at the edges of night; not in rain or deep darkness.
    u.uLevel.value = (1 - MathUtils.smoothstep(l.stars, 0.05, 0.6)) * (1 - MathUtils.smoothstep(l.rain, 0.1, 0.45));
  });

  return (
    <mesh geometry={geometry} frustumCulled={false} renderOrder={6}>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthTest={false}
        depthWrite={false}
        // Two wing triangles with mirrored winding: draw both faces or one wing vanishes.
        side={DoubleSide}
      />
    </mesh>
  );
}
