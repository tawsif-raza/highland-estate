"use client";

import { useSyncExternalStore } from "react";

export type QualityTier = "high" | "medium" | "low";

export interface SceneCapability {
  /** False → show the static poster only (no WebGL, reduced motion, data saver, very weak device). */
  enabled: boolean;
  tier: QualityTier;
  reason?: "server" | "no-webgl" | "reduced-motion" | "save-data" | "low-end";
}

// What the server (and the first client render) sees. Identical on both sides,
// so hydration never mismatches; the real answer arrives via useSyncExternalStore.
const SERVER_CAPABILITY: SceneCapability = { enabled: false, tier: "low", reason: "server" };

let cached: SceneCapability | null = null;

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

function compute(): SceneCapability {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return { enabled: false, tier: "low", reason: "reduced-motion" };
  }

  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean };
    deviceMemory?: number;
  };
  if (nav.connection?.saveData) {
    return { enabled: false, tier: "low", reason: "save-data" };
  }

  if (!hasWebGL()) {
    return { enabled: false, tier: "low", reason: "no-webgl" };
  }

  // ?tier=low|medium|high forces a tier (for testing on a specific device class).
  const forced = new URLSearchParams(window.location.search).get("tier");
  if (forced === "low" || forced === "medium" || forced === "high") {
    return { enabled: true, tier: forced };
  }

  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;
  if (cores <= 2 || memory <= 2) {
    return { enabled: false, tier: "low", reason: "low-end" };
  }

  const isMobile =
    window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;

  if (isMobile) return { enabled: true, tier: "low" };
  if (cores >= 6 && memory >= 4) return { enabled: true, tier: "high" };
  return { enabled: true, tier: "medium" };
}

function getSnapshot(): SceneCapability {
  if (!cached) cached = compute();
  return cached;
}

function getServerSnapshot(): SceneCapability {
  return SERVER_CAPABILITY;
}

// Re-evaluate if the visitor toggles "reduce motion" while the page is open.
function subscribe(onChange: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  const handler = () => {
    cached = null;
    onChange();
  };
  query.addEventListener("change", handler);
  return () => query.removeEventListener("change", handler);
}

export function useSceneCapability(): SceneCapability {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
