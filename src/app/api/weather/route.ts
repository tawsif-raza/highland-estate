import { NextResponse } from "next/server";
import { ESTATE_COORDINATES } from "@/lib/weather-data";

// In-memory cache for the OpenWeatherMap response.
// Keeps a single cached result for up to 30 minutes to stay well within
// the free tier's 60-calls/min limit even under heavy traffic.
let cachedWeather: { data: Record<string, unknown>; expiresAt: number } | null = null;
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export async function GET() {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;

  // Graceful degradation: if no API key is configured, return a clear
  // signal so the client can fall back to showing only static climate data.
  if (!apiKey) {
    return NextResponse.json(
      { error: "Weather API key not configured", fallback: true },
      { status: 200 },
    );
  }

  // Return cached data if still fresh
  if (cachedWeather && Date.now() < cachedWeather.expiresAt) {
    return NextResponse.json(cachedWeather.data);
  }

  try {
    const url = new URL("https://api.openweathermap.org/data/2.5/weather");
    url.searchParams.set("lat", String(ESTATE_COORDINATES.lat));
    url.searchParams.set("lon", String(ESTATE_COORDINATES.lon));
    url.searchParams.set("appid", apiKey);
    url.searchParams.set("units", "metric");

    const response = await fetch(url.toString(), { next: { revalidate: 1800 } });

    if (!response.ok) {
      const text = await response.text();
      console.error(`OpenWeatherMap API error: ${response.status} — ${text}`);
      return NextResponse.json(
        { error: "Failed to fetch weather data", fallback: true },
        { status: 200 },
      );
    }

    const raw = await response.json();

    // Shape the response to only what the client needs — don't leak the
    // full OWM payload (which includes our coordinates, API internals, etc.)
    const data = {
      temp: Math.round(raw.main?.temp ?? 0),
      feelsLike: Math.round(raw.main?.feels_like ?? 0),
      humidity: raw.main?.humidity ?? 0,
      description: raw.weather?.[0]?.description ?? "clear sky",
      icon: raw.weather?.[0]?.icon ?? "01d",
      windSpeed: Math.round((raw.wind?.speed ?? 0) * 3.6), // m/s → km/h
      visibility: raw.visibility ? Math.round(raw.visibility / 1000) : null, // m → km
      sunrise: raw.sys?.sunrise ?? null,
      sunset: raw.sys?.sunset ?? null,
      fallback: false,
    };

    cachedWeather = { data, expiresAt: Date.now() + CACHE_DURATION_MS };

    return NextResponse.json(data);
  } catch (err) {
    console.error("Weather fetch failed:", err);
    return NextResponse.json(
      { error: "Weather service unavailable", fallback: true },
      { status: 200 },
    );
  }
}
