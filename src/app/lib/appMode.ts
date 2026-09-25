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

function requirePublicEnv(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`Missing required environment variable in trading mode: ${name}`);
  }

  return value;
}

export function getTradingPublicConfig() {
  if (!isTradingMode()) {
    throw new Error("Wallet configuration is unavailable in portfolio mode.");
  }

  const appUrl = requirePublicEnv(
    "NEXT_PUBLIC_APP_URL",
    process.env.NEXT_PUBLIC_APP_URL,
  );

  try {
    new URL(appUrl);
  } catch {
    throw new Error("NEXT_PUBLIC_APP_URL must be an absolute URL in trading mode.");
  }

  return {
    appUrl,
    reownProjectId: requirePublicEnv(
      "NEXT_PUBLIC_REOWN_PROJECT_ID",
      process.env.NEXT_PUBLIC_REOWN_PROJECT_ID,
    ),
  };
}
