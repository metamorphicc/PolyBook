import type { TickSize } from "@polymarket/clob-client-v2";
import type { FastAsset, FastTimeframe } from "../tradingSettings";

export type Asset = FastAsset;
export type Timeframe = FastTimeframe;
export type Outcome = "Up" | "Down";
export type OrderSide = "BUY" | "SELL";

export const ASSETS: Asset[] = ["BTC", "ETH", "SOL", "XRP"];
export const TIMEFRAMES: Timeframe[] = ["5m", "15m", "1h"];

export const TRADINGVIEW_SYMBOLS: Record<Asset, string> = {
  BTC: "BINANCE:BTCUSDT",
  ETH: "BINANCE:ETHUSDT",
  SOL: "BINANCE:SOLUSDT",
  XRP: "BINANCE:XRPUSDT",
};

export type OrderbookLevel = {
  price: number;
  size: number;
};

/** The market the dock is currently pointed at. */
export type MarketSelection = {
  asset: Asset;
  timeframe: Timeframe;
  outcome: Outcome;
};

/**
 * A pending order the user has clicked but not yet sent.
 *
 * `size` means different things per side, matching the CLOB contract:
 * BUY is a dollar notional, SELL is a share count. See `useTradingAccount`.
 */
export type OrderDraft = {
  side: OrderSide;
  outcome: Outcome;
  asset: Asset;
  price: number;
  tokenId: string;
  tickSize: TickSize;
};

export type LivePosition = {
  title: string;
  outcome: string;
  size: number;
  avgPrice: number;
  curPrice: number;
  currentValue: number;
  cashPnl: number;
  realizedPnl: number;
  percentPnl: number;
  /** CLOB token id — how a position is matched to the ladder on screen. */
  asset: string;
  conditionId: string;
  endDate: string;
};

export type LiveOrder = {
  id: string;
  side: string;
  price: number;
  originalSize: number;
  sizeMatched: number;
  outcome: string;
  assetId: string;
  market: string;
};

export type LiveFill = {
  id: string;
  side: string;
  price: number;
  size: number;
  outcome: string;
  matchTime: string;
  status: string;
};

export function getPriceDecimals() {
  // Fast-market prices are probabilities quoted to a tenth of a percent.
  return 3;
}

export function formatBookPrice(price: number) {
  return `${(price * 100).toFixed(1)}%`;
}

export function formatBookSize(size: number, compact = false) {
  if (!Number.isFinite(size) || size <= 0) return "";
  if (compact && size >= 1000) return `${(size / 1000).toFixed(1)}k`;

  return size >= 100 ? size.toFixed(0) : size.toFixed(1);
}

export function formatUsd(value: number) {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

export function formatSignedUsd(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

export function formatCountdown(secondsLeft: number | null) {
  if (secondsLeft === null || !Number.isFinite(secondsLeft)) return "--:--";

  const clamped = Math.max(0, Math.floor(secondsLeft));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function sortBids(levels: OrderbookLevel[]) {
  return [...levels]
    .filter((level) => Number.isFinite(level.price) && level.size > 0)
    .sort((a, b) => b.price - a.price);
}

export function sortAsks(levels: OrderbookLevel[]) {
  return [...levels]
    .filter((level) => Number.isFinite(level.price) && level.size > 0)
    .sort((a, b) => a.price - b.price);
}
