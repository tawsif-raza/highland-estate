"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, DoubleSide, MathUtils, ShaderMaterial } from "three";
import type { QualityTier } from "@/hooks/useQualityTier";
import type { LiveRef } from "./liveEnv";

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec2 vUv;
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uSpeed;
  uniform float uSeed;
  uniform float uScale;

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
    float a = 0.55;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = p * 2.05 + 17.0;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 p = vec2(vUv.x * uScale + uTime * uSpeed + uSeed, vUv.y * 2.2 - uTime * 0.01);
    float n = fbm(p);
    // Wisps: only the denser parts of the noise show, feathered at every edge.
    float wisp = smoothstep(0.36, 0.82, n);
    float edgeY = smoothstep(0.0, 0.4, vUv.y) * smoothstep(1.0, 0.5, vUv.y);
    float edgeX = smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x);
    float a = wisp * edgeY * edgeX * uOpacity;
    gl_FragColor = vec4(uColor, a);
    #include <colorspace_fragment>
  }
`;

interface Bank {
  z: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  seed: number;
  scale: number;
  /** Multiplies the live mist opacity so nearer banks stay subtle. */
  weight: number;
}

const BANKS: Bank[] = [
  { z: -14, y: 1.6, width: 90, height: 6, speed: 0.022, seed: 3, scale: 5, weight: 0.5 },
  { z: -27, y: 2.6, width: 130, height: 8, speed: 0.016, seed: 11, scale: 6, weight: 0.75 },
  { z: -46, y: 4.2, width: 190, height: 11, speed: 0.011, seed: 27, scale: 7, weight: 0.9 },
  { z: -74, y: 6.5, width: 260, height: 15, speed: 0.008, seed: 41, scale: 8, weight: 1.0 },
];

function MistBank({ bank, live }: { bank: Bank; live: LiveRef }) {
  const materialRef = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uColor: { value: new Color() },
      uOpacity: { value: 0.5 },
      uTime: { value: 0 },
      uSpeed: { value: bank.speed },
      uSeed: { value: bank.seed },
      uScale: { value: bank.scale },
    }),
    [bank],
  );

  useFrame((_, delta) => {
    const material = materialRef.current;
    if (!material) return;
    const l = live.current;
    const u = material.uniforms;
    u.uTime.value += Math.min(delta, 0.05) * (0.7 + l.wind * 1.6);
    // Mist catches the light: horizon colour by day, cooler fog colour at night.
    u.uColor.value.copy(l.fog).lerp(l.horizon, MathUtils.lerp(0.25, 0.55, l.day));
    // Thinner in full daylight so a clear day reads crisp instead of milky.
    u.uOpacity.value = l.mist * bank.weight * 0.85 * MathUtils.lerp(1, 0.55, l.day);
  });

  return (
    <mesh position={[0, bank.y, bank.z]} renderOrder={5} frustumCulled={false}>
      <planeGeometry args={[bank.width, bank.height]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        fog={false}
        side={DoubleSide}
      />
    </mesh>
  );
}

export default function Mist({ live, tier }: { live: LiveRef; tier: QualityTier }) {
  const banks = tier === "low" ? BANKS.slice(1, 3) : tier === "medium" ? BANKS.slice(0, 3) : BANKS;
  return (
    <group>
      {banks.map((bank) => (
        <MistBank key={bank.z} bank={bank} live={live} />
      ))}
    </group>
  );
}
