"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  MathUtils,
  type MeshBasicMaterial,
  type PointLight,
  type Sprite,
  type SpriteMaterial,
} from "three";
import type { LiveRef } from "./liveEnv";
import { LAYERS, ridgeHeight } from "./Ridges";
import { seededUnit } from "./noise";

interface Cabin {
  x: number;
  y: number;
  z: number;
  rotationY: number;
  scale: number;
  chimney: boolean;
}

// Kept to the left of centre so the headline and buttons have clear sky/hills.
const CABIN_XS_LANDSCAPE = [-11.2, -7.6, -4.6, -14.8];
// A portrait screen sees a much narrower slice of the valley, so bring the cabins in.
const CABIN_XS_PORTRAIT = [-3.6, -1.3];
const WARM = new Color("#ffb45c");
const glowColor = new Color();

const PUFFS_PER_CHIMNEY = 5;

function makeGlowTexture(): CanvasTexture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.35, "rgba(255,255,255,0.45)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }
  return new CanvasTexture(canvas);
}

export default function Cabins({ live }: { live: LiveRef }) {
  const near = LAYERS[0];
  const isPortrait = useThree((state) => state.size.width < state.size.height);
  const xs = isPortrait ? CABIN_XS_PORTRAIT : CABIN_XS_LANDSCAPE;

  const cabins = useMemo<Cabin[]>(
    () =>
      xs.map((x, i) => ({
        x,
        y: ridgeHeight(near, x) - 0.05,
        z: near.z + 0.4 + seededUnit(i, 9) * 0.6,
        rotationY: (seededUnit(i, 5) - 0.5) * 0.5,
        scale: 0.9 + seededUnit(i, 6) * 0.35,
        chimney: i % 2 === 0,
      })),
    [near, xs],
  );

  const glowTexture = useMemo(() => makeGlowTexture(), []);
  useEffect(() => () => glowTexture.dispose(), [glowTexture]);

  const windowMaterials = useRef<(MeshBasicMaterial | null)[]>([]);
  const haloSprites = useRef<(Sprite | null)[]>([]);
  const lights = useRef<(PointLight | null)[]>([]);
  const puffs = useRef<(Sprite | null)[]>([]);
  const clock = useRef(0);

  const chimneyCabins = cabins.filter((cabin) => cabin.chimney);

  useFrame((_, delta) => {
    const l = live.current;
    clock.current += Math.min(delta, 0.05);
    const t = clock.current;

    cabins.forEach((_cabin, i) => {
      // Slow, uneven flicker so the lamps feel alive rather than pulsing in sync.
      const flicker = 0.9 + 0.1 * Math.sin(t * 2.7 + i * 1.9) * Math.sin(t * 1.1 + i * 0.7);
      const glow = l.windowGlow * flicker;

      glowColor.copy(WARM).multiplyScalar(0.12 + glow * 1.7);
      windowMaterials.current[i * 2]?.color.copy(glowColor);
      windowMaterials.current[i * 2 + 1]?.color.copy(glowColor);

      const halo = haloSprites.current[i];
      if (halo) (halo.material as SpriteMaterial).opacity = glow * 0.55;

      const light = lights.current[i];
      if (light) light.intensity = glow * 7;
    });

    // Chimney smoke: each puff rises, widens and fades, looping on its own phase.
    puffs.current.forEach((puff, i) => {
      if (!puff) return;
      const chimney = chimneyCabins[Math.floor(i / PUFFS_PER_CHIMNEY)];
      if (!chimney) return;
      const phase = (t * 0.1 + (i % PUFFS_PER_CHIMNEY) / PUFFS_PER_CHIMNEY + seededUnit(i, 4) * 0.1) % 1;
      const rise = phase * 3.2 * chimney.scale;
      const drift = phase * phase * (0.8 + l.wind * 3.5);
      puff.position.set(
        chimney.x + 0.42 * chimney.scale + drift,
        chimney.y + 1.55 * chimney.scale + rise,
        chimney.z,
      );
      const size = (0.3 + phase * 1.3) * chimney.scale;
      puff.scale.set(size, size, 1);
      const material = puff.material as SpriteMaterial;
      material.opacity = Math.sin(phase * Math.PI) * 0.32 * MathUtils.lerp(1, 0.55, l.day);
    });
  });

  return (
    <group>
      {cabins.map((cabin, i) => (
        <group
          key={cabin.x}
          position={[cabin.x, cabin.y, cabin.z]}
          rotation={[0, cabin.rotationY, 0]}
          scale={cabin.scale}
        >
          {/* body */}
          <mesh position={[0, 0.45, 0]}>
            <boxGeometry args={[1.5, 0.9, 1.2]} />
            <meshLambertMaterial color="#2c1e15" />
          </mesh>
          {/* roof */}
          <mesh position={[0, 1.27, 0]} rotation={[0, Math.PI / 4, 0]} scale={[1, 1, 0.82]}>
            <coneGeometry args={[1.22, 0.75, 4]} />
            <meshLambertMaterial color="#17110c" />
          </mesh>
          {/* chimney */}
          {cabin.chimney && (
            <mesh position={[0.42, 1.5, 0]}>
              <boxGeometry args={[0.16, 0.5, 0.16]} />
              <meshLambertMaterial color="#120d09" />
            </mesh>
          )}
          {/* lit windows */}
          {[-0.36, 0.36].map((wx, k) => (
            <mesh key={wx} position={[wx, 0.5, 0.605]}>
              <planeGeometry args={[0.3, 0.36]} />
              <meshBasicMaterial
                ref={(node) => {
                  windowMaterials.current[i * 2 + k] = node;
                }}
                color="#ffb45c"
                toneMapped={false}
              />
            </mesh>
          ))}
          {/* glow halo (works on every quality tier, no post-processing needed) */}
          <sprite
            ref={(node) => {
              haloSprites.current[i] = node;
            }}
            position={[0, 0.5, 0.9]}
            scale={[2.6, 2, 1]}
          >
            <spriteMaterial
              map={glowTexture}
              color="#ff9d42"
              transparent
              opacity={0}
              depthWrite={false}
              blending={AdditiveBlending}
              fog={false}
            />
          </sprite>
          {/* lamplight spilling on the ground and the neighbouring cabins */}
          <pointLight
            ref={(node) => {
              lights.current[i] = node;
            }}
            position={[0, 0.7, 1.4]}
            color="#ffae5a"
            intensity={0}
            distance={9}
            decay={2}
          />
        </group>
      ))}

      {/* chimney smoke */}
      {chimneyCabins.flatMap((chimney, c) =>
        Array.from({ length: PUFFS_PER_CHIMNEY }, (_, p) => {
          const index = c * PUFFS_PER_CHIMNEY + p;
          return (
            <sprite
              key={`${chimney.x}-${p}`}
              ref={(node) => {
                puffs.current[index] = node;
              }}
            >
              <spriteMaterial
                map={glowTexture}
                color="#9aa3a8"
                transparent
                opacity={0}
                depthWrite={false}
                fog={false}
              />
            </sprite>
          );
        }),
      )}
    </group>
  );
}
