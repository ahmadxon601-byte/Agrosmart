"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Sidebar } from "@/app/components/sidebar";
import { crops, regions, soils, type RegionKey, type SoilKey } from "@/lib/agro-data";

import styles from "./fields.module.css";

type FieldProfile = {
  id: string;
  name: string;
  region: RegionKey;
  district: string;
  area: string;
  soil: SoilKey;
  soilConfidence: number;
  soilReason: string;
  soilMode: "ai" | "fallback" | "manual";
  crop: string;
  irrigation: string;
  waterSource: string;
  salinity: string;
  slope: string;
  lastWatered: string;
  note: string;
};

const storageKey = "agrosmart-fields";
const regionKeys = Object.keys(regions) as RegionKey[];
const cropKeys = Object.keys(crops);
const irrigationOptions = ["Ariq orqali", "Tomchilatib", "Yomg'irlatib", "Nasos orqali"];
const waterSourceOptions = ["Kanal", "Quduq", "Nasos", "Yomg'ir suvi"];
const salinityOptions = ["Past", "O'rtacha", "Yuqori"];
const slopeOptions = ["Tekis", "Yengil qiya", "Qiya"];

const defaultField: FieldProfile = {
  id: "field-1",
  name: "Asosiy dala",
  region: "toshkent",
  district: "",
  area: "5 gektar",
  soil: "boz",
  soilConfidence: 0,
  soilReason: "Tuproq rasmi yuklansa, AI taxminiy turini aniqlaydi.",
  soilMode: "manual",
  crop: "bugdoy",
  irrigation: "Ariq orqali",
  waterSource: "Kanal",
  salinity: "Past",
  slope: "Tekis",
  lastWatered: "",
  note: ""
};

export default function FieldsPage() {
  const [fields, setFields] = useState<FieldProfile[]>([defaultField]);
  const [activeId, setActiveId] = useState(defaultField.id);
  const [soilDetectState, setSoilDetectState] = useState({ loading: false, error: "" });
  const activeField = fields.find((field) => field.id === activeId) ?? fields[0];

  useEffect(() => {
    const rawFields = window.localStorage.getItem(storageKey);

    if (!rawFields) return;

    window.setTimeout(() => {
      try {
        const parsedFields = JSON.parse(rawFields) as FieldProfile[];

        if (Array.isArray(parsedFields) && parsedFields.length > 0) {
          setFields(parsedFields);
          setActiveId(parsedFields[0].id);
        }
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }, 0);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(fields));
  }, [fields]);

  const analysisItems = useMemo(() => buildAnalysisItems(activeField), [activeField]);
  const readiness = useMemo(() => {
    const filled = [
      activeField.name,
      activeField.region,
      activeField.area,
      activeField.soil,
      activeField.crop,
      activeField.irrigation,
      activeField.waterSource
    ].filter(Boolean).length;

    return Math.round((filled / 7) * 100);
  }, [activeField]);

  function updateActiveField<Key extends keyof FieldProfile>(key: Key, value: FieldProfile[Key]) {
    setFields((currentFields) =>
      currentFields.map((field) => (field.id === activeField.id ? { ...field, [key]: value } : field))
    );
  }

  function addField() {
    const nextField: FieldProfile = {
      ...defaultField,
      id: `field-${Date.now()}`,
      name: `Dala ${fields.length + 1}`,
      district: "",
      area: "",
      lastWatered: "",
      note: ""
    };

    setFields((currentFields) => [...currentFields, nextField]);
    setActiveId(nextField.id);
  }

  function removeActiveField() {
    if (fields.length === 1) return;

    const nextFields = fields.filter((field) => field.id !== activeField.id);
    setFields(nextFields);
    setActiveId(nextFields[0].id);
  }

  async function handleSoilImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setSoilDetectState({ loading: true, error: "" });

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/soil-detect", {
        method: "POST",
        body: formData
      });
      const data = (await response.json()) as {
        soil?: SoilKey;
        confidence?: number;
        reason?: string;
        mode?: "ai" | "fallback";
        error?: string;
      };

      if (!response.ok || !data.soil) {
        throw new Error(data.error || "Tuproq aniqlanmadi.");
      }

      const detectedSoil = data.soil;

      setFields((currentFields) =>
        currentFields.map((field) =>
          field.id === activeField.id
            ? {
                ...field,
                soil: detectedSoil,
                soilConfidence: data.confidence ?? 0,
                soilReason: data.reason ?? "Rasm asosida taxminiy baho berildi.",
                soilMode: data.mode ?? "fallback"
              }
            : field
        )
      );
      setSoilDetectState({ loading: false, error: "" });
    } catch (error) {
      setSoilDetectState({
        loading: false,
        error: error instanceof Error ? error.message : "Tuproq aniqlanmadi."
      });
    }
  }

  return (
    <main className="dashboard-shell">
      <section className="app-frame">
        <Sidebar />

        <section className={styles.page}>
          <section className={styles.hero}>
            <div>
              <p className={styles.kicker}>AI analiz uchun ma&apos;lumot</p>
              <h1>Dalalar profili</h1>
              <p className={styles.description}>
                Hudud, tuproq, ekin va sug&apos;orish ma&apos;lumotlarini shu yerda tartiblang. AI tavsiya shu parametrlar
                asosida aniqroq ishlaydi.
              </p>
            </div>

            <article className={styles.readinessCard}>
              <small>Tayyorlik</small>
              <strong>{readiness}%</strong>
              <span>AI analizga {readiness >= 85 ? "tayyor" : "ma'lumot kerak"}</span>
            </article>
          </section>

          <section className={styles.layout}>
            <aside className={styles.fieldList}>
              <div className={styles.listHead}>
                <div>
                  <p>Dalalar</p>
                  <h2>{fields.length} ta profil</h2>
                </div>
                <button type="button" onClick={addField} aria-label="Dala qo'shish">
                  +
                </button>
              </div>

              <div className={styles.fieldCards}>
                {fields.map((field) => (
                  <button
                    key={field.id}
                    type="button"
                    className={field.id === activeField.id ? styles.activeFieldCard : styles.fieldCard}
                    onClick={() => setActiveId(field.id)}
                  >
                    <strong>{field.name || "Nomsiz dala"}</strong>
                    <span>{regions[field.region].name}</span>
                    <small>
                      {field.area || "Maydon kiritilmagan"} / {soils[field.soil].name}
                    </small>
                  </button>
                ))}
              </div>
            </aside>

            <section className={styles.editor}>
              <article className={styles.panel}>
                <div className={styles.sectionHead}>
                  <div>
                    <p>Dala ma&apos;lumotlari</p>
                    <h2>{activeField.name || "Yangi dala"}</h2>
                  </div>
                  <button
                    type="button"
                    className={styles.dangerButton}
                    disabled={fields.length === 1}
                    onClick={removeActiveField}
                  >
                    O&apos;chirish
                  </button>
                </div>

                <div className={styles.formGrid}>
                  <TextField label="Dala nomi" value={activeField.name} onChange={(value) => updateActiveField("name", value)} />
                  <SelectField
                    label="Viloyat"
                    value={activeField.region}
                    options={regionKeys.map((key) => ({ value: key, label: regions[key].name }))}
                    onChange={(value) => updateActiveField("region", value as RegionKey)}
                  />
                  <TextField label="Tuman / hudud" value={activeField.district} onChange={(value) => updateActiveField("district", value)} />
                  <TextField label="Maydon" value={activeField.area} placeholder="Masalan: 5 gektar" onChange={(value) => updateActiveField("area", value)} />
                  <SelectField
                    label="Asosiy ekin"
                    value={activeField.crop}
                    options={cropKeys.map((key) => ({ value: key, label: crops[key].name }))}
                    onChange={(value) => updateActiveField("crop", value)}
                  />
                  <SelectField label="Sug'orish turi" value={activeField.irrigation} options={irrigationOptions} onChange={(value) => updateActiveField("irrigation", value)} />
                  <SelectField label="Suv manbasi" value={activeField.waterSource} options={waterSourceOptions} onChange={(value) => updateActiveField("waterSource", value)} />
                  <SelectField label="Sho'rlanish" value={activeField.salinity} options={salinityOptions} onChange={(value) => updateActiveField("salinity", value)} />
                  <SelectField label="Yer holati" value={activeField.slope} options={slopeOptions} onChange={(value) => updateActiveField("slope", value)} />
                  <TextField label="Oxirgi sug'orish" value={activeField.lastWatered} placeholder="Masalan: 3 kun oldin" onChange={(value) => updateActiveField("lastWatered", value)} />
                  <TextField label="Eslatma" value={activeField.note} placeholder="Kasallik, namlik yoki ish rejasi" onChange={(value) => updateActiveField("note", value)} />
                </div>
              </article>

              <article className={styles.soilPanel}>
                <div className={styles.soilCopy}>
                  <p>Tuproq AI aniqlash</p>
                  <h2>{soils[activeField.soil].name}</h2>
                  <span>
                    {activeField.soilConfidence
                      ? `${activeField.soilConfidence}% ishonch / ${activeField.soilMode === "ai" ? "AI" : "Fallback"}`
                      : "Rasm yuklanmagan"}
                  </span>
                </div>

                <div className={styles.soilResult}>
                  <p>{activeField.soilReason}</p>
                  {soilDetectState.error ? <strong>{soilDetectState.error}</strong> : null}
                </div>

                <label className={styles.uploadButton}>
                  {soilDetectState.loading ? "Aniqlanmoqda..." : "Tuproq rasmini yuklash"}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={soilDetectState.loading}
                    onChange={(event) => void handleSoilImageUpload(event)}
                  />
                </label>
              </article>

              <section className={styles.analysisGrid}>
                <article className={styles.aiCard}>
                  <small>AI ishlatadigan kontekst</small>
                  <strong>{crops[activeField.crop]?.name ?? "Ekin tanlanmagan"}</strong>
                  <p>
                    {regions[activeField.region].name} hududi, {soils[activeField.soil].name.toLowerCase()} va{" "}
                    {activeField.irrigation.toLowerCase()} ma&apos;lumotlari tavsiya uchun asos bo&apos;ladi.
                  </p>
                </article>

                <div className={styles.analysisList}>
                  {analysisItems.map((item) => (
                    <article key={item.label} className={styles.analysisItem}>
                      <small>{item.label}</small>
                      <strong>{item.value}</strong>
                      <p>{item.detail}</p>
                    </article>
                  ))}
                </div>
              </section>
            </section>
          </section>
        </section>
      </section>
    </main>
  );
}

function buildAnalysisItems(field: FieldProfile) {
  return [
    {
      label: "Hudud",
      value: regions[field.region].name,
      detail: regions[field.region].climate
    },
    {
      label: "Tuproq",
      value: soils[field.soil].name,
      detail: soils[field.soil].description
    },
    {
      label: "Ekin",
      value: crops[field.crop]?.name ?? "Tanlanmagan",
      detail: crops[field.crop]?.note ?? "Ekin tanlansa, mavsumiy tavsiya aniqlashadi."
    },
    {
      label: "Suv rejasi",
      value: field.irrigation,
      detail: `${field.waterSource} manbasi va ${field.salinity.toLowerCase()} sho'rlanish holati hisobga olinadi.`
    }
  ];
}

function TextField({
  label,
  value,
  placeholder,
  onChange
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: string[] | { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLLabelElement | null>(null);
  const normalizedOptions = options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option
  );
  const selectedLabel = normalizedOptions.find((option) => option.value === value)?.label ?? value;

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!selectRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  return (
    <label ref={selectRef} className={`${styles.field} ${styles.selectField} ${isOpen ? styles.selectOpen : ""}`}>
      <span>{label}</span>
      <button
        type="button"
        className={styles.selectButton}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        {selectedLabel}
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {isOpen ? (
        <div className={styles.selectMenu} role="listbox">
          {normalizedOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={option.value === value ? styles.selectOptionActive : styles.selectOption}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </label>
  );
}
