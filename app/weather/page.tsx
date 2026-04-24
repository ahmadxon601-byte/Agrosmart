"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Sidebar } from "@/app/components/sidebar";
import { regions, type RegionKey } from "@/lib/agro-data";

import styles from "./weather.module.css";

type WeatherDay = {
  date: string;
  label: string;
  temperatureMax: number;
  temperatureMin: number;
  rainProbability: number;
  windSpeed: number;
  weatherCode: number;
};

type WeatherState = {
  currentTemp: number;
  currentHumidity: number;
  currentWind: number;
  days: WeatherDay[];
  source: "Open-Meteo" | "Fallback";
};

type OpenMeteoResponse = {
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    wind_speed_10m?: number;
  };
  daily?: {
    time?: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
    wind_speed_10m_max?: number[];
    weather_code?: number[];
  };
};

const regionKeys = Object.keys(regions) as RegionKey[];

export default function WeatherPage() {
  const [selectedRegion, setSelectedRegion] = useState<RegionKey>("toshkent");
  const [selectedDay, setSelectedDay] = useState(0);
  const [weather, setWeather] = useState<WeatherState | null>(null);
  const [error, setError] = useState("");
  const [isRegionMenuOpen, setIsRegionMenuOpen] = useState(false);
  const regionPickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadWeather() {
      setError("");

      try {
        const data = await fetchWeather(selectedRegion);

        if (!cancelled) {
          setWeather(data);
          setSelectedDay(0);
        }
      } catch {
        if (!cancelled) {
          setWeather(buildFallbackWeather(selectedRegion));
          setSelectedDay(0);
          setError("Live weather vaqtincha olinmadi. Fallback ma'lumot ko'rsatildi.");
        }
      }
    }

    void loadWeather();

    return () => {
      cancelled = true;
    };
  }, [selectedRegion]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!regionPickerRef.current?.contains(event.target as Node)) {
        setIsRegionMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsRegionMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const activeDay = weather?.days[selectedDay] ?? null;
  const summary = useMemo(() => describeWeather(activeDay?.weatherCode ?? 1), [activeDay?.weatherCode]);
  const region = regions[selectedRegion];

  return (
    <main className="dashboard-shell">
      <section className="app-frame">
        <Sidebar />

        <section className={styles.page}>
          <div className={`${styles.hero} ${isRegionMenuOpen ? styles.heroMenuOpen : ""}`}>
            <div className={styles.heroGlow} aria-hidden="true" />
            <div className={styles.heroStorm} aria-hidden="true" />

            <div className={styles.leftPane}>
              <div className={styles.topline}>
                <div>
                  <p className={styles.eyebrow}>AgroSmart Weather</p>
                  <h1 className={styles.title}>{summary.title}</h1>
                  <p className={styles.description}>
                    {region.name} hududi uchun kunlik ob-havo ko&apos;rsatkichi. Harorat, shamol va yog&apos;ingarchilik
                    ehtimolini bir joyda kuzatishingiz mumkin.
                  </p>
                </div>

                <div
                  ref={regionPickerRef}
                  className={`${styles.regionPicker} ${isRegionMenuOpen ? styles.regionPickerOpen : ""}`}
                >
                  <span>Hudud</span>
                  <button
                    type="button"
                    className={styles.regionButton}
                    aria-expanded={isRegionMenuOpen}
                    aria-haspopup="listbox"
                    onClick={() => setIsRegionMenuOpen((current) => !current)}
                  >
                    <strong>{regions[selectedRegion].name}</strong>
                    <span className={`${styles.regionChevron} ${isRegionMenuOpen ? styles.regionChevronOpen : ""}`}>
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </span>
                  </button>

                  {isRegionMenuOpen ? (
                    <div className={styles.regionMenu} role="listbox" aria-label="Hududlar ro'yxati">
                      {regionKeys.map((key) => (
                        <button
                          key={key}
                          type="button"
                          className={`${styles.regionOption} ${selectedRegion === key ? styles.regionOptionActive : ""}`}
                          onClick={() => {
                            setSelectedRegion(key);
                            setIsRegionMenuOpen(false);
                          }}
                        >
                          {regions[key].name}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className={styles.metricRow}>
                <article className={styles.primaryTempCard}>
                  <small>{region.name}</small>
                  <strong>{weather ? `${Math.round(weather.currentTemp)}°C` : "..."}</strong>
                  <div className={styles.metricMeta}>
                    <span>Namlik {weather ? `${weather.currentHumidity}%` : "..."}</span>
                    <span>Shamol {weather ? `${Math.round(weather.currentWind)} km/h` : "..."}</span>
                    <span>{weather?.source ?? "..."}</span>
                  </div>
                </article>

                <article className={styles.quickInfoCard}>
                  <small>Bugungi ko&apos;rinish</small>
                  <strong>{summary.short}</strong>
                  <p>{summary.detail}</p>
                </article>
              </div>

              <div className={styles.dayStrip} aria-label="Kunlik forecast">
                {weather?.days.map((day, index) => {
                  const mood = describeWeather(day.weatherCode);

                  return (
                    <button
                      key={day.date}
                      type="button"
                      className={`${styles.dayPill} ${index === selectedDay ? styles.dayPillActive : ""}`}
                      onClick={() => setSelectedDay(index)}
                    >
                      <span>{day.label}</span>
                      <strong>{Math.round(day.temperatureMax)}°</strong>
                      <small>{mood.icon}</small>
                    </button>
                  );
                })}
              </div>

              <div className={styles.insightPanel}>
                <div className={styles.insightHeader}>
                  <span>7 kunlik signal</span>
                  <strong>{weather ? buildWeeklySignal(weather.days) : "Tahlil qilinmoqda"}</strong>
                </div>
                <div className={styles.insightGrid}>
                  <article className={styles.insightCard}>
                    <small>Eng issiq kun</small>
                    <strong>{weather ? getHottestDay(weather.days).label : "..."}</strong>
                    <p>{weather ? `${Math.round(getHottestDay(weather.days).temperatureMax)}°C gacha ko'tariladi` : "..."}</p>
                  </article>
                  <article className={styles.insightCard}>
                    <small>Yomg&apos;ir riski</small>
                    <strong>{weather ? getRainiestDay(weather.days).label : "..."}</strong>
                    <p>{weather ? `${Math.round(getRainiestDay(weather.days).rainProbability)}% ehtimol` : "..."}</p>
                  </article>
                  <article className={styles.insightCard}>
                    <small>Ish rejimi</small>
                    <strong>{weather ? buildWorkMode(weather.days) : "..."}</strong>
                    <p>{weather ? buildWorkModeDetail(weather.days) : "..."}</p>
                  </article>
                </div>
              </div>
            </div>

            <aside className={styles.rightPane}>
              <article className={styles.focusCard}>
                <div className={styles.focusHead}>
                  <span className={styles.focusDot} />
                  <p>{region.name}</p>
                </div>
                <div className={styles.focusTemp}>
                  <strong>{activeDay ? `${Math.round(activeDay.temperatureMax)}°C` : "..."}</strong>
                  <span>{summary.icon}</span>
                </div>
                <div className={styles.focusStats}>
                  <span>Yomg&apos;ir {activeDay ? `${Math.round(activeDay.rainProbability)}%` : "..."}</span>
                  <span>Min {activeDay ? `${Math.round(activeDay.temperatureMin)}°C` : "..."}</span>
                  <span>Shamol {activeDay ? `${Math.round(activeDay.windSpeed)} km/h` : "..."}</span>
                </div>
              </article>

              <div className={styles.sideList}>
                {weather?.days.slice(1, 4).map((day) => {
                  const mood = describeWeather(day.weatherCode);

                  return (
                    <article key={day.date} className={styles.sideCard}>
                      <div>
                        <small>{day.label}</small>
                        <strong>{mood.short}</strong>
                        <p>{Math.round(day.rainProbability)}% yomg&apos;ir ehtimoli</p>
                      </div>
                      <div className={styles.sideTemp}>
                        <span>{mood.icon}</span>
                        <strong>{Math.round(day.temperatureMax)}°</strong>
                      </div>
                    </article>
                  );
                })}
              </div>
            </aside>
          </div>

          {error ? <p className={styles.error}>{error}</p> : null}
        </section>
      </section>
    </main>
  );
}

function getHottestDay(days: WeatherDay[]) {
  return days.reduce((warmest, day) => (day.temperatureMax > warmest.temperatureMax ? day : warmest), days[0]);
}

function getRainiestDay(days: WeatherDay[]) {
  return days.reduce((wettest, day) => (day.rainProbability > wettest.rainProbability ? day : wettest), days[0]);
}

function buildWeeklySignal(days: WeatherDay[]) {
  const hottest = getHottestDay(days);
  const rainiest = getRainiestDay(days);

  if (rainiest.rainProbability >= 55) {
    return `${rainiest.label} kuni namlik kuchayadi`;
  }

  if (hottest.temperatureMax >= 32) {
    return `${hottest.label} kuni issiq to'lqin bor`;
  }

  return "Hafta nisbatan barqaror";
}

function buildWorkMode(days: WeatherDay[]) {
  const rainiest = getRainiestDay(days);
  const hottest = getHottestDay(days);

  if (rainiest.rainProbability >= 55) {
    return "Ehtiyot reja";
  }

  if (hottest.temperatureMax >= 32) {
    return "Ertalab ishlang";
  }

  return "Qulay hafta";
}

function buildWorkModeDetail(days: WeatherDay[]) {
  const rainiest = getRainiestDay(days);
  const hottest = getHottestDay(days);

  if (rainiest.rainProbability >= 55) {
    return "Nam kun oldidan ochiq dala ishlarini tezlashtiring.";
  }

  if (hottest.temperatureMax >= 32) {
    return "Suv va dala ishlarini salqin vaqtga suring.";
  }

  return "Asosiy dala ishlari uchun ob-havo yomon emas.";
}

async function fetchWeather(regionKey: RegionKey): Promise<WeatherState> {
  const region = regions[regionKey];
  const url = new URL("https://api.open-meteo.com/v1/forecast");

  url.searchParams.set("latitude", String(region.lat));
  url.searchParams.set("longitude", String(region.lon));
  url.searchParams.set("timezone", "Asia/Tashkent");
  url.searchParams.set("forecast_days", "7");
  url.searchParams.set("current", "temperature_2m,relative_humidity_2m,wind_speed_10m");
  url.searchParams.set(
    "daily",
    "temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,weather_code"
  );

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Weather API failed with ${response.status}`);
  }

  const data = (await response.json()) as OpenMeteoResponse;
  const days = data.daily?.time?.map((date, index) => ({
    date,
    label: formatDayLabel(date, index),
    temperatureMax: data.daily?.temperature_2m_max?.[index] ?? 0,
    temperatureMin: data.daily?.temperature_2m_min?.[index] ?? 0,
    rainProbability: data.daily?.precipitation_probability_max?.[index] ?? 0,
    windSpeed: data.daily?.wind_speed_10m_max?.[index] ?? 0,
    weatherCode: data.daily?.weather_code?.[index] ?? 1
  }));

  if (!days?.length || typeof data.current?.temperature_2m !== "number") {
    throw new Error("Weather data incomplete");
  }

  return {
    currentTemp: data.current.temperature_2m,
    currentHumidity: data.current.relative_humidity_2m ?? 40,
    currentWind: data.current.wind_speed_10m ?? 12,
    days,
    source: "Open-Meteo"
  };
}

function buildFallbackWeather(regionKey: RegionKey): WeatherState {
  const base = regionKey === "buxoro" || regionKey === "navoiy" ? 31 : 24;
  const today = new Date();

  return {
    currentTemp: base,
    currentHumidity: 42,
    currentWind: 14,
    source: "Fallback",
    days: Array.from({ length: 7 }, (_, index) => {
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + index);
      const rainProbability = [18, 24, 36, 42, 29, 21, 17][index] ?? 20;
      const weatherCode = rainProbability > 35 ? 61 : rainProbability > 22 ? 3 : 1;

      return {
        date: nextDate.toISOString(),
        label: formatDayLabel(nextDate.toISOString(), index),
        temperatureMax: base + (index % 3),
        temperatureMin: base - 7 + (index % 2),
        rainProbability,
        windSpeed: 10 + index,
        weatherCode
      };
    })
  };
}

function formatDayLabel(date: string, index: number) {
  if (index === 0) return "Bugun";

  return new Intl.DateTimeFormat("uz-UZ", { weekday: "long" }).format(new Date(date));
}

function describeWeather(code: number) {
  if ([95, 96, 99].includes(code)) {
    return {
      title: "Bo'ron va kuchli yomg'ir",
      short: "Kuchli yomg'ir",
      detail: "Shamol kuchli bo'lishi mumkin. Ochiq dala ishlarini ehtiyotkor rejalang.",
      icon: "⛈"
    };
  }

  if ([61, 63, 65, 80, 81, 82].includes(code)) {
    return {
      title: "Yomg'irli kun kutilmoqda",
      short: "Yomg'ir",
      detail: "Namlik oshadi. Sug'orish rejimini qayta ko'rib chiqing.",
      icon: "🌧"
    };
  }

  if ([51, 53, 55, 56, 57].includes(code)) {
    return {
      title: "Mayin nam havo",
      short: "Mayin yog'in",
      detail: "Havo nam. Tuproq ustki qatlami uzoqroq vaqt nam qoladi.",
      icon: "🌦"
    };
  }

  if ([2, 3, 45, 48].includes(code)) {
    return {
      title: "Bulutli, ammo barqaror",
      short: "Bulutli",
      detail: "Quyosh kamroq ko'rinadi, lekin ishlarni davom ettirish mumkin.",
      icon: "☁"
    };
  }

  return {
    title: "Ochiq va yorug' ob-havo",
    short: "Quyoshli",
    detail: "Harorat nisbatan qulay. Daladagi kundalik ishlar uchun yaxshi kun.",
    icon: "☀"
  };
}
