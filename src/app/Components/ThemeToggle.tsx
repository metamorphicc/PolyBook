"use client";

import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="group fixed right-4 top-28 z-50 flex h-12 w-12 items-center justify-center rounded-full border theme-border bg-[var(--surface)] shadow-xl shadow-black/20 transition hover:scale-105 active:scale-95"
      aria-label="Toggle color theme"
      title="Toggle theme"
    >
      <span className="relative h-7 w-7 rounded-full bg-[var(--surface-muted)] transition">
        <span
          className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full transition-all duration-300 ${
            isLight
              ? "left-1 bg-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.8)]"
              : "left-1/2 bg-sky-300 shadow-[0_0_18px_rgba(125,211,252,0.7)]"
          }`}
        />
        <span
          className={`absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--surface)] transition-opacity duration-300 ${
            isLight ? "opacity-0" : "opacity-100"
          }`}
        />
      </span>
    </button>
  );
}
