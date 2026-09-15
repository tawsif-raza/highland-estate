// Static monthly climate data for The Highland Estate (Coorg, Karnataka).
// Source: regional averages for the Western Ghats hill-station belt.
// Used by WeatherSection.tsx for the "Best Time to Visit" panel.

export interface MonthClimate {
  month: string;
  shortMonth: string;
  avgHighC: number;
  avgLowC: number;
  rainfallMm: number;
  rainfallLevel: "low" | "moderate" | "high" | "very-high";
  crowdLevel: "low" | "moderate" | "high";
  rating: 1 | 2 | 3 | 4 | 5;
  highlight?: string;
}

export const MONTHLY_CLIMATE: MonthClimate[] = [
  {
    month: "January",
    shortMonth: "Jan",
    avgHighC: 28,
    avgLowC: 14,
    rainfallMm: 8,
    rainfallLevel: "low",
    crowdLevel: "high",
    rating: 5,
    highlight: "Peak season — cool, dry, perfect plantation weather",
  },
  {
    month: "February",
    shortMonth: "Feb",
    avgHighC: 30,
    avgLowC: 15,
    rainfallMm: 12,
    rainfallLevel: "low",
    crowdLevel: "moderate",
    rating: 5,
    highlight: "Clear skies with blooming coffee flowers",
  },
  {
    month: "March",
    shortMonth: "Mar",
    avgHighC: 32,
    avgLowC: 18,
    rainfallMm: 18,
    rainfallLevel: "low",
    crowdLevel: "moderate",
    rating: 4,
  },
  {
    month: "April",
    shortMonth: "Apr",
    avgHighC: 33,
    avgLowC: 20,
    rainfallMm: 55,
    rainfallLevel: "moderate",
    crowdLevel: "low",
    rating: 3,
  },
  {
    month: "May",
    shortMonth: "May",
    avgHighC: 31,
    avgLowC: 20,
    rainfallMm: 120,
    rainfallLevel: "moderate",
    crowdLevel: "moderate",
    rating: 3,
    highlight: "Summer break — warm days, evening thunderstorms",
  },
  {
    month: "June",
    shortMonth: "Jun",
    avgHighC: 27,
    avgLowC: 19,
    rainfallMm: 350,
    rainfallLevel: "very-high",
    crowdLevel: "low",
    rating: 2,
    highlight: "Monsoon begins — dramatic mist and lush greenery",
  },
  {
    month: "July",
    shortMonth: "Jul",
    avgHighC: 25,
    avgLowC: 18,
    rainfallMm: 550,
    rainfallLevel: "very-high",
    crowdLevel: "low",
    rating: 2,
  },
  {
    month: "August",
    shortMonth: "Aug",
    avgHighC: 25,
    avgLowC: 18,
    rainfallMm: 400,
    rainfallLevel: "very-high",
    crowdLevel: "low",
    rating: 2,
  },
  {
    month: "September",
    shortMonth: "Sep",
    avgHighC: 27,
    avgLowC: 18,
    rainfallMm: 220,
    rainfallLevel: "high",
    crowdLevel: "low",
    rating: 3,
    highlight: "Post-monsoon — misty mornings, fewer crowds",
  },
  {
    month: "October",
    shortMonth: "Oct",
    avgHighC: 28,
    avgLowC: 17,
    rainfallMm: 160,
    rainfallLevel: "moderate",
    crowdLevel: "moderate",
    rating: 4,
    highlight: "Harvest season begins — coffee cherries ripen",
  },
  {
    month: "November",
    shortMonth: "Nov",
    avgHighC: 28,
    avgLowC: 16,
    rainfallMm: 65,
    rainfallLevel: "moderate",
    crowdLevel: "high",
    rating: 5,
    highlight: "Peak harvest — plantation tours at their best",
  },
  {
    month: "December",
    shortMonth: "Dec",
    avgHighC: 27,
    avgLowC: 14,
    rainfallMm: 20,
    rainfallLevel: "low",
    crowdLevel: "high",
    rating: 5,
    highlight: "Festive season — cool misty mornings, warm days",
  },
];

export const ESTATE_COORDINATES = {
  lat: 12.42,
  lon: 75.74,
  name: "Coorg, Karnataka",
} as const;

// Seasonal summaries for the hero badges in the weather section
export const SEASONS = [
  {
    name: "Peak Season",
    months: "Oct – Feb",
    emoji: "☀️",
    description: "Cool, dry weather with misty mornings and clear evenings. Ideal for plantation walks.",
  },
  {
    name: "Monsoon",
    months: "Jun – Sep",
    emoji: "🌧️",
    description: "Heavy rainfall transforms the estate into a lush green paradise. Best for solitude seekers.",
  },
  {
    name: "Summer",
    months: "Mar – May",
    emoji: "🌤️",
    description: "Warm days with occasional evening showers. Coffee flowers bloom across the plantation.",
  },
] as const;
