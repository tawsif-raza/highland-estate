"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  MONTHLY_CLIMATE,
  SEASONS,
  ESTATE_COORDINATES,
  type MonthClimate,
} from "@/lib/weather-data";
import { useWeather } from "@/hooks/useWeather";
import type { NormalizedWeather, WeatherDisplayStatus } from "@/lib/weather-service";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function ratingStars(rating: number) {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

function rainfallColor(level: MonthClimate["rainfallLevel"]) {
  switch (level) {
    case "low":
      return "bg-emerald-400/80";
    case "moderate":
      return "bg-amber-400/80";
    case "high":
      return "bg-orange-400/80";
    case "very-high":
      return "bg-sky-400/80";
  }
}

function crowdBadge(level: MonthClimate["crowdLevel"]) {
  switch (level) {
    case "low":
      return { text: "Quiet", color: "text-emerald-300" };
    case "moderate":
      return { text: "Moderate", color: "text-amber-300" };
    case "high":
      return { text: "Popular", color: "text-rose-300" };
  }
}

function owmIconUrl(icon: string) {
  return `https://openweathermap.org/img/wn/${icon}@2x.png`;
}

/* ------------------------------------------------------------------ */
/*  Fade-in on scroll (reuses the pattern from AmenitiesSection)      */
/* ------------------------------------------------------------------ */

function FadeIn({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-8 opacity-0"
      } ${className ?? ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Live Weather Card                                                 */
/* ------------------------------------------------------------------ */

function LiveWeatherCard({
  weather,
  displayStatus,
  loading,
}: {
  weather: NormalizedWeather | null;
  displayStatus: WeatherDisplayStatus;
  loading: boolean;
}) {
  return (
    <motion.div
      id="live-run-status"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-md sm:p-8"
    >
      {/* Subtle gradient glow */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-accent/5 blur-3xl" />

      {/* Header with LIVE RUN indicator */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                loading
                  ? "animate-pulse bg-amber-400"
                  : weather
                    ? "animate-ping bg-emerald-400"
                    : "bg-rose-400"
              }`}
            />
            <span
              className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                loading
                  ? "bg-amber-500"
                  : weather
                    ? "bg-emerald-500"
                    : "bg-rose-500"
              }`}
            />
          </span>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent/70">
            LIVE RUN • {ESTATE_COORDINATES.name}
          </p>
        </div>

        <span className="rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent">
          {displayStatus}
        </span>
      </div>

      {loading ? (
        <div className="mt-6 flex items-center gap-4 py-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
          <div>
            <p className="font-lora text-xl text-white">Connecting to Weather Station...</p>
            <p className="mt-0.5 text-xs text-accent/60">Fetching live conditions for the estate</p>
          </div>
        </div>
      ) : weather ? (
        <>
          <div className="mt-4 flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={owmIconUrl(weather.icon)}
              alt={displayStatus}
              width={72}
              height={72}
              className="drop-shadow-lg"
            />
            <div>
              <div className="flex items-baseline gap-3">
                <p className="font-lora text-5xl text-white">
                  {weather.temp}°
                  <span className="text-2xl text-accent/60">C</span>
                </p>
                <span className="text-sm font-semibold uppercase tracking-wider text-accent/90">
                  {displayStatus}
                </span>
              </div>
              <p className="mt-0.5 text-sm capitalize text-accent/70">
                {weather.description}
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm text-accent/70 sm:grid-cols-4">
            <div>
              <p className="text-xs text-accent/40">Feels Like</p>
              <p className="text-accent">{weather.feelsLike}°C</p>
            </div>
            <div>
              <p className="text-xs text-accent/40">Humidity</p>
              <p className="text-accent">{weather.humidity}%</p>
            </div>
            <div>
              <p className="text-xs text-accent/40">Wind</p>
              <p className="text-accent">{weather.windSpeed} km/h</p>
            </div>
            {weather.visibility !== null && (
              <div>
                <p className="text-xs text-accent/40">Visibility</p>
                <p className="text-accent">{weather.visibility} km</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="mt-6 flex items-center gap-4 py-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-2xl">
            ☁️
          </div>
          <div>
            <p className="font-lora text-xl text-white">Station Offline</p>
            <p className="mt-0.5 text-xs text-accent/60">
              Live weather is temporarily unavailable. Seasonal climate guide shown below.
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Season Cards                                                      */
/* ------------------------------------------------------------------ */

function SeasonCards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {SEASONS.map((season, i) => (
        <FadeIn key={season.name} delay={i * 100}>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
            <p className="text-2xl">{season.emoji}</p>
            <p className="mt-2 font-lora text-lg text-white">
              {season.name}
            </p>
            <p className="text-xs font-medium text-accent/50">
              {season.months}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-accent/70">
              {season.description}
            </p>
          </div>
        </FadeIn>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Monthly Climate Chart                                             */
/* ------------------------------------------------------------------ */

function MonthlyChart() {
  const currentMonth = new Date().getMonth(); // 0-indexed
  const maxRainfall = Math.max(...MONTHLY_CLIMATE.map((m) => m.rainfallMm));

  return (
    <div className="overflow-x-auto pb-2">
      <div className="grid min-w-[700px] grid-cols-12 gap-2">
        {MONTHLY_CLIMATE.map((month, i) => {
          const barHeight = Math.max(
            8,
            (month.rainfallMm / maxRainfall) * 100,
          );
          const crowd = crowdBadge(month.crowdLevel);
          const isCurrentMonth = i === currentMonth;

          return (
            <div
              key={month.shortMonth}
              className={`group relative flex flex-col items-center rounded-xl px-1 py-3 text-center transition-colors ${
                isCurrentMonth
                  ? "bg-white/10 ring-1 ring-accent/30"
                  : "hover:bg-white/5"
              }`}
            >
              <p
                className={`text-xs font-semibold ${
                  isCurrentMonth ? "text-accent" : "text-accent/60"
                }`}
              >
                {month.shortMonth}
              </p>

              {/* Temperature range */}
              <p className="mt-2 text-sm font-medium text-white">
                {month.avgHighC}°
              </p>
              <p className="text-xs text-accent/40">{month.avgLowC}°</p>

              {/* Rainfall bar */}
              <div className="mt-2 flex h-[100px] w-3 items-end overflow-hidden rounded-full bg-white/5">
                <div
                  className={`w-full rounded-full transition-all duration-500 ${rainfallColor(
                    month.rainfallLevel,
                  )}`}
                  style={{ height: `${barHeight}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] text-accent/40">
                {month.rainfallMm}mm
              </p>

              {/* Crowd & Rating */}
              <p className={`mt-2 text-[10px] font-medium ${crowd.color}`}>
                {crowd.text}
              </p>
              <p className="mt-0.5 text-xs text-yellow-500">
                {ratingStars(month.rating)}
              </p>

              {/* Tooltip for highlight */}
              {month.highlight && (
                <div className="pointer-events-none absolute -top-16 left-1/2 z-10 w-40 -translate-x-1/2 rounded-lg bg-dark-accent/95 px-3 py-2 text-[10px] leading-snug text-accent/80 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                  {month.highlight}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Section                                                      */
/* ------------------------------------------------------------------ */

export default function WeatherSection() {
  const { weather, displayStatus, loading } = useWeather();

  return (
    <section id="weather" className="bg-dark-accent py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <FadeIn>
          <div className="text-center">
            <span className="rounded-full border border-accent/20 bg-accent/5 px-4 py-1 text-xs font-medium uppercase tracking-widest text-accent/50">
              Plan Your Visit
            </span>
            <h2 className="mt-5 font-lora text-4xl text-accent sm:text-5xl">
              Weather &amp; Best Time to Visit
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-accent/60">
              Nestled in the Western Ghats at 1,000m elevation, the estate
              enjoys a temperate highland climate with misty mornings year-round.
            </p>
          </div>
        </FadeIn>

        {/* Live weather / LIVE RUN status */}
        <div className="mt-14">
          <LiveWeatherCard
            weather={weather}
            displayStatus={displayStatus}
            loading={loading}
          />
        </div>

        {/* Season overview */}
        <div className="mt-12">
          <FadeIn>
            <h3 className="mb-6 font-lora text-2xl text-accent">
              Seasonal Overview
            </h3>
          </FadeIn>
          <SeasonCards />
        </div>

        {/* Monthly breakdown */}
        <div className="mt-14">
          <FadeIn>
            <h3 className="mb-2 font-lora text-2xl text-accent">
              Month-by-Month Guide
            </h3>
            <p className="mb-6 text-sm text-accent/50">
              Scroll horizontally to explore all months. Hover for seasonal highlights.
            </p>
          </FadeIn>
          <FadeIn delay={100}>
            <MonthlyChart />
          </FadeIn>
        </div>

        {/* Legend */}
        <FadeIn delay={200}>
          <div className="mt-8 flex flex-wrap items-center gap-4 text-xs text-accent/50">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
              Low rain
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400/80" />
              Moderate
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-400/80" />
              High
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-sky-400/80" />
              Very high (monsoon)
            </span>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
