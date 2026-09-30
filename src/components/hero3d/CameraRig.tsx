"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MathUtils, Vector3, type PerspectiveCamera } from "three";
import type { MotionValue } from "framer-motion";

const INTRO_SECONDS = 4;
const LOOK_AT = new Vector3();

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Cinematic camera: a slow intro dolly-in, a gentle idle drift, pointer
 * parallax, and a scroll-linked pull-back/rise as the hero leaves the screen.
 * All state lives in refs and is written inside useFrame / event handlers.
 */
export default function CameraRig({ scroll }: { scroll: MotionValue<number> }) {
  const pointer = useRef({ x: 0, y: 0 });
  const smooth = useRef({ x: 0, y: 0 });
  const elapsed = useRef(0);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (event.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame((state, rawDelta) => {
    // Clamp so returning to the tab (or scrolling back on-screen) doesn't jump.
    const delta = Math.min(rawDelta, 0.05);
    elapsed.current += delta;
    const t = elapsed.current;

    const camera = state.camera as PerspectiveCamera;
    const intro = easeOutCubic(MathUtils.clamp(t / INTRO_SECONDS, 0, 1));
    const p = MathUtils.clamp(scroll.get(), 0, 1);

    smooth.current.x = MathUtils.damp(smooth.current.x, pointer.current.x, 2.4, delta);
    smooth.current.y = MathUtils.damp(smooth.current.y, pointer.current.y, 2.4, delta);

    const driftX = Math.sin(t * 0.13) * 0.3;
    const driftY = Math.sin(t * 0.09 + 1) * 0.12;

    camera.position.set(
      driftX + smooth.current.x * 0.45,
      MathUtils.lerp(1.3, 2.6, intro) + driftY - smooth.current.y * 0.18 + p * 1.6,
      MathUtils.lerp(14, 8, intro) + p * 4,
    );

    LOOK_AT.set(smooth.current.x * 0.9, 5.4 + p * 0.8 - smooth.current.y * 0.25, -40);
    camera.lookAt(LOOK_AT);
    camera.rotateZ((1 - intro) * 0.035);

    // Portrait screens need a taller field of view to keep the estate in frame.
    const aspect = state.size.width / state.size.height;
    const portraitBoost = aspect < 1 ? (1 - aspect) * 24 : 0;
    const fov = MathUtils.lerp(55, 45, intro) + p * 3 + portraitBoost;
    if (Math.abs(camera.fov - fov) > 0.001) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
