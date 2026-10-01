"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { motion, useTransform, type MotionValue } from "framer-motion";
import { useSceneCapability, type QualityTier } from "@/hooks/useQualityTier";
import {
  applyOverride,
  mapEnvironment,
  parseEnvOverride,
  type EnvironmentInput,
  type Phase,
} from "@/lib/hero-environment";
import type { NormalizedWeather, WeatherDisplayStatus } from "@/lib/weather-service";

// Module-level dynamic import (ssr: false) keeps three.js out of the first
// page load; it is only fetched once the browser is idle and capable.
const HeroScene = dynamic(() => import("./HeroScene"), { ssr: false });

const HERO_IMAGE = "/images/hero-exterior.png";

// The look the poster photo already has (misty dusk). The 3D scene starts here
// and eases to the live environment, so the crossfade never looks like a jump.
const INITIAL_ENVIRONMENT = mapEnvironment(
  applyOverride(
    { now: 0, sunrise: null, sunset: null, weatherId: 801, humidity: 85 },
    { phase: "dusk" },
  ),
);

const TIERS: QualityTier[] = ["high", "medium", "low"];

type Mode = "live" | Phase;

const MODES: { id: Mode; label: string; active: string }[] = [
  { id: "live", label: "Live", active: "bg-amber-300/20 text-amber-200 border border-amber-300/40" },
  { id: "dawn", label: "Dawn", active: "bg-rose-300/20 text-rose-200 border border-rose-300/35" },
  { id: "day", label: "Day", active: "bg-sky-300/20 text-sky-200 border border-sky-300/35" },
  { id: "dusk", label: "Dusk", active: "bg-orange-300/20 text-orange-200 border border-orange-300/35" },
  { id: "night", label: "Night", active: "bg-indigo-300/20 text-indigo-200 border border-indigo-300/35" },
];

// --- tiny external stores (hydration-safe: the server always sees 0 / "") -----

function subscribeClock(onChange: () => void) {
  const id = window.setInterval(onChange, 30_000);
  return () => window.clearInterval(id);
}
const getClock = () => Math.floor(Date.now() / 60_000) * 60_000;
const getServerClock = () => 0;

const subscribeNever = () => () => {};
const getSearch = () => window.location.search;
const getServerSearch = () => "";

function formatEstateTime(epochMs: number) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(epochMs);
}

function sentenceCase(text: string) {
  const lower = text.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

interface HeroBackdropProps {
  scrollProgress: MotionValue<number>;
  weather: NormalizedWeather | null;
  displayStatus: WeatherDisplayStatus;
}

export default function HeroBackdrop({ scrollProgress, weather, displayStatus }: HeroBackdropProps) {
  const capability = useSceneCapability();
  const clock = useSyncExternalStore(subscribeClock, getClock, getServerClock);
  const search = useSyncExternalStore(subscribeNever, getSearch, getServerSearch);

  const [mode, setMode] = useState<Mode>("live");
  const [mountScene, setMountScene] = useState(false);
  const [ready, setReady] = useState(false);
  const [lost, setLost] = useState(false);
  const [sceneKey, setSceneKey] = useState(0);
  const [degrade, setDegrade] = useState(0);
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);

  // Wait for an idle moment (and a capable device) before downloading the scene.
  useEffect(() => {
    if (!capability.enabled) return;
    let cancelled = false;
    const start = () => {
      if (!cancelled) setMountScene(true);
    };
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    if (idleWindow.requestIdleCallback) {
      const handle = idleWindow.requestIdleCallback(start, { timeout: 1500 });
      return () => {
        cancelled = true;
        idleWindow.cancelIdleCallback?.(handle);
      };
    }
    const handle = window.setTimeout(start, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [capability.enabled]);

  // Stop rendering whenever the hero is off-screen or the tab is hidden.
  useEffect(() => {
    const element = rootRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onVisibility = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const override = useMemo(() => parseEnvOverride(search), [search]);

  const environment = useMemo(() => {
    if (clock === 0) return INITIAL_ENVIRONMENT;
    const date = new Date(clock);
    const input: EnvironmentInput = {
      now: clock,
      sunrise: weather?.sunrise ?? null,
      sunset: weather?.sunset ?? null,
      fallbackHour: date.getHours() + date.getMinutes() / 60,
      weatherId: weather?.weatherId ?? null,
      humidity: weather?.humidity ?? null,
      windSpeed: weather?.windSpeed ?? null,
      // The weather API returns visibility in km; the environment model wants metres.
      visibility: weather?.visibility != null ? weather.visibility * 1000 : null,
    };
    return mapEnvironment(
      applyOverride(input, {
        phase: mode !== "live" ? mode : override.phase,
        weather: override.weather,
      }),
    );
  }, [clock, weather, mode, override]);

  const handleReady = useCallback(() => setReady(true), []);
  const handleContextLost = useCallback(() => {
    setLost(true);
    setReady(false);
  }, []);
  // The browser can give the GPU context back: rebuild the scene rather than give up on it.
  const handleContextRestored = useCallback(() => {
    setLost(false);
    setSceneKey((key) => key + 1);
  }, []);
  // Each report of a too-low frame rate steps one tier down; past "low" the
  // still poster takes over, so a weak device never gets a stuttering hero.
  const handleDegrade = useCallback(() => setDegrade((steps) => steps + 1), []);

  const tierIndex = TIERS.indexOf(capability.tier) + degrade;
  const tier = TIERS[Math.min(tierIndex, TIERS.length - 1)];
  const sceneMounted = capability.enabled && mountScene && !lost && tierIndex < TIERS.length;
  const showScene = sceneMounted && ready;

  const posterScale = useTransform(scrollProgress, [0, 1], [1, 1.2]);
  const sceneScale = useTransform(scrollProgress, [0, 1], [1, 1.06]);
  const sceneOpacity = useTransform(scrollProgress, [0, 0.9], [1, 0.3]);

  const forcedPhase = mode !== "live" ? mode : override.phase;
  const statusText = override.weather
    ? sentenceCase(override.weather)
    : weather && displayStatus !== "CHECKING WEATHER..." && displayStatus !== "WEATHER UNAVAILABLE"
      ? sentenceCase(displayStatus)
      : null;

  // More scrim behind the copy when the scene is bright (day, dawn).
  const brightScene = environment.phase === "day" || environment.phase === "dawn";
  const scrimStrength = brightScene ? 0.46 : 0.4;

  return (
    <>
      <motion.div
        ref={rootRef}
        className="absolute inset-0 z-0 overflow-hidden"
        style={{ scale: showScene ? sceneScale : posterScale }}
      >
        {/* Poster: in the server HTML, so it is the LCP and the no-WebGL fallback. The
            portrait crop matches the scene's own focus point, so the hand-over lines up. */}
        <Image
          src={HERO_IMAGE}
          alt="The Highland Estate at dusk, misty cabins glowing among the hills"
          fill
          priority
          sizes="100vw"
          className="object-cover portrait:object-[36%_52%]"
        />

        {sceneMounted && (
          <div
            aria-hidden="true"
            className={`absolute inset-0 transition-opacity duration-[1400ms] ease-out ${
              ready ? "opacity-100" : "opacity-0"
            }`}
          >
            <motion.div className="absolute inset-0" style={{ opacity: sceneOpacity }}>
              <HeroScene
                key={sceneKey}
                environment={environment}
                initialEnvironment={INITIAL_ENVIRONMENT}
                tier={tier}
                scroll={scrollProgress}
                active={inView && tabVisible}
                onReady={handleReady}
                onContextLost={handleContextLost}
                onContextRestored={handleContextRestored}
                onDegrade={handleDegrade}
              />
            </motion.div>
          </div>
        )}

        {/* Keeps the headline readable in every phase. The still poster gets a heavier
            wash; over the live scene (which controls its own light) a soft scrim sits just
            behind the copy. Both fade with the same 1.4 s transition as the scene. */}
        <div
          aria-hidden="true"
          className={`absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60 transition-opacity duration-[1400ms] ${
            showScene ? "opacity-0" : "opacity-100"
          }`}
        />
        <div
          aria-hidden="true"
          className={`absolute inset-0 [--scrim-y:50%] portrait:[--scrim-y:36%] transition-opacity duration-[1400ms] ${
            showScene ? "opacity-100" : "opacity-0"
          }`}
          style={{
            background: [
              `radial-gradient(ellipse 64% 44% at 50% var(--scrim-y), rgba(10,8,6,${scrimStrength}), transparent 72%)`,
              "linear-gradient(to bottom, rgba(0,0,0,0.24), transparent 36%, rgba(0,0,0,0.46))",
            ].join(", "),
          }}
        />
      </motion.div>

      {showScene && clock !== 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-6 z-30 flex items-end justify-between gap-3 px-4 sm:pl-8 sm:pr-24">
          <div className="pointer-events-auto inline-flex max-w-full items-center gap-2.5 rounded-full border border-white/10 bg-[rgba(20,14,10,0.55)] px-4 py-2 text-xs font-medium tracking-wide text-[#E8EDEB] backdrop-blur-md">
            <span className="relative flex h-2 w-2 shrink-0">
              {!forcedPhase && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300/70" />
              )}
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${forcedPhase ? "bg-white/50" : "bg-amber-300"}`}
              />
            </span>
            <span className="truncate">
              {forcedPhase ? (
                <>Preview · {sentenceCase(forcedPhase)}</>
              ) : (
                <>
                  Live · Coorg {formatEstateTime(clock)}
                  {statusText ? ` · ${statusText}` : ""}
                  {weather && !override.weather ? ` · ${Math.round(weather.temp)}°C` : ""}
                </>
              )}
            </span>
          </div>

          <div
            role="group"
            aria-label="Time of day"
            className="pointer-events-auto hidden items-center rounded-full border border-white/10 bg-[rgba(20,14,10,0.55)] p-1 text-xs backdrop-blur-md sm:inline-flex"
          >
            {MODES.map(({ id, label, active }) => (
              <button
                key={id}
                type="button"
                aria-pressed={mode === id}
                onClick={() => setMode(id)}
                className={`min-h-8 cursor-pointer rounded-full px-3 py-1.5 font-medium transition-all ${
                  mode === id ? active : "text-white/70 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
