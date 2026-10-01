"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, MathUtils, ShaderMaterial, type Mesh } from "three";
import type { QualityTier } from "@/hooks/useQualityTier";
import type { LiveRef } from "../liveEnv";
import type { ViewRef } from "./view";

// Screen-space rain in front of the photo. Each drop is a thin quad (two
// triangles) sized in real pixels: near drops are long, wide and fast, far drops
// short, fine and faint, and all of them slant with the shared wind gust. The
// slant is computed in pixels, so the angle is right on any screen shape, and
// drops wrap around the edges instead of draining one side.

const vertexShader = /* glsl */ `
  attribute vec3 aSeed;   // x: column, y: phase, z: depth (0 far … 1 near)
  attribute float aCorner;
  uniform float uTime;
  uniform float uWind;
  uniform float uGust;
  uniform float uAspect;
  uniform float uPxH;
  uniform float uOffsetX;
  varying float vAlpha;
  void main() {
    float depth = aSeed.z;
    float speed = mix(0.5, 1.5, depth);
    float lenPx = mix(9.0, 64.0, depth);
    float widthPx = mix(0.8, 2.2, depth);
    float wind = uWind * (0.4 + 0.9 * uGust);
    float slant = 0.05 + wind * 0.36;              // horizontal px per vertical px

    float t = fract(aSeed.y + uTime * speed * 0.55);
    float y = 1.06 - t * 1.16;
    float drift = (1.06 - y) * slant / uAspect;
    float x = fract(aSeed.x - drift + uOffsetX * (0.3 + depth)) * 1.2 - 0.1;

    float pxW = uPxH * uAspect;
    vec2 dirPx = normalize(vec2(slant, 1.0));      // tail points up-wind
    vec2 perpPx = vec2(dirPx.y, -dirPx.x);
    bool tail = aCorner > 1.5 && aCorner != 3.0;
    float side = (aCorner < 0.5 || (aCorner > 1.5 && aCorner < 2.5) || aCorner > 4.5) ? -1.0 : 1.0;

    vec2 offPx = (tail ? dirPx * lenPx : vec2(0.0)) + perpPx * side * widthPx * 0.5;
    vec2 p = vec2(x, y) + offPx / vec2(pxW, uPxH);
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
    vAlpha = mix(0.09, 0.3, depth) * (tail ? 0.0 : 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vAlpha;
  uniform vec3 uColor;
  uniform float uLevel;
  void main() {
    gl_FragColor = vec4(uColor, vAlpha * uLevel);
    #include <colorspace_fragment>
  }
`;

const RAIN_TINT = new Color("#d6e4f2");

function unit(n: number, salt: number) {
  const s = Math.sin(n * 12.9898 + salt * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

export default function Rain({ live, view, tier }: { live: LiveRef; view: ViewRef; tier: QualityTier }) {
  const maxDrops = tier === "high" ? 1250 : tier === "medium" ? 800 : 400;
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<ShaderMaterial>(null);
  const lastCount = useRef(-1);

  const geometry = useMemo(() => {
    const verts = maxDrops * 6;
    const positions = new Float32Array(verts * 3);
    const corners = new Float32Array(verts);
    const seeds = new Float32Array(verts * 3);
    for (let i = 0; i < maxDrops; i++) {
      // Bias toward far (thin, faint) drops; a few near, bright ones sell the depth.
      const depth = Math.pow(unit(i, 3), 1.6);
      for (let c = 0; c < 6; c++) {
        const o = i * 6 + c;
        corners[o] = c;
        seeds[o * 3] = unit(i, 1);
        seeds[o * 3 + 1] = unit(i, 2);
        seeds[o * 3 + 2] = depth;
      }
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(positions, 3));
    g.setAttribute("aCorner", new Float32BufferAttribute(corners, 1));
    g.setAttribute("aSeed", new Float32BufferAttribute(seeds, 3));
    return g;
  }, [maxDrops]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWind: { value: 0 },
      uGust: { value: 0.4 },
      uAspect: { value: 1.6 },
      uPxH: { value: 900 },
      uOffsetX: { value: 0 },
      uColor: { value: new Color("#d6e4f2") },
      uLevel: { value: 1 },
    }),
    [],
  );

  useFrame((state) => {
    const material = materialRef.current;
    const mesh = meshRef.current;
    if (!material || !mesh) return;
    const l = live.current;
    const v = view.current;
    const u = material.uniforms;

    u.uTime.value = v.time;
    u.uWind.value = l.wind;
    u.uGust.value = v.gust;
    u.uAspect.value = v.aspect;
    u.uPxH.value = state.size.height * state.viewport.dpr;
    u.uOffsetX.value = v.offsetX * 1.6;
    u.uColor.value.copy(l.horizon).lerp(RAIN_TINT, 0.6);
    // Rain reads brighter against a bright sky and needs the lights to show at night.
    u.uLevel.value = MathUtils.lerp(0.7, 1.25, l.day);

    const count = Math.floor(maxDrops * MathUtils.clamp(l.rain, 0, 1));
    if (count !== lastCount.current) {
      lastCount.current = count;
      mesh.geometry.setDrawRange(0, count * 6);
      mesh.visible = count > 0;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} frustumCulled={false} renderOrder={10} visible={false}>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthTest={false}
        depthWrite={false}
        side={DoubleSide}
      />
    </mesh>
  );
}
