"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/record", label: "Record", icon: "●" },
  { href: "/journal", label: "Journal", icon: "☰" },
  { href: "/character", label: "Companion", icon: "✦" },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-stone-200 bg-[var(--background)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-stone-800">
      <ul className="mx-auto flex max-w-md">
        {TABS.map((t) => {
          const active = path.startsWith(t.href);
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                className={`flex flex-col items-center gap-0.5 py-3 text-xs ${active ? "text-amber-600" : "text-stone-500"}`}
              >
                <span className="text-lg leading-none">{t.icon}</span>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
