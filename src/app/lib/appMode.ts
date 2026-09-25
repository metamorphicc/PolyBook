export const APP_MODES = ["portfolio", "trading"] as const;

export type AppMode = (typeof APP_MODES)[number];

export function getAppMode(): AppMode {
  const value = process.env.NEXT_PUBLIC_APP_MODE ?? "portfolio";

  if (value === "portfolio" || value === "trading") return value;

  throw new Error(
    `Invalid NEXT_PUBLIC_APP_MODE: ${value}. Expected "portfolio" or "trading".`,
  );
}

export function isTradingMode(mode = getAppMode()) {
  return mode === "trading";
}
