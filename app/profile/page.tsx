"use client";

import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateEmail as updateFirebaseEmail,
  updatePassword as updateFirebasePassword,
  updateProfile as updateFirebaseProfile
} from "firebase/auth";
import { useEffect, useMemo, useRef, useState } from "react";

import { Sidebar } from "@/app/components/sidebar";
import { firebaseAuth } from "@/lib/firebase-client";
import { regions, soils, type RegionKey, type SoilKey } from "@/lib/agro-data";
import { syncFirebaseSession } from "@/lib/firebase-client-auth";
import type { FarmProfile } from "@/lib/auth";

import styles from "./profile.module.css";

type ProfileUser = {
  id: string;
  name: string;
  email: string;
  provider: "credentials" | "google";
  createdAt?: string;
  farmProfile?: FarmProfile;
};

type ProfileTab = "personal" | "farm" | "field" | "security";

const defaultFarmProfile: FarmProfile = {
  phone: "",
  farmName: "",
  region: "toshkent",
  district: "",
  village: "",
  landSize: "",
  activity: "Dehqonchilik",
  experience: "O'rta",
  soilType: "boz",
  mainCrops: "Bug'doy, Paxta, Pomidor",
  irrigationType: "Ariq orqali",
  waterSource: "Kanal",
  salinity: "Past",
  defaultRegion: "toshkent",
  defaultSoil: "boz",
  season: "bahor",
  language: "O'zbek",
  weatherAlerts: true,
  irrigationReminders: true
};

const regionKeys = Object.keys(regions) as RegionKey[];
const soilKeys = Object.keys(soils) as SoilKey[];
const activityOptions = ["Dehqonchilik", "Bog'dorchilik", "Chorvachilik", "Aralash xo'jalik"];
const experienceOptions = ["Yangi", "O'rta", "Tajribali"];
const irrigationOptions = ["Ariq orqali", "Tomchilatib", "Yomg'irlatib", "Nasos orqali"];
const waterSourceOptions = ["Kanal", "Quduq", "Nasos", "Yomg'ir suvi"];
const salinityOptions = ["Past", "O'rtacha", "Yuqori"];
const seasonOptions = ["bahor", "yoz", "kuz", "qish"];
const languageOptions = ["O'zbek", "Rus", "Ingliz"];
const profileTabs: { id: ProfileTab; label: string }[] = [
  { id: "personal", label: "Shaxsiy" },
  { id: "farm", label: "Xo'jalik" },
  { id: "field", label: "Dala" },
  { id: "security", label: "Xavfsizlik" }
];

function getFarmProfileStorageKey(userId: string) {
  return `agrosmart_farm_profile:${userId}`;
}

function loadStoredFarmProfile(userId: string) {
  if (typeof window === "undefined") {
    return defaultFarmProfile;
  }

  try {
    const raw = window.localStorage.getItem(getFarmProfileStorageKey(userId));

    if (!raw) {
      return defaultFarmProfile;
    }

    return { ...defaultFarmProfile, ...(JSON.parse(raw) as Partial<FarmProfile>) };
  } catch {
    return defaultFarmProfile;
  }
}

function saveFarmProfile(userId: string, farmProfile: FarmProfile) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getFarmProfileStorageKey(userId), JSON.stringify(farmProfile));
}

export default function ProfilePage() {
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profileName, setProfileName] = useState("");
  const [farmProfile, setFarmProfile] = useState<FarmProfile>(defaultFarmProfile);
  const [profileState, setProfileState] = useState({ loading: false, error: "", success: "" });
  const [activeTab, setActiveTab] = useState<ProfileTab>("personal");
  const [nextEmail, setNextEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailState, setEmailState] = useState({ loading: false, error: "", success: "" });
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [passwordState, setPasswordState] = useState({ loading: false, error: "", success: "" });

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      setError("");

      try {
        let response = await fetch("/api/auth/me", { cache: "no-store" });
        let data = (await response.json()) as { user?: ProfileUser | null };

        if ((!response.ok || !data.user) && firebaseAuth.currentUser) {
          const syncedUser = await syncFirebaseSession(firebaseAuth.currentUser);
          response = await fetch("/api/auth/me", { cache: "no-store" });
          data = (await response.json()) as { user?: ProfileUser | null };

          if (!data.user) {
            data = { user: syncedUser };
          }
        }

        if (!response.ok || !data.user) {
          throw new Error("Profile ma'lumoti olinmadi.");
        }

        if (!cancelled) {
          const nextFarmProfile = loadStoredFarmProfile(data.user.id);
          setUser(data.user);
          setProfileName(data.user.name);
          setFarmProfile(nextFarmProfile);
          setNextEmail(data.user.email);
        }
      } catch (profileError) {
        if (!cancelled) {
          setError(profileError instanceof Error ? profileError.message : "Profile yuklanmadi.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  const providerLabel = useMemo(() => {
    if (!user) return "...";
    return user.provider === "google" ? "Google orqali" : "Email va parol";
  }, [user]);

  const initials = useMemo(() => {
    if (!user?.name) return "A";
    return user.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }, [user]);

  const joinedLabel = useMemo(() => {
    if (!user?.createdAt) return "Yangi account";
    return new Intl.DateTimeFormat("uz-UZ", { day: "2-digit", month: "short", year: "numeric" }).format(
      new Date(user.createdAt)
    );
  }, [user]);

  const isCredentialsUser = user?.provider === "credentials";
  const regionName = regions[(farmProfile.region || "toshkent") as RegionKey]?.name ?? farmProfile.region;
  const soilName = soils[(farmProfile.soilType || "boz") as SoilKey]?.name ?? farmProfile.soilType;

  function updateFarmField<Key extends keyof FarmProfile>(key: Key, value: FarmProfile[Key]) {
    setFarmProfile((current) => ({ ...current, [key]: value }));
  }

  async function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileState({ loading: true, error: "", success: "" });

    try {
      const currentUser = firebaseAuth.currentUser;

      if (!currentUser) {
        throw new Error("Aktiv session topilmadi.");
      }

      await updateFirebaseProfile(currentUser, { displayName: profileName.trim() });
      const nextUser = await syncFirebaseSession(currentUser);
      saveFarmProfile(nextUser.id, farmProfile);

      setUser({ ...nextUser, farmProfile });
      setProfileName(nextUser.name);
      setFarmProfile(farmProfile);
      setProfileState({ loading: false, error: "", success: "Profil ma'lumotlari saqlandi." });
    } catch (submitError) {
      setProfileState({
        loading: false,
        error: submitError instanceof Error ? submitError.message : "Profil saqlanmadi.",
        success: ""
      });
    }
  }

  async function handleEmailSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailState({ loading: true, error: "", success: "" });

    try {
      const currentUser = firebaseAuth.currentUser;

      if (!currentUser?.email) {
        throw new Error("Aktiv credentials session topilmadi.");
      }

      const credential = EmailAuthProvider.credential(currentUser.email, emailPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updateFirebaseEmail(currentUser, nextEmail.trim());

      const nextUser = await syncFirebaseSession(currentUser);

      setUser((current) => (current ? { ...current, ...nextUser, farmProfile } : { ...nextUser, farmProfile }));
      setNextEmail(nextUser.email);
      setEmailPassword("");
      setEmailState({ loading: false, error: "", success: "Email yangilandi." });
    } catch (submitError) {
      setEmailState({
        loading: false,
        error: submitError instanceof Error ? submitError.message : "Email yangilanmadi.",
        success: ""
      });
    }
  }

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordState({ loading: true, error: "", success: "" });

    try {
      const currentUser = firebaseAuth.currentUser;

      if (!currentUser?.email) {
        throw new Error("Aktiv credentials session topilmadi.");
      }

      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updateFirebasePassword(currentUser, nextPassword);

      setCurrentPassword("");
      setNextPassword("");
      setPasswordState({ loading: false, error: "", success: "Parol yangilandi." });
    } catch (submitError) {
      setPasswordState({
        loading: false,
        error: submitError instanceof Error ? submitError.message : "Parol yangilanmadi.",
        success: ""
      });
    }
  }

  return (
    <main className="dashboard-shell">
      <section className="app-frame">
        <Sidebar />

        <section className={styles.page}>
          <section className={styles.profileHeader}>
            <div className={styles.avatar}>{initials}</div>
            <div className={styles.profileMain}>
              <p>AgroSmart Profile</p>
              <h1>{loading ? "Yuklanmoqda..." : user?.name ?? "Account topilmadi"}</h1>
              <span>{loading ? "Ma'lumot olinmoqda." : `${regionName} / ${soilName}`}</span>
            </div>
            <div className={styles.profileStatus}>
              <span>{loading ? "..." : "Faol"}</span>
              <small>{providerLabel}</small>
            </div>
          </section>

          <section className={styles.heroGrid}>
            <article className={styles.leadCard}>
              <small>Fermer xo&apos;jaligi</small>
              <strong>{farmProfile.farmName || "Xo'jalik nomi kiritilmagan"}</strong>
              <p>
                {farmProfile.landSize
                  ? `${farmProfile.landSize} yer maydoni, ${farmProfile.activity.toLowerCase()} yo'nalishi.`
                  : "Yer maydoni va xo'jalik yo'nalishini profilga kiriting."}
              </p>
              <div className={styles.badgeRow}>
                <span>{regionName}</span>
                <span>{soilName}</span>
                <span>{farmProfile.irrigationType}</span>
              </div>
            </article>

            <article className={styles.quickCard}>
              <small>Account</small>
              <strong>{user?.email ?? "..."}</strong>
              <p>{providerLabel} / {joinedLabel}</p>
            </article>

            <article className={styles.quickCard}>
              <small>Tavsiya sozlamasi</small>
              <strong>{regions[farmProfile.defaultRegion as RegionKey]?.name ?? "Toshkent"}</strong>
              <p>{soils[farmProfile.defaultSoil as SoilKey]?.name ?? "Bo'z tuproq"} asosida tavsiya olinadi.</p>
            </article>
          </section>

          <section className={styles.settingsShell}>
            <nav className={styles.tabBar} aria-label="Profile bo'limlari">
              {profileTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={activeTab === tab.id ? styles.activeTab : ""}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            {activeTab !== "security" ? (
              <form className={styles.profileForm} onSubmit={handleProfileSubmit}>
                {activeTab === "personal" ? (
                  <article className={styles.panel}>
                    <div className={styles.sectionHead}>
                      <div>
                        <p>Shaxsiy ma&apos;lumotlar</p>
                        <h2>Account egasi</h2>
                      </div>
                    </div>

                    <div className={styles.formGrid}>
                      <TextField label="Ism familiya" value={profileName} onChange={setProfileName} />
                      <TextField label="Telefon raqam" value={farmProfile.phone} onChange={(value) => updateFarmField("phone", value)} />
                      <TextField label="Email" value={user?.email ?? ""} disabled onChange={() => undefined} />
                      <TextField label="Account turi" value={providerLabel} disabled onChange={() => undefined} />
                    </div>
                  </article>
                ) : null}

                {activeTab === "farm" ? (
                  <article className={styles.panel}>
                    <div className={styles.sectionHead}>
                      <div>
                        <p>Fermer xo&apos;jaligi</p>
                        <h2>Joylashuv va maydon</h2>
                      </div>
                    </div>

                    <div className={styles.formGrid}>
                      <TextField label="Xo'jalik nomi" value={farmProfile.farmName} onChange={(value) => updateFarmField("farmName", value)} />
                      <SelectField
                        label="Viloyat"
                        value={farmProfile.region}
                        options={regionKeys.map((key) => ({ value: key, label: regions[key].name }))}
                        onChange={(value) => updateFarmField("region", value)}
                      />
                      <TextField label="Tuman" value={farmProfile.district} onChange={(value) => updateFarmField("district", value)} />
                      <TextField label="Qishloq" value={farmProfile.village} onChange={(value) => updateFarmField("village", value)} />
                      <TextField label="Yer maydoni" value={farmProfile.landSize} placeholder="Masalan: 5 gektar" onChange={(value) => updateFarmField("landSize", value)} />
                      <SelectField label="Faoliyat" value={farmProfile.activity} options={activityOptions} onChange={(value) => updateFarmField("activity", value)} />
                      <SelectField label="Tajriba" value={farmProfile.experience} options={experienceOptions} onChange={(value) => updateFarmField("experience", value)} />
                    </div>
                  </article>
                ) : null}

                {activeTab === "field" ? (
                  <>
                    <article className={styles.panel}>
                      <div className={styles.sectionHead}>
                        <div>
                          <p>Dala parametrlari</p>
                          <h2>Ekin va sug&apos;orish</h2>
                        </div>
                      </div>

                      <div className={styles.formGrid}>
                        <SelectField
                          label="Tuproq turi"
                          value={farmProfile.soilType}
                          options={soilKeys.map((key) => ({ value: key, label: soils[key].name }))}
                          onChange={(value) => updateFarmField("soilType", value)}
                        />
                        <TextField label="Asosiy ekinlar" value={farmProfile.mainCrops} onChange={(value) => updateFarmField("mainCrops", value)} />
                        <SelectField label="Sug'orish turi" value={farmProfile.irrigationType} options={irrigationOptions} onChange={(value) => updateFarmField("irrigationType", value)} />
                        <SelectField label="Suv manbasi" value={farmProfile.waterSource} options={waterSourceOptions} onChange={(value) => updateFarmField("waterSource", value)} />
                        <SelectField label="Sho'rlanish" value={farmProfile.salinity} options={salinityOptions} onChange={(value) => updateFarmField("salinity", value)} />
                      </div>
                    </article>

                    <article className={styles.panel}>
                      <div className={styles.sectionHead}>
                        <div>
                          <p>Tavsiya sozlamalari</p>
                          <h2>AI va eslatmalar</h2>
                        </div>
                      </div>

                      <div className={styles.formGrid}>
                        <SelectField
                          label="Default hudud"
                          value={farmProfile.defaultRegion}
                          options={regionKeys.map((key) => ({ value: key, label: regions[key].name }))}
                          onChange={(value) => updateFarmField("defaultRegion", value)}
                        />
                        <SelectField
                          label="Default tuproq"
                          value={farmProfile.defaultSoil}
                          options={soilKeys.map((key) => ({ value: key, label: soils[key].name }))}
                          onChange={(value) => updateFarmField("defaultSoil", value)}
                        />
                        <SelectField label="Ekin mavsumi" value={farmProfile.season} options={seasonOptions} onChange={(value) => updateFarmField("season", value)} />
                        <SelectField label="Til" value={farmProfile.language} options={languageOptions} onChange={(value) => updateFarmField("language", value)} />
                      </div>

                      <div className={styles.toggleGrid}>
                        <ToggleField
                          label="Ob-havo ogohlantirishlari"
                          checked={farmProfile.weatherAlerts}
                          onChange={(value) => updateFarmField("weatherAlerts", value)}
                        />
                        <ToggleField
                          label="Sug'orish eslatmalari"
                          checked={farmProfile.irrigationReminders}
                          onChange={(value) => updateFarmField("irrigationReminders", value)}
                        />
                      </div>
                    </article>
                  </>
                ) : null}

                {profileState.error ? <p className={styles.formError}>{profileState.error}</p> : null}
                {profileState.success ? <p className={styles.formSuccess}>{profileState.success}</p> : null}
                {error ? <p className={styles.error}>{error}</p> : null}

                <div className={styles.formActions}>
                  <button type="submit" className={styles.primaryButton} disabled={profileState.loading || loading}>
                    {profileState.loading ? "Saqlanmoqda..." : "Saqlash"}
                  </button>
                </div>
              </form>
            ) : (
              <section className={styles.securityGrid}>
                <SecurityEmailCard
                  isCredentialsUser={isCredentialsUser}
                  nextEmail={nextEmail}
                  emailPassword={emailPassword}
                  emailState={emailState}
                  onNextEmailChange={setNextEmail}
                  onEmailPasswordChange={setEmailPassword}
                  onSubmit={handleEmailSubmit}
                />
                <SecurityPasswordCard
                  isCredentialsUser={isCredentialsUser}
                  currentPassword={currentPassword}
                  nextPassword={nextPassword}
                  passwordState={passwordState}
                  onCurrentPasswordChange={setCurrentPassword}
                  onNextPasswordChange={setNextPassword}
                  onSubmit={handlePasswordSubmit}
                />
              </section>
            )}
          </section>

        </section>
      </section>
    </main>
  );
}

function TextField({
  label,
  value,
  placeholder,
  disabled,
  onChange
}: {
  label: string;
  value: string;
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
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

function ToggleField({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className={styles.toggleField}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function SecurityEmailCard({
  isCredentialsUser,
  nextEmail,
  emailPassword,
  emailState,
  onNextEmailChange,
  onEmailPasswordChange,
  onSubmit
}: {
  isCredentialsUser: boolean;
  nextEmail: string;
  emailPassword: string;
  emailState: { loading: boolean; error: string; success: string };
  onNextEmailChange: (value: string) => void;
  onEmailPasswordChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <article className={styles.securityCard}>
      <div className={styles.sectionHead}>
        <div>
          <p>Xavfsizlik</p>
          <h2>Emailni o&apos;zgartirish</h2>
        </div>
      </div>

      {isCredentialsUser ? (
        <form className={styles.settingsForm} onSubmit={onSubmit}>
          <TextField label="Yangi email" value={nextEmail} onChange={onNextEmailChange} />
          <label className={styles.field}>
            <span>Joriy parol</span>
            <input
              type="password"
              value={emailPassword}
              onChange={(event) => onEmailPasswordChange(event.target.value)}
              placeholder="Joriy parol"
            />
          </label>
          {emailState.error ? <p className={styles.formError}>{emailState.error}</p> : null}
          {emailState.success ? <p className={styles.formSuccess}>{emailState.success}</p> : null}
          <button type="submit" className={styles.primaryButton} disabled={emailState.loading}>
            {emailState.loading ? "Saqlanmoqda..." : "Emailni saqlash"}
          </button>
        </form>
      ) : (
        <div className={styles.lockedCard}>
          <strong>Google account</strong>
          <p>Email Google orqali boshqariladi. Uni shu sahifada o&apos;zgartirib bo&apos;lmaydi.</p>
        </div>
      )}
    </article>
  );
}

function SecurityPasswordCard({
  isCredentialsUser,
  currentPassword,
  nextPassword,
  passwordState,
  onCurrentPasswordChange,
  onNextPasswordChange,
  onSubmit
}: {
  isCredentialsUser: boolean;
  currentPassword: string;
  nextPassword: string;
  passwordState: { loading: boolean; error: string; success: string };
  onCurrentPasswordChange: (value: string) => void;
  onNextPasswordChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <article className={styles.securityCard}>
      <div className={styles.sectionHead}>
        <div>
          <p>Xavfsizlik</p>
          <h2>Parolni yangilash</h2>
        </div>
      </div>

      {isCredentialsUser ? (
        <form className={styles.settingsForm} onSubmit={onSubmit}>
          <label className={styles.field}>
            <span>Joriy parol</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => onCurrentPasswordChange(event.target.value)}
              placeholder="Joriy parol"
            />
          </label>
          <label className={styles.field}>
            <span>Yangi parol</span>
            <input
              type="password"
              value={nextPassword}
              onChange={(event) => onNextPasswordChange(event.target.value)}
              placeholder="Kamida 6 ta belgi"
            />
          </label>
          {passwordState.error ? <p className={styles.formError}>{passwordState.error}</p> : null}
          {passwordState.success ? <p className={styles.formSuccess}>{passwordState.success}</p> : null}
          <button type="submit" className={styles.primaryButton} disabled={passwordState.loading}>
            {passwordState.loading ? "Yangilanmoqda..." : "Parolni saqlash"}
          </button>
        </form>
      ) : (
        <div className={styles.lockedCard}>
          <strong>Google account</strong>
          <p>Parol Google tomonidan boshqariladi. Bu yerda alohida parol yo&apos;q.</p>
        </div>
      )}
    </article>
  );
}
