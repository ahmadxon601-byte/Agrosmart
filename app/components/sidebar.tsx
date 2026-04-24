"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const sidebarItems = [
  {
    href: "/",
    match: "/",
    label: "Umumiy ko'rinish",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="4" width="6" height="6" rx="1.5" />
        <rect x="14" y="4" width="6" height="6" rx="1.5" />
        <rect x="4" y="14" width="6" height="6" rx="1.5" />
        <rect x="14" y="14" width="6" height="6" rx="1.5" />
      </svg>
    )
  },
  {
    href: "/weather",
    match: "/weather",
    label: "Ob-havo",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 16.5h9.5a3.5 3.5 0 0 0 .4-7A5 5 0 0 0 7.3 8.3 4 4 0 0 0 7 16.5Z" />
        <path d="M9 18.5 7.8 21" />
        <path d="M13 18.5 11.8 21" />
        <path d="M17 18.5 15.8 21" />
      </svg>
    )
  },
  {
    href: "/assistant",
    match: "/assistant",
    label: "AI tavsiya",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3.5 5 7.5v5.2c0 4.1 2.5 6.6 7 7.8 4.5-1.2 7-3.7 7-7.8V7.5l-7-4Z" />
        <path d="M9.3 12.2 11 13.9l3.8-3.8" />
      </svg>
    )
  },
  {
    href: "/fields",
    match: "/fields",
    label: "Dalalar",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 18c3.2-2.4 5.8-2.4 9 0 2.4 1.8 4.5 1.8 7 0" />
        <path d="M4 13c3.2-2.4 5.8-2.4 9 0 2.4 1.8 4.5 1.8 7 0" />
        <path d="M4 8c3.2-2.4 5.8-2.4 9 0 2.4 1.8 4.5 1.8 7 0" />
      </svg>
    )
  },
  {
    href: "/plan",
    match: "/plan",
    label: "Reja",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="5" width="16" height="15" rx="3" />
        <path d="M8 3.5v4" />
        <path d="M16 3.5v4" />
        <path d="M7.5 10h9" />
        <path d="M7.5 14h5.5" />
      </svg>
    )
  },
  {
    href: "/summary",
    match: "/summary",
    label: "Xulosa",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3.5c3.9 0 7 3.1 7 7 0 5.2-7 10-7 10s-7-4.8-7-10c0-3.9 3.1-7 7-7Z" />
        <circle cx="12" cy="10.5" r="2.2" />
      </svg>
    )
  },
  {
    href: "/profile",
    match: "/profile",
    label: "Profile",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
      </svg>
    )
  }
] as const;

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [userName, setUserName] = useState("");

  useEffect(() => {
    void fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data: { user?: { name?: string } | null }) => {
        setUserName(data.user?.name ?? "");
      })
      .catch(() => setUserName(""));
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/auth");
    router.refresh();
  }

  return (
    <aside className="sidebar" aria-label="Asosiy bo'limlar">
      <nav className="sidebar-nav">
        {sidebarItems.map((item) => (
          <Link
            key={`${item.label}-${item.href}`}
            className={`sidebar-link ${pathname === item.match ? "active" : ""}`}
            href={item.href}
            aria-label={item.label}
            title={item.label}
          >
            {item.icon}
          </Link>
        ))}
      </nav>

      <div className="sidebar-user">
        {userName ? <small>{userName}</small> : null}
        <button type="button" className="sidebar-footer" onClick={handleLogout} aria-label="Chiqish">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M10 7 5 12l5 5" />
            <path d="M5.5 12H15" />
            <path d="M13 5h3.5A2.5 2.5 0 0 1 19 7.5v9a2.5 2.5 0 0 1-2.5 2.5H13" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
