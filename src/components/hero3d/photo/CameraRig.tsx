"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MathUtils } from "three";
import type { MotionValue } from "framer-motion";
import { gustAt, writeView, type ViewRef } from "./view";

const INTRO_SECONDS = 7;
const easeInOut = (t: number) => t * t * (3 - 2 * t);

/**
 * A virtual camera over the photograph: starts exactly where the still poster is
 * (so the hand-over is invisible), then a slow cinematic push-in, a living idle
 * drift (with a whisper of handheld shake), pointer parallax, and a pull-back as
 * the hero scrolls away. Also owns the shared wind gust. Writes into the view ref only.
 *
 * The intro clock only starts once the photo is actually on screen (`running`).
 */
export default function CameraRig({
  view,
  scroll,
  running,
}: {
  view: ViewRef;
  scroll: MotionValue<number>;
  running: boolean;
}) {
  const pointer = useRef({ x: 0, y: 0 });
  const smooth = useRef({ x: 0, y: 0 });

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
    const t = view.current.time + (running ? delta : 0);

    const intro = easeInOut(MathUtils.clamp(t / INTRO_SECONDS, 0, 1));
    const p = MathUtils.clamp(scroll.get(), 0, 1);

    smooth.current.x = MathUtils.damp(smooth.current.x, pointer.current.x, 2.2, delta);
    smooth.current.y = MathUtils.damp(smooth.current.y, pointer.current.y, 2.2, delta);

    // Handheld: two incommensurate slow waves, tiny amplitude.
    const shakeX = Math.sin(t * 1.9) * 0.0004 + Math.sin(t * 3.1 + 2) * 0.0002;
    const shakeY = Math.sin(t * 2.3 + 1) * 0.0003;

    // Parallax ramps in with the intro so the very first frame matches the poster.
    const live = intro;
    writeView(view.current, {
      time: t,
      aspect: state.size.width / state.size.height,
      gust: gustAt(t),
      // 1.0 → ~1.09: the extra margin means parallax never drags in the image edge.
      zoom: 1 + 0.09 * intro + Math.sin(t * 0.21) * 0.004 * live + p * 0.05,
      offsetX: -(smooth.current.x * 0.018 + Math.sin(t * 0.13) * 0.004 + shakeX) * live,
      // Screen-y grows downward while photo-uv grows upward: a mouse moving down moves
      // the camera down, so near objects move UP (+y). Scroll pulls the camera up (-y).
      offsetY: (smooth.current.y * 0.011 + Math.sin(t * 0.09 + 1) * 0.003 + shakeY) * live - p * 0.012,
    });
  });

  return null;
}
