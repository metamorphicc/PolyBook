"use client";

import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="group flex h-9 w-9 shrink-0 items-center justify-center rounded-full border theme-border bg-[var(--surface-muted)] shadow-sm transition hover:scale-105 active:scale-95"
      aria-label="Toggle color theme"
      title="Toggle theme"
    >
      <span className="relative h-6 w-6 rounded-full bg-[var(--surface)] transition">
        <span
          className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full transition-all duration-300 ${
            isLight
              ? "left-1 bg-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.8)]"
              : "left-1/2 bg-sky-300 shadow-[0_0_18px_rgba(125,211,252,0.7)]"
          }`}
        />
        <span
          className={`absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--surface-muted)] transition-opacity duration-300 ${
            isLight ? "opacity-0" : "opacity-100"
          }`}
        />
      </span>
    </button>
  );
}
