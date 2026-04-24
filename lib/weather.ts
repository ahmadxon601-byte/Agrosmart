import { regions, type RegionKey } from "./agro-data";
import type { WeatherSnapshot } from "./advice";

type OpenMeteoResponse = {
  current?: {
    temperature_2m?: number;
  };
  hourly?: {
    time?: string[];
    precipitation_probability?: number[];
  };
};

export async function getWeather(regionKey: RegionKey): Promise<WeatherSnapshot> {
  const region = regions[regionKey];
  const url = new URL("https://api.open-meteo.com/v1/forecast");

  url.searchParams.set("latitude", String(region.lat));
  url.searchParams.set("longitude", String(region.lon));
  url.searchParams.set("current", "temperature_2m");
  url.searchParams.set("hourly", "precipitation_probability");
  url.searchParams.set("forecast_days", "1");
  url.searchParams.set("timezone", "Asia/Tashkent");

  try {
    const response = await fetch(url, {
      next: { revalidate: 900 }
    });

    if (!response.ok) {
      throw new Error(`Weather API failed with ${response.status}`);
    }

    const data = (await response.json()) as OpenMeteoResponse;
    const temperature = data.current?.temperature_2m;
    const probabilities = data.hourly?.precipitation_probability?.filter((value) => typeof value === "number") ?? [];
    const rainProbability = probabilities.length ? Math.max(...probabilities.slice(0, 12)) : 0;

    if (typeof temperature !== "number") {
      throw new Error("Weather API returned no temperature");
    }

    return {
      temperature,
      rainProbability,
      source: "Open-Meteo"
    };
  } catch {
    return fallbackWeather(regionKey);
  }
}

function fallbackWeather(regionKey: RegionKey): WeatherSnapshot {
  const dryRegions: RegionKey[] = ["buxoro", "navoiy", "qoraqalpogiston", "xorazm", "surxondaryo"];
  const isDry = dryRegions.includes(regionKey);
  const month = new Date().getMonth() + 1;
  const isHotSeason = month >= 5 && month <= 9;

  return {
    temperature: isHotSeason ? (isDry ? 34 : 30) : isDry ? 20 : 18,
    rainProbability: isDry ? 15 : 35,
    source: "Fallback"
  };
}
