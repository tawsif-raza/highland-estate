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
} from "@/lib/hero-environment";
import type { NormalizedWeather, WeatherDisplayStatus } from "@/lib/weather-service";
import SceneSettings, {
  DEFAULT_TIME,
  DEFAULT_WEATHER,
  type TimeChoice,
  type WeatherChoice,
} from "./SceneSettings";

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

  // The scene opens at dusk (exactly the photo's own look); the settings panel changes it.
  const [time, setTime] = useState<TimeChoice>(DEFAULT_TIME);
  const [weatherChoice, setWeatherChoice] = useState<WeatherChoice>(DEFAULT_WEATHER);
  // Until the visitor touches the settings, a demo URL (?env=&wx=) can still steer the scene.
  const [touched, setTouched] = useState(false);
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

  const chosenPhase = time !== "live" ? time : undefined;
  const chosenWeather = weatherChoice !== "live" ? weatherChoice : undefined;
  const effectivePhase = touched ? chosenPhase : (override.phase ?? chosenPhase);
  const effectiveWeather = touched ? chosenWeather : (override.weather ?? chosenWeather);

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
    return mapEnvironment(applyOverride(input, { phase: effectivePhase, weather: effectiveWeather }));
  }, [clock, weather, effectivePhase, effectiveWeather]);

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

  const handleTimeChange = useCallback((next: TimeChoice) => {
    setTouched(true);
    setTime(next);
  }, []);
  const handleWeatherChange = useCallback((next: WeatherChoice) => {
    setTouched(true);
    setWeatherChoice(next);
  }, []);

  // What it is really like in Coorg right now (independent of the visitor's choices).
  const liveStatus =
    weather && displayStatus !== "CHECKING WEATHER..." && displayStatus !== "WEATHER UNAVAILABLE"
      ? sentenceCase(displayStatus)
      : null;
  const liveSummary = clock
    ? [formatEstateTime(clock), liveStatus, weather ? `${Math.round(weather.temp)}°C` : null]
        .filter(Boolean)
        .join(" · ")
    : "";

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
        // Bottom-right, just left of the chat bubble (the bottom-left corner is taken by
        // Next.js's dev-tools badge while developing).
        <div className="pointer-events-none absolute bottom-6 right-[5.5rem] z-30">
          <SceneSettings
            time={time}
            weather={weatherChoice}
            onTimeChange={handleTimeChange}
            onWeatherChange={handleWeatherChange}
            liveSummary={liveSummary}
          />
        </div>
      )}
    </>
  );
}
