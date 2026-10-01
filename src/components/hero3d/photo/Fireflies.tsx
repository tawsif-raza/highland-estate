"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BufferGeometry, Float32BufferAttribute, MathUtils, ShaderMaterial, Vector2 } from "three";
import type { QualityTier } from "@/hooks/useQualityTier";
import type { LiveRef } from "../liveEnv";
import { coverFit, type ViewRef } from "./view";
import type { PhotoTextures } from "./usePhotoTextures";

// Fireflies live in the PHOTO's own space: each has a home position on the image
// and is projected through the same camera (cover fit, zoom, parallax by the depth
// under it) as the photo itself, so they stay locked to the plants instead of
// swimming in front of the picture. They only glow above foliage (the mask) and
// well in front of the far hills (the depth), in yellow-green, to read as insects
// rather than the warm-orange garden lamps.

const vertexShader = /* glsl */ `
  attribute vec3 aSeed;   // x, y: home position in photo uv (y up); z: personal phase
  attribute float aSize;
  uniform sampler2D uMasks;
  uniform sampler2D uDepthFwd;
  uniform vec2 uCenter;
  uniform vec2 uVisible;
  uniform float uZoom;
  uniform vec2 uOffset;
  uniform float uTime;
  uniform float uGust;
  uniform float uIntensity;
  uniform float uPixelRatio;
  varying float vAlpha;
  void main() {
    vec2 home = aSeed.xy;
    float depth = textureLod(uDepthFwd, home, 0.0).r;
    float foliage = textureLod(uMasks, home, 2.0).b;
    float ph = aSeed.z * 6.2831;

    // Slow, irregular wandering (a little more when it is breezy).
    vec2 wander = vec2(
      0.012 * sin(uTime * 0.31 + ph) + 0.007 * sin(uTime * 0.83 + ph * 2.3),
      0.010 * sin(uTime * 0.41 + ph * 1.7) + 0.005 * sin(uTime * 1.1 + ph)
    ) * (0.7 + 0.6 * uGust);
    vec2 world = home + wander + uOffset * (depth - 0.35);

    vec2 screen = (world - uCenter) * uZoom / uVisible + 0.5;
    gl_Position = vec4(screen * 2.0 - 1.0, 0.0, 1.0);

    // Two interfering pulses give an uneven, organic blink.
    float a = 0.5 + 0.5 * sin(uTime * (0.9 + aSeed.z) + ph * 3.0);
    float b = 0.6 + 0.4 * sin(uTime * 2.3 + ph * 5.0);
    float blink = pow(a * b, 3.0);

    float onPlants = smoothstep(0.35, 0.65, foliage) * smoothstep(0.3, 0.45, depth);
    vAlpha = uIntensity * blink * onPlants;
    gl_PointSize = aSize * uPixelRatio * mix(1.0, 2.6, depth);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = 1.0 - smoothstep(0.0, 0.5, d);
    gl_FragColor = vec4(0.85, 1.0, 0.38, a * a * vAlpha);
    #include <colorspace_fragment>
  }
`;

function unit(n: number, salt: number) {
  const s = Math.sin(n * 12.9898 + salt * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

export default function Fireflies({
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
  // Many are hidden (not over foliage), so generate extra homes.
  const count = tier === "high" ? 150 : tier === "medium" ? 100 : 60;
  const materialRef = useRef<ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      seeds[i * 3] = 0.03 + unit(i, 1) * 0.94;
      seeds[i * 3 + 1] = 0.04 + unit(i, 2) * 0.5; // the plantation: the lower half of the photo
      seeds[i * 3 + 2] = unit(i, 3);
      sizes[i] = 1.6 + unit(i, 4) * 1.8;
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(positions, 3));
    g.setAttribute("aSeed", new Float32BufferAttribute(seeds, 3));
    g.setAttribute("aSize", new Float32BufferAttribute(sizes, 1));
    return g;
  }, [count]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uMasks: { value: textures.masks },
      uDepthFwd: { value: textures.depthFwd },
      uCenter: { value: new Vector2(0.5, 0.5) },
      uVisible: { value: new Vector2(1, 1) },
      uZoom: { value: 1 },
      uOffset: { value: new Vector2() },
      uTime: { value: 0 },
      uGust: { value: 0.4 },
      uIntensity: { value: 0 },
      uPixelRatio: { value: 1 },
    }),
    [textures],
  );

  useFrame((state) => {
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
    u.uOffset.value.set(v.offsetX, v.offsetY);
    u.uTime.value = v.time;
    u.uGust.value = v.gust;
    u.uPixelRatio.value = state.gl.getPixelRatio();
    // Out from dusk into the night; gone by day and in the rain.
    u.uIntensity.value = MathUtils.clamp((0.75 - l.day) * 1.6, 0, 1) * (1 - MathUtils.smoothstep(l.rain, 0.1, 0.5)) * 0.9;
  });

  return (
    <points geometry={geometry} frustumCulled={false} renderOrder={8}>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthTest={false}
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}
