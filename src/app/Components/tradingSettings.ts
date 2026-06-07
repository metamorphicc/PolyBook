export type FastAsset = "BTC" | "ETH" | "SOL" | "XRP";
export type FastTimeframe = "5m" | "15m" | "1h";

export type TradingSettings = {
  defaultOrderSize: string;
  maxOrderSize: string;
  maxPositionSize: string;
  maxSpreadPercent: string;
  minBookLiquidity: string;
  quickSizes: string[];
  postOnly: boolean;
  requireConfirm: boolean;
  oneClickTrading: boolean;
  autoCloseOnMarketEnd: boolean;
  allowedAssets: Record<FastAsset, boolean>;
  allowedTimeframes: Record<FastTimeframe, boolean>;
};

export const TRADING_SETTINGS_KEY = "polybook_trading_settings";

export const DEFAULT_TRADING_SETTINGS: TradingSettings = {
  defaultOrderSize: "5",
  maxOrderSize: "50",
  maxPositionSize: "150",
  maxSpreadPercent: "4",
  minBookLiquidity: "25",
  quickSizes: ["2", "5", "10", "25"],
  postOnly: false,
  requireConfirm: false,
  oneClickTrading: true,
  autoCloseOnMarketEnd: true,
  allowedAssets: {
    BTC: true,
    ETH: true,
    SOL: true,
    XRP: true,
  },
  allowedTimeframes: {
    "5m": true,
    "15m": true,
    "1h": true,
  },
};

const ASSETS: FastAsset[] = ["BTC", "ETH", "SOL", "XRP"];
const TIMEFRAMES: FastTimeframe[] = ["5m", "15m", "1h"];

function normalizeString(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function normalizeBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeEnabledMap<T extends string>(
  keys: T[],
  value: unknown,
  fallback: Record<T, boolean>,
) {
  const input =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return keys.reduce(
    (acc, key) => {
      acc[key] = normalizeBoolean(input[key], fallback[key]);
      return acc;
    },
    {} as Record<T, boolean>,
  );
}

export function sanitizeTradingSettings(value: unknown): TradingSettings {
  const input =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const quickSizes = Array.isArray(input.quickSizes)
    ? input.quickSizes.slice(0, 4).map((item) => String(item))
    : DEFAULT_TRADING_SETTINGS.quickSizes;

  return {
    defaultOrderSize: normalizeString(
      input.defaultOrderSize,
      DEFAULT_TRADING_SETTINGS.defaultOrderSize,
    ),
    maxOrderSize: normalizeString(
      input.maxOrderSize,
      DEFAULT_TRADING_SETTINGS.maxOrderSize,
    ),
    maxPositionSize: normalizeString(
      input.maxPositionSize,
      DEFAULT_TRADING_SETTINGS.maxPositionSize,
    ),
    maxSpreadPercent: normalizeString(
      input.maxSpreadPercent,
      DEFAULT_TRADING_SETTINGS.maxSpreadPercent,
    ),
    minBookLiquidity: normalizeString(
      input.minBookLiquidity,
      DEFAULT_TRADING_SETTINGS.minBookLiquidity,
    ),
    quickSizes: [...quickSizes, ...DEFAULT_TRADING_SETTINGS.quickSizes].slice(
      0,
      4,
    ),
    postOnly: normalizeBoolean(
      input.postOnly,
      DEFAULT_TRADING_SETTINGS.postOnly,
    ),
    requireConfirm: normalizeBoolean(
      input.requireConfirm,
      DEFAULT_TRADING_SETTINGS.requireConfirm,
    ),
    oneClickTrading: normalizeBoolean(
      input.oneClickTrading,
      DEFAULT_TRADING_SETTINGS.oneClickTrading,
    ),
    autoCloseOnMarketEnd: normalizeBoolean(
      input.autoCloseOnMarketEnd,
      DEFAULT_TRADING_SETTINGS.autoCloseOnMarketEnd,
    ),
    allowedAssets: normalizeEnabledMap(
      ASSETS,
      input.allowedAssets,
      DEFAULT_TRADING_SETTINGS.allowedAssets,
    ),
    allowedTimeframes: normalizeEnabledMap(
      TIMEFRAMES,
      input.allowedTimeframes,
      DEFAULT_TRADING_SETTINGS.allowedTimeframes,
    ),
  };
}

export function readTradingSettings() {
  if (typeof window === "undefined") return DEFAULT_TRADING_SETTINGS;

  try {
    const stored = window.localStorage.getItem(TRADING_SETTINGS_KEY);
    return sanitizeTradingSettings(stored ? JSON.parse(stored) : null);
  } catch {
    return DEFAULT_TRADING_SETTINGS;
  }
}

export function writeTradingSettings(settings: TradingSettings) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    TRADING_SETTINGS_KEY,
    JSON.stringify(sanitizeTradingSettings(settings)),
  );
  window.dispatchEvent(new Event("polybook:trading-settings-updated"));
}
