/**
 * Weather service and status mapping layer.
 * Normalizes OpenWeatherMap data into human-readable, dynamic LIVE RUN statuses.
 */

export type WeatherDisplayStatus =
  | "SUNNY"
  | "CLOUDY"
  | "PARTLY CLOUDY"
  | "RAINING"
  | "HEAVY RAIN"
  | "STORMY"
  | "FOGGY"
  | "SNOWING"
  | "CHECKING WEATHER..."
  | "WEATHER UNAVAILABLE";

export interface NormalizedWeather {
  temp: number;
  feelsLike: number;
  humidity: number;
  description: string;
  icon: string;
  windSpeed: number;
  visibility: number | null;
  sunrise: number | null;
  sunset: number | null;
  weatherId: number | null;
  weatherMain: string | null;
  fallback: boolean;
}

/**
 * Maps OpenWeatherMap numeric condition code, main category, and description
 * to a canonical display status for the LIVE RUN indicator.
 */
export function mapWeatherToDisplayStatus(
  weatherId?: number | null,
  main?: string | null,
  description?: string | null
): WeatherDisplayStatus {
  // 1. Prefer official OpenWeatherMap numeric condition codes (2xx - 80x)
  if (typeof weatherId === "number" && !Number.isNaN(weatherId)) {
    // 2xx: Thunderstorm
    if (weatherId >= 200 && weatherId < 300) {
      return "STORMY";
    }

    // 3xx: Drizzle
    if (weatherId >= 300 && weatherId < 400) {
      return "RAINING";
    }

    // 5xx: Rain
    if (weatherId >= 500 && weatherId < 600) {
      // 502 = heavy intensity rain, 503 = very heavy rain, 504 = extreme rain, 522 = heavy shower rain
      if (weatherId === 502 || weatherId === 503 || weatherId === 504 || weatherId === 522) {
        return "HEAVY RAIN";
      }
      return "RAINING";
    }

    // 6xx: Snow
    if (weatherId >= 600 && weatherId < 700) {
      return "SNOWING";
    }

    // 7xx: Atmosphere (701 Mist, 711 Smoke, 721 Haze, 731 Sand/dust whirls, 741 Fog, 751 Sand, 761 Dust, 771 Squalls, 781 Tornado)
    if (weatherId >= 700 && weatherId < 800) {
      return "FOGGY";
    }

    // 800: Clear sky
    if (weatherId === 800) {
      return "SUNNY";
    }

    // 801-802: Few clouds (11-25%), Scattered clouds (25-50%)
    if (weatherId === 801 || weatherId === 802) {
      return "PARTLY CLOUDY";
    }

    // 803-804: Broken clouds (51-84%), Overcast clouds (85-100%)
    if (weatherId === 803 || weatherId === 804) {
      return "CLOUDY";
    }
  }

  // 2. String-based fallback matching if ID is absent or unrecognized
  const text = `${main ?? ""} ${description ?? ""}`.toLowerCase().trim();
  if (!text) {
    return "WEATHER UNAVAILABLE";
  }

  if (text.includes("thunderstorm") || text.includes("storm") || text.includes("squall")) {
    return "STORMY";
  }
  if (text.includes("heavy rain") || text.includes("extreme rain") || text.includes("torrential")) {
    return "HEAVY RAIN";
  }
  if (text.includes("rain") || text.includes("drizzle") || text.includes("shower")) {
    return "RAINING";
  }
  if (text.includes("snow") || text.includes("sleet") || text.includes("blizzard")) {
    return "SNOWING";
  }
  if (
    text.includes("fog") ||
    text.includes("mist") ||
    text.includes("haze") ||
    text.includes("smoke") ||
    text.includes("dust")
  ) {
    return "FOGGY";
  }
  if (text.includes("few clouds") || text.includes("scattered clouds") || text.includes("partly cloudy")) {
    return "PARTLY CLOUDY";
  }
  if (text.includes("cloud") || text.includes("overcast")) {
    return "CLOUDY";
  }
  if (text.includes("clear") || text.includes("sun")) {
    return "SUNNY";
  }

  // 3. Graceful fallback for unknown conditions
  return "WEATHER UNAVAILABLE";
}
