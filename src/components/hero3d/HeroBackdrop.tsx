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
  { id: "live", label: "Live", active: "bg-emerald-400/20 text-emerald-300 border border-emerald-400/30" },
  { id: "dawn", label: "Dawn", active: "bg-rose-400/20 text-rose-300 border border-rose-400/30" },
  { id: "day", label: "Day", active: "bg-sky-400/20 text-sky-300 border border-sky-400/30" },
  { id: "dusk", label: "Dusk", active: "bg-amber-400/20 text-amber-300 border border-amber-400/30" },
  { id: "night", label: "Night", active: "bg-indigo-400/20 text-indigo-300 border border-indigo-400/30" },
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
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  }).format(epochMs);
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
  // Each report of a too-low frame rate steps one tier down; past "low" the
  // still poster takes over, so a weak device never gets a stuttering hero.
  const handleDegrade = useCallback(() => setDegrade((steps) => steps + 1), []);

  const tierIndex = TIERS.indexOf(capability.tier) + degrade;
  const tier = TIERS[Math.min(tierIndex, TIERS.length - 1)];
  const sceneMounted = capability.enabled && mountScene && !lost && tierIndex < TIERS.length;

  const posterScale = useTransform(scrollProgress, [0, 1], [1, 1.2]);
  const sceneScale = useTransform(scrollProgress, [0, 1], [1, 1.06]);
  const sceneOpacity = useTransform(scrollProgress, [0, 0.9], [1, 0.3]);

  const forcedLabel = mode !== "live" ? mode : override.phase;
  // A forced demo weather (?wx=) replaces the real reading, so label it as such.
  const statusText = override.weather
    ? override.weather.toUpperCase()
    : weather && displayStatus !== "CHECKING WEATHER..." && displayStatus !== "WEATHER UNAVAILABLE"
      ? displayStatus
      : null;

  return (
    <>
      <motion.div
        ref={rootRef}
        className="absolute inset-0 z-0 overflow-hidden"
        style={{ scale: sceneMounted && ready ? sceneScale : posterScale }}
      >
        {/* Poster: in the server HTML, so it is the LCP and the no-WebGL fallback. */}
        <Image
          src={HERO_IMAGE}
          alt="The Highland Estate at dusk, misty cabins glowing among the hills"
          fill
          priority
          sizes="100vw"
          className="object-cover"
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
                environment={environment}
                initialEnvironment={INITIAL_ENVIRONMENT}
                tier={tier}
                scroll={scrollProgress}
                active={inView && tabVisible}
                onReady={handleReady}
                onContextLost={handleContextLost}
                onDegrade={handleDegrade}
              />
            </motion.div>
          </div>
        )}

        {/* Keeps the headline readable in every phase, including full daylight.
            Heavier on the still poster; lighter over the 3D scene, which controls its own light. */}
        {sceneMounted && ready ? (
          <>
            <div className="bg-radial-vignette absolute inset-0" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/45" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />
        )}
      </motion.div>

      {sceneMounted && ready && clock !== 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-6 z-30 flex items-end justify-between gap-3 px-4 sm:pl-8 sm:pr-24">
          <div className="pointer-events-auto inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3.5 py-1.5 text-[11px] font-medium tracking-wide text-[#E8EDEB]/90 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="truncate">
              {forcedLabel ? forcedLabel.toUpperCase() : "LIVE"} · Coorg {formatEstateTime(clock)}
              {statusText ? ` · ${statusText}` : ""}
              {weather && !override.weather ? ` · ${Math.round(weather.temp)}°C` : ""}
            </span>
          </div>

          <div
            role="group"
            aria-label="Time of day"
            className="pointer-events-auto hidden items-center rounded-full border border-white/10 bg-black/40 p-1 text-[11px] backdrop-blur-md sm:inline-flex"
          >
            {MODES.map(({ id, label, active }) => (
              <button
                key={id}
                type="button"
                aria-pressed={mode === id}
                onClick={() => setMode(id)}
                className={`cursor-pointer rounded-full px-2.5 py-1 font-medium transition-all ${
                  mode === id ? active : "text-white/60 hover:text-white"
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
