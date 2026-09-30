"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BackSide, Color, ShaderMaterial, Vector3, type Mesh } from "three";
import type { LiveRef } from "./liveEnv";

const vertexShader = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vDir;
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform vec3 uCelestial;
  uniform vec3 uFog;
  uniform vec3 uSunDir;
  uniform float uMoon;
  uniform float uStars;
  uniform float uCloud;
  uniform float uTime;

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
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p *= 2.03;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;

    // Vertical gradient, blending into the fog colour below the horizon so the
    // ridges' fog and the sky meet without a seam.
    vec3 col = mix(uHorizon, uZenith, smoothstep(0.0, 0.7, h));
    col = mix(uFog, col, smoothstep(-0.14, 0.03, h));

    // Sun / moon: soft halo + disc.
    float s = max(dot(d, normalize(uSunDir)), 0.0);
    float halo = pow(s, 42.0) * 0.85 + pow(s, 8.0) * 0.14;
    float disc = smoothstep(0.9986, 0.9996, s);
    float strength = mix(1.0, 0.55, uMoon);
    col += uCelestial * halo * strength;
    col = mix(col, uCelestial, disc * mix(1.0, 0.92, uMoon));

    // Sunrise/sunset band: a wide glow hugging the horizon on the sun's side.
    vec2 dxz = normalize(d.xz + vec2(1e-5));
    vec2 sxz = normalize(uSunDir.xz + vec2(1e-5));
    float az = max(dot(dxz, sxz), 0.0);
    float low = 1.0 - smoothstep(0.05, 0.5, uSunDir.y);
    float band = exp(-abs(h) * 6.5) * pow(az, 3.0) * low * (1.0 - uMoon * 0.75);
    col += uCelestial * band * 0.75;

    // Stars: a grid over (azimuth, elevation); a few cells hold a star at a
    // jittered position, drawn as a small soft dot, twinkling, above the horizon.
    vec2 suv = vec2(atan(d.x, -d.z), d.y) * 85.0;
    vec2 cell = floor(suv);
    vec2 local = fract(suv);
    float r = hash(cell);
    vec2 jitter = vec2(hash(cell + 1.7), hash(cell + 9.2)) * 0.6 + 0.2;
    float dist = length(local - jitter);
    float radius = 0.05 + hash(cell + 4.1) * 0.08;
    float star = step(0.975, r) * smoothstep(radius, 0.0, dist) * smoothstep(0.03, 0.25, h);
    star *= 0.55 + 0.45 * sin(uTime * 1.7 + r * 60.0);
    col += vec3(1.0, 0.97, 0.9) * star * uStars * 1.6;

    // Cloud bands drifting slowly, thicker with cloud cover.
    vec2 cuv = d.xz / (h + 0.4) * 1.5 + vec2(uTime * 0.012, 0.0);
    float c = fbm(cuv);
    c = smoothstep(0.5 - uCloud * 0.3, 0.9, c) * smoothstep(0.0, 0.22, h);
    vec3 cloudCol = mix(uHorizon, uFog, 0.55) * 0.92 + uCelestial * halo * 0.35;
    col = mix(col, cloudCol, c * (0.18 + uCloud * 0.65));

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

export default function Sky({ live }: { live: LiveRef }) {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uZenith: { value: new Color() },
      uHorizon: { value: new Color() },
      uCelestial: { value: new Color() },
      uFog: { value: new Color() },
      uSunDir: { value: new Vector3(0, 0.3, -0.6) },
      uMoon: { value: 0 },
      uStars: { value: 0 },
      uCloud: { value: 0.2 },
      uTime: { value: 0 },
    }),
    [],
  );

  useFrame((state, delta) => {
    const material = materialRef.current;
    const mesh = meshRef.current;
    if (!material || !mesh) return;

    const l = live.current;
    const u = material.uniforms;
    u.uZenith.value.copy(l.zenith);
    u.uHorizon.value.copy(l.horizon);
    u.uCelestial.value.copy(l.celestial);
    u.uFog.value.copy(l.fog);
    u.uSunDir.value.copy(l.sunDir);
    u.uMoon.value = l.moon;
    u.uStars.value = l.stars;
    u.uCloud.value = l.cloud;
    u.uTime.value += Math.min(delta, 0.05);

    // Keep the dome centred on the camera so it never parallaxes.
    mesh.position.copy(state.camera.position);
  });

  return (
    <mesh ref={meshRef} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[420, 32, 20]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        side={BackSide}
        depthWrite={false}
        fog={false}
      />
    </mesh>
  );
}
