"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  MathUtils,
  ShaderMaterial,
  type LineSegments,
} from "three";
import type { QualityTier } from "@/hooks/useQualityTier";
import type { LiveRef } from "./liveEnv";
import { seededUnit } from "./noise";

// ---------------------------------------------------------------------------
// Fireflies — one Points object, all motion in the vertex shader.
// ---------------------------------------------------------------------------

const fireflyVertex = /* glsl */ `
  attribute float aPhase;
  attribute float aSize;
  uniform float uTime;
  uniform float uIntensity;
  uniform float uPixelRatio;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    p.x += sin(uTime * 0.5 + aPhase * 6.283) * 0.9;
    p.y += sin(uTime * 0.7 + aPhase * 12.0) * 0.5;
    p.z += cos(uTime * 0.4 + aPhase * 9.0) * 0.7;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float blink = 0.5 + 0.5 * sin(uTime * 1.6 + aPhase * 40.0);
    vAlpha = uIntensity * blink * blink;
    gl_PointSize = aSize * uPixelRatio * (78.0 / -mv.z);
  }
`;

const fireflyFragment = /* glsl */ `
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(1.0, 0.86, 0.42, a * a * vAlpha);
    #include <colorspace_fragment>
  }
`;

function Fireflies({ live, count }: { live: LiveRef; count: number }) {
  const materialRef = useRef<ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (seededUnit(i, 1) * 2 - 1) * 17;
      positions[i * 3 + 1] = 0.5 + seededUnit(i, 2) * 4.2;
      positions[i * 3 + 2] = -24 + seededUnit(i, 3) * 27;
      phases[i] = seededUnit(i, 4);
      sizes[i] = 0.7 + seededUnit(i, 5) * 1.1;
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(positions, 3));
    g.setAttribute("aPhase", new Float32BufferAttribute(phases, 1));
    g.setAttribute("aSize", new Float32BufferAttribute(sizes, 1));
    return g;
  }, [count]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uIntensity: { value: 0 }, uPixelRatio: { value: 1 } }),
    [],
  );

  useFrame((state, delta) => {
    const material = materialRef.current;
    if (!material) return;
    const l = live.current;
    material.uniforms.uTime.value += Math.min(delta, 0.05);
    material.uniforms.uPixelRatio.value = state.gl.getPixelRatio();
    // Visible from dusk into the night, gone by day and in the rain.
    material.uniforms.uIntensity.value =
      MathUtils.clamp((0.75 - l.day) * 1.6, 0, 1) * (1 - MathUtils.smoothstep(l.rain, 0.1, 0.5)) * 0.95;
  });

  return (
    <points geometry={geometry} frustumCulled={false} renderOrder={8}>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={fireflyVertex}
        fragmentShader={fireflyFragment}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        fog={false}
      />
    </points>
  );
}

// ---------------------------------------------------------------------------
// Rain — LineSegments; drops fall and wrap in the vertex shader, and the draw
// range grows with rain intensity so light drizzle is cheaper than a storm.
// ---------------------------------------------------------------------------

const rainVertex = /* glsl */ `
  attribute float aEnd;
  attribute float aSeed;
  uniform float uTime;
  uniform float uWind;
  uniform float uSpeed;
  varying float vAlpha;
  void main() {
    float height = 24.0;
    float fall = uTime * uSpeed * (0.85 + aSeed * 0.35);
    float y = mod(position.y - fall, height) - 3.0;
    vec3 p = vec3(position.x, y, position.z);
    float slant = 0.25 + uWind * 1.1;
    p.x -= aEnd * slant;
    p.y -= aEnd * (0.9 + aSeed * 0.5);
    vAlpha = (1.0 - aEnd * 0.75) * (0.55 + aSeed * 0.45);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const rainFragment = /* glsl */ `
  varying float vAlpha;
  uniform vec3 uColor;
  uniform float uOpacity;
  void main() {
    gl_FragColor = vec4(uColor, vAlpha * uOpacity);
    #include <colorspace_fragment>
  }
`;

const RAIN_TINT = new Color("#dbe8f2");

function Rain({ live, maxDrops }: { live: LiveRef; maxDrops: number }) {
  const lineRef = useRef<LineSegments>(null);
  const materialRef = useRef<ShaderMaterial>(null);
  const lastCount = useRef(-1);

  const geometry = useMemo(() => {
    const positions = new Float32Array(maxDrops * 2 * 3);
    const ends = new Float32Array(maxDrops * 2);
    const seeds = new Float32Array(maxDrops * 2);
    for (let i = 0; i < maxDrops; i++) {
      const x = (seededUnit(i, 11) * 2 - 1) * 24;
      const y = seededUnit(i, 12) * 24;
      const z = -26 + seededUnit(i, 13) * 38;
      const seed = seededUnit(i, 14);
      for (let v = 0; v < 2; v++) {
        const o = (i * 2 + v) * 3;
        positions[o] = x;
        positions[o + 1] = y;
        positions[o + 2] = z;
        ends[i * 2 + v] = v;
        seeds[i * 2 + v] = seed;
      }
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(positions, 3));
    g.setAttribute("aEnd", new Float32BufferAttribute(ends, 1));
    g.setAttribute("aSeed", new Float32BufferAttribute(seeds, 1));
    return g;
  }, [maxDrops]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWind: { value: 0 },
      uSpeed: { value: 22 },
      uColor: { value: new Color("#cfe0ee") },
      uOpacity: { value: 0.5 },
    }),
    [],
  );

  useFrame((_, delta) => {
    const material = materialRef.current;
    const line = lineRef.current;
    if (!material || !line) return;
    const l = live.current;

    material.uniforms.uTime.value += Math.min(delta, 0.05);
    material.uniforms.uWind.value = l.wind;
    material.uniforms.uColor.value.copy(l.horizon).lerp(RAIN_TINT, 0.55);
    material.uniforms.uOpacity.value = MathUtils.lerp(0.32, 0.55, l.day);

    const count = Math.floor(maxDrops * MathUtils.clamp(l.rain, 0, 1));
    if (count !== lastCount.current) {
      lastCount.current = count;
      line.geometry.setDrawRange(0, count * 2);
      line.visible = count > 0;
    }
  });

  return (
    <lineSegments ref={lineRef} geometry={geometry} frustumCulled={false} renderOrder={9} visible={false}>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={rainVertex}
        fragmentShader={rainFragment}
        transparent
        depthWrite={false}
        fog={false}
      />
    </lineSegments>
  );
}

export default function Particles({ live, tier }: { live: LiveRef; tier: QualityTier }) {
  const fireflies = tier === "high" ? 120 : tier === "medium" ? 80 : 40;
  const drops = tier === "high" ? 1600 : tier === "medium" ? 1000 : 500;
  return (
    <group>
      <Fireflies live={live} count={fireflies} />
      <Rain live={live} maxDrops={drops} />
    </group>
  );
}
