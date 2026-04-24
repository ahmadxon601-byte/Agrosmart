"use client";

import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, updateProfile } from "firebase/auth";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { firebaseAuth, googleProvider } from "@/lib/firebase-client";
import { syncFirebaseSession } from "@/lib/firebase-client-auth";

import styles from "./auth.module.css";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const response = await fetch("/api/auth/me");
        const data = (await response.json()) as { user?: unknown };

        if (data.user) {
          if (!cancelled) {
            router.replace("/");
          }
          return;
        }
      } catch {
        // Fall back to Firebase client persistence below.
      }

      if (firebaseAuth.currentUser) {
        await syncFirebaseSession(firebaseAuth.currentUser).catch(() => undefined);
        if (!cancelled) {
          router.replace("/");
        }
      }
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (mode === "login") {
        const credential = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
        await syncFirebaseSession(credential.user);
      } else {
        const credential = await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);
        if (name.trim()) {
          await updateProfile(credential.user, { displayName: name.trim() });
        }
        await syncFirebaseSession(credential.user);
      }

      router.replace("/");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Auth jarayoni bajarilmadi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    setError("");
    setIsSubmitting(true);

    try {
      const credential = await signInWithPopup(firebaseAuth, googleProvider);
      await syncFirebaseSession(credential.user);
      router.replace("/");
      router.refresh();
    } catch (googleError) {
      setError(googleError instanceof Error ? googleError.message : "Google login bajarilmadi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <div className={styles.card}>
          <p className={styles.kicker}>AgroSmart</p>
          <div className={styles.cardHeader}>
            <small>{mode === "login" ? "Xush kelibsiz" : "Yangi account"}</small>
            <strong>{mode === "login" ? "Accountga kiring" : "Ro'yxatdan o'ting"}</strong>
            <p className={styles.lead}>
              {"Dashboard, ob-havo va AI tavsiyalarga kirish uchun ma'lumotlaringizni kiriting."}
            </p>
          </div>

          <div className={styles.switcher}>
            <button
              type="button"
              className={mode === "login" ? styles.switchActive : ""}
              onClick={() => setMode("login")}
            >
              Kirish
            </button>
            <button
              type="button"
              className={mode === "register" ? styles.switchActive : ""}
              onClick={() => setMode("register")}
            >
              {"Ro'yxatdan o'tish"}
            </button>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            {mode === "register" ? (
              <label>
                <span>Ism</span>
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ismingiz" />
              </label>
            ) : null}

            <label>
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email kiriting"
              />
            </label>

            <label>
              <span>Parol</span>
              <div className={styles.passwordField}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Parol kiriting"
                  className={styles.passwordInput}
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M3 3l18 18M10.6 10.7a2 2 0 102.8 2.8M9.9 5.1A10.9 10.9 0 0112 5c5.2 0 8.9 3.7 10 7-0.5 1.5-1.7 3.4-3.5 4.9M6.7 6.7C4.6 8 3.3 10.1 2 12c1.1 3.3 4.8 7 10 7 1.7 0 3.3-.4 4.6-1"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle
                        cx="12"
                        cy="12"
                        r="3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </label>

            {error ? <p className={styles.error}>{error}</p> : null}

            <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
              {isSubmitting ? "Kutilmoqda..." : mode === "login" ? "Kirish" : "Account yaratish"}
            </button>
          </form>

          <div className={styles.divider}>
            <span>yoki</span>
          </div>

          <button type="button" className={styles.primaryButton} onClick={() => void handleGoogleLogin()} disabled={isSubmitting}>
            {isSubmitting ? "Kutilmoqda..." : "Google orqali kirish"}
          </button>
        </div>
      </section>
    </main>
  );
}
