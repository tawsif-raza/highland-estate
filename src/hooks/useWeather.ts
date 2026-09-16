"use client";

import { useEffect, useState } from "react";
import {
  mapWeatherToDisplayStatus,
  type NormalizedWeather,
  type WeatherDisplayStatus,
} from "@/lib/weather-service";

const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

export function useWeather() {
  const [weather, setWeather] = useState<NormalizedWeather | null>(null);
  const [displayStatus, setDisplayStatus] = useState<WeatherDisplayStatus>("CHECKING WEATHER...");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function fetchWeatherData() {
      try {
        const res = await fetch("/api/weather", { signal: controller.signal });
        if (!res.ok) {
          throw new Error(`Weather fetch failed: ${res.status}`);
        }

        const data = await res.json();
        if (cancelled) return;

        if (data.fallback) {
          setWeather(null);
          setDisplayStatus("WEATHER UNAVAILABLE");
          setError(data.error ?? "Weather data unavailable");
        } else {
          const normalized = data as NormalizedWeather;
          setWeather(normalized);
          const mapped = mapWeatherToDisplayStatus(
            normalized.weatherId,
            normalized.weatherMain,
            normalized.description
          );
          setDisplayStatus(mapped);
          setError(null);
        }
      } catch (err: unknown) {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setWeather(null);
        setDisplayStatus("WEATHER UNAVAILABLE");
        setError(err instanceof Error ? err.message : "Weather fetch error");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchWeatherData();

    const interval = setInterval(fetchWeatherData, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  return {
    weather,
    displayStatus,
    loading,
    error,
  };
}
