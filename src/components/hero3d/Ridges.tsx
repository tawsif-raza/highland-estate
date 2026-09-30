"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  InstancedMesh,
  MathUtils,
  MeshBasicMaterial,
  Object3D,
} from "three";
import type { QualityTier } from "@/hooks/useQualityTier";
import type { LiveRef } from "./liveEnv";
import { ridged1D, seededUnit } from "./noise";

interface Layer {
  z: number;
  base: number;
  amp: number;
  freq: number;
  seed: number;
  /** 0 = nearest (darkest), 1 = furthest (haziest). */
  depth: number;
  /** Notch that opens a view to the mountains behind, near the estate. */
  valleyDepth: number;
}

// Nearest → furthest. Far ridges are much taller so they still climb above the
// horizon line when seen from the low camera; fog does the rest.
export const LAYERS: Layer[] = [
  { z: -9, base: -1.0, amp: 2.4, freq: 0.32, seed: 1, depth: 0.0, valleyDepth: 1.6 },
  { z: -20, base: 0.2, amp: 4.2, freq: 0.2, seed: 2, depth: 0.18, valleyDepth: 1.8 },
  { z: -36, base: 2.2, amp: 7.5, freq: 0.14, seed: 3, depth: 0.36, valleyDepth: 2.5 },
  { z: -58, base: 3.6, amp: 12, freq: 0.1, seed: 4, depth: 0.54, valleyDepth: 0 },
  { z: -88, base: 5.5, amp: 19, freq: 0.07, seed: 5, depth: 0.74, valleyDepth: 0 },
  { z: -128, base: 7.5, amp: 28, freq: 0.05, seed: 6, depth: 0.92, valleyDepth: 0 },
];

const NIGHT_FOREST = new Color("#060c09");
const DAY_FOREST = new Color("#2a4f3b");
const HAZE = new Color("#4b6470");

export function halfWidth(layer: Layer) {
  return (Math.abs(layer.z) + 20) * 1.35;
}

export function ridgeHeight(layer: Layer, x: number): number {
  const noise = ridged1D(x * layer.freq, layer.seed);
  const valley = layer.valleyDepth * Math.exp(-(((x - 5) / 11) ** 2));
  return layer.base + layer.amp * (noise - 0.2) - valley;
}

function buildRidgeGeometry(layer: Layer, segments: number): BufferGeometry {
  const half = halfWidth(layer);
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const bottom = -8;

  for (let i = 0; i <= segments; i++) {
    const x = -half + (2 * half * i) / segments;
    const top = ridgeHeight(layer, x);
    // Top vertex is brightest, base fades darker — a free vertical gradient.
    positions.push(x, top, layer.z, x, bottom, layer.z);
    colors.push(1, 1, 1, 0.42, 0.42, 0.42);
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  return geometry;
}

const PINE_LAYERS = [0, 1];
const dummy = new Object3D();
const tint = new Color();

function layerTint(out: Color, depth: number, day: number, fog: Color) {
  out.copy(NIGHT_FOREST).lerp(DAY_FOREST, day);
  out.lerp(HAZE, depth * 0.55 * (0.4 + day * 0.6));
  out.lerp(fog, depth * 0.35);
  return out;
}

export default function Ridges({ live, tier }: { live: LiveRef; tier: QualityTier }) {
  const segments = tier === "low" ? 120 : 220;
  const pineCount = tier === "high" ? 220 : tier === "medium" ? 130 : 60;

  const geometries = useMemo(() => LAYERS.map((layer) => buildRidgeGeometry(layer, segments)), [segments]);
  const materials = useRef<(MeshBasicMaterial | null)[]>([]);
  const pineMaterial = useRef<MeshBasicMaterial>(null);
  const pines = useRef<InstancedMesh>(null);

  useEffect(() => {
    return () => geometries.forEach((geometry) => geometry.dispose());
  }, [geometries]);

  useLayoutEffect(() => {
    const mesh = pines.current;
    if (!mesh) return;
    for (let i = 0; i < pineCount; i++) {
      const layer = LAYERS[PINE_LAYERS[i % PINE_LAYERS.length]];
      const half = halfWidth(layer) * 0.92;
      const x = (seededUnit(i, 1) * 2 - 1) * half;
      const scale = 0.7 + seededUnit(i, 2) * 1.3;
      dummy.position.set(x, ridgeHeight(layer, x) + scale * 0.55, layer.z + (seededUnit(i, 3) - 0.5) * 0.8);
      dummy.scale.set(scale * 0.55, scale, scale * 0.55);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [pineCount]);

  useFrame(() => {
    const l = live.current;
    LAYERS.forEach((layer, i) => {
      const material = materials.current[i];
      if (material) material.color.copy(layerTint(tint, layer.depth, l.day, l.fog));
    });
    if (pineMaterial.current) {
      pineMaterial.current.color.copy(layerTint(tint, 0, l.day, l.fog)).multiplyScalar(MathUtils.lerp(0.75, 1, l.day));
    }
  });

  return (
    <group>
      {LAYERS.map((layer, i) => (
        <mesh key={layer.z} geometry={geometries[i]} frustumCulled={false}>
          <meshBasicMaterial
            ref={(node) => {
              materials.current[i] = node;
            }}
            vertexColors
          />
        </mesh>
      ))}

      <instancedMesh ref={pines} args={[undefined, undefined, pineCount]} frustumCulled={false}>
        <coneGeometry args={[0.5, 1.6, 6]} />
        <meshBasicMaterial ref={pineMaterial} />
      </instancedMesh>
    </group>
  );
}
