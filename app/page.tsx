"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import { Sidebar } from "@/app/components/sidebar";
import { regions, soils, type RegionKey, type SoilKey } from "@/lib/agro-data";
import type { AdviceResult } from "@/lib/advice";

export default function Home() {
  const [region] = useState<RegionKey>("toshkent");
  const [soil] = useState<SoilKey>("boz");
  const [advice, setAdvice] = useState<AdviceResult | null>(null);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  const loadAdvice = useCallback(async (nextRegion: RegionKey, nextSoil: SoilKey) => {
    startTransition(async () => {
      setError("");
      try {
        const response = await fetch("/api/advice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ region: nextRegion, soil: nextSoil })
        });

        if (!response.ok) {
          throw new Error("Tavsiya olishda xatolik yuz berdi.");
        }

        const data = (await response.json()) as AdviceResult;
        setAdvice(data);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Noma'lum xatolik.");
      }
    });
  }, []);

  useEffect(() => {
    void loadAdvice(region, soil);
  }, [region, soil, loadAdvice]);

  const primaryCrop = advice?.crops[0];
  const adviceSourceLabel = advice?.weather.source === "Fallback" ? "Fallback" : "AI";
  const getCropWaterNeed = (cropName: string) => {
    const lower = cropName.toLowerCase();

    if (/paxta|tarvuz|qovun/.test(lower)) return "Yuqori";
    if (/arpa|bug'doy|bugdoy|beda/.test(lower)) return "O'rtacha";
    return "Me'yorida";
  };
  const getCropRisk = (canPlantNow: boolean, cropName: string) => {
    if (!canPlantNow) return "Mavsum";
    if (/shor|arpa/i.test(`${soils[soil].name} ${cropName}`)) return "Past";
    return advice?.weather.rainProbability && advice.weather.rainProbability > 70 ? "Namlik" : "Past";
  };

  return (
    <main className="dashboard-shell">
      <section className="app-frame">
        <Sidebar />

        <section className="dashboard-content">
          <div className="welcome-row" id="overview">
            <div>
              <h1>
                Salom, <span>dehqon</span>
              </h1>
            </div>
          </div>

          <div className="dashboard-grid">
            <section className="field-card" aria-label="Smart agro ko'rinish">
              <div className="decision-panel">
                <div className="decision-top">
                  <p>Smart Tavsiya Paneli</p>
                  <span className={`source-badge ${advice?.weather.source === "Fallback" ? "fallback" : "ai"}`}>
                    {adviceSourceLabel}
                  </span>
                </div>

                <div className="main-advice">
                  <span>Eng yaxshi tanlov</span>
                  <h2>{primaryCrop?.name ?? "Ekin tanlanmoqda"}</h2>
                  <p>
                    {primaryCrop
                      ? `${soils[soil].name} va ${regions[region].name} hududi uchun ${primaryCrop.name} asosiy tavsiya sifatida ko'rsatilmoqda.`
                      : "Hudud va tuproq asosida tavsiya hisoblanmoqda."}
                  </p>
                </div>

                <div className="decision-stats">
                  <article>
                    <small>Hudud</small>
                    <strong>{regions[region].name}</strong>
                  </article>
                  <article>
                    <small>Tuproq</small>
                    <strong>{soils[soil].name}</strong>
                  </article>
                  <article>
                    <small>Mavsum</small>
                    <strong>{advice?.season ?? "..."}</strong>
                  </article>
                </div>

              <div className="action-grid">
                <article className={primaryCrop?.canPlantNow ? "action-card good" : "action-card wait"}>
                  <span>01</span>
                    <h3>Ekish holati</h3>
                    <p>{primaryCrop?.timingText ?? "Mavsum tekshirilmoqda."}</p>
                  </article>
                  <article className={advice?.irrigation.shouldWater ? "action-card hot" : "action-card good"}>
                    <span>02</span>
                    <h3>Sug&apos;orish</h3>
                    <p>{advice?.irrigation.title ?? "Ob-havo tekshirilmoqda."}</p>
                  </article>
                  <article className="action-card neutral">
                    <span>03</span>
                    <h3>Keyingi qadam</h3>
                    <p>{primaryCrop ? `${primaryCrop.window} oralig'ini reja qiling.` : "Tavsiya yuklanmoqda."}</p>
                  </article>
                </div>
              </div>

              {error ? <p className="error">{error}</p> : null}
            </section>

            <section className="insights">
              <div className="mini-grid" id="weather">
                <article className="metric-card">
                  <div className="card-head">
                    <h2>Weather Conditions</h2>
                    <span className="weather-mark" aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        <path d="M7 16.5h9.5a3.5 3.5 0 0 0 .4-7A5 5 0 0 0 7.3 8.3 4 4 0 0 0 7 16.5Z" />
                        <path d="M9 18.5 7.8 21" />
                        <path d="M13 18.5 11.8 21" />
                        <path d="M17 18.5 15.8 21" />
                      </svg>
                    </span>
                  </div>
                  <dl className="weather-list">
                    <div className="weather-item">
                      <span className="weather-icon" aria-hidden="true">
                        <span className="weather-glyph weather-glyph-temp">℃</span>
                      </span>
                      <dt>Temperature</dt>
                      <dd>{advice ? `${Math.round(advice.weather.temperature)} C` : "..."}</dd>
                    </div>
                    <div className="weather-item">
                      <span className="weather-icon" aria-hidden="true">
                        <span className="weather-glyph weather-glyph-humidity">◊</span>
                      </span>
                      <dt>Humidity</dt>
                      <dd>{advice ? `${Math.max(32, 100 - Math.round(advice.weather.rainProbability))}%` : "..."}</dd>
                    </div>
                    <div className="weather-item">
                      <span className="weather-icon" aria-hidden="true">
                        <span className="weather-glyph weather-glyph-rain">☁</span>
                      </span>
                      <dt>Rain Forecast</dt>
                      <dd>{advice ? `${Math.round(advice.weather.rainProbability)}%` : "..."}</dd>
                    </div>
                  </dl>
                </article>

                <article className="metric-card crop-compare-card">
                  <div className="card-head">
                    <h2>Ekin Taqqoslash</h2>
                    <span className={`source-badge ${advice?.weather.source === "Fallback" ? "fallback" : "ai"}`}>
                      {adviceSourceLabel}
                    </span>
                  </div>
                  <div className="compare-list">
                    {advice ? (
                      advice.crops.map((crop) => (
                        <article key={crop.name} className="compare-row">
                          <div>
                            <strong>{crop.name}</strong>
                            <span>{crop.season} / {crop.canPlantNow ? "mos" : "kutish"}</span>
                          </div>
                          <small>Suv: {getCropWaterNeed(crop.name)}</small>
                          <small>Risk: {getCropRisk(crop.canPlantNow, crop.name)}</small>
                        </article>
                      ))
                    ) : (
                      <div className="compare-empty">Ekinlar yuklanmoqda...</div>
                    )}
                  </div>
                </article>
              </div>

              <article className="recommendation" id="recommendation">
                <div>
                  <p>AI Recommendations</p>
                  <h2>{primaryCrop ? `${primaryCrop.name} uchun ekish rejasi` : "Tavsiya yuklanmoqda..."}</h2>
                </div>
                <div className="recommendation-pill">
                  <span>{primaryCrop ? `${primaryCrop.window}` : "Ekin tanlanmoqda"}</span>
                  <strong>{primaryCrop?.canPlantNow ? "Hozir mos" : "Mavsumni kuting"}</strong>
                </div>
              </article>
            </section>
          </div>
        </section>
      </section>
    </main>
  );
}
