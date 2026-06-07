import { NextRequest, NextResponse } from "next/server";

const COINBASE_PRODUCTS: Record<string, string> = {
  BTCUSDT: "BTC-USD",
  ETHUSDT: "ETH-USD",
  SOLUSDT: "SOL-USD",
  XRPUSDT: "XRP-USD",
};

const BINANCE_TICKER_URL = "https://api.binance.com/api/v3/klines";
const COINBASE_PRODUCT_URL = "https://api.exchange.coinbase.com/products";
const HISTORY_START_SEC = Math.floor(Date.UTC(2025, 0, 1) / 1000);
const GRANULARITY_SEC = 3600;
const COINBASE_MAX_CANDLES = 300;
const MAX_PAGES = 24;

type NormalizedCandle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type CoinbaseCandle = [number, number, number, number, number, number];
type BinanceCandle = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string,
];

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.toUpperCase() ?? "";

  if (!(symbol in COINBASE_PRODUCTS)) {
    return NextResponse.json(
      { error: "unsupported symbol" },
      { status: 400 },
    );
  }

  try {
    const candles = await fetchCoinbaseCandles(symbol);
    if (candles.length) {
      return NextResponse.json(
        { source: "coinbase", candles },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
  } catch (e) {
    console.warn("[/api/crypto/candles] Coinbase failed:", e);
  }

  try {
    const candles = await fetchBinanceCandles(symbol);
    return NextResponse.json(
      { source: "binance", candles },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch candles" },
      { status: 500 },
    );
  }
}

async function fetchCoinbaseCandles(symbol: string) {
  const product = COINBASE_PRODUCTS[symbol];
  const nowSec = Math.floor(Date.now() / 1000);
  const chunkSec = GRANULARITY_SEC * COINBASE_MAX_CANDLES;
  const candles: NormalizedCandle[] = [];

  for (
    let startSec = HISTORY_START_SEC, page = 0;
    startSec < nowSec && page < MAX_PAGES;
    startSec += chunkSec, page += 1
  ) {
    const endSec = Math.min(nowSec, startSec + chunkSec);
    const url = new URL(`${COINBASE_PRODUCT_URL}/${product}/candles`);
    url.searchParams.set("granularity", String(GRANULARITY_SEC));
    url.searchParams.set("start", new Date(startSec * 1000).toISOString());
    url.searchParams.set("end", new Date(endSec * 1000).toISOString());

    const res = await fetch(url, {
      headers: { "User-Agent": "PolyBook" },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Coinbase HTTP ${res.status}: ${await res.text()}`);
    }

    const pageCandles = (await res.json()) as CoinbaseCandle[];
    candles.push(
      ...pageCandles.map(([time, low, high, open, close, volume]) => ({
        time,
        open,
        high,
        low,
        close,
        volume,
      })),
    );
  }

  return dedupeAndSort(candles);
}

async function fetchBinanceCandles(symbol: string) {
  const candles: NormalizedCandle[] = [];
  let startTime = HISTORY_START_SEC * 1000;
  const endTime = Date.now();

  for (let page = 0; page < MAX_PAGES && startTime < endTime; page += 1) {
    const url = new URL(BINANCE_TICKER_URL);
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("interval", "1h");
    url.searchParams.set("limit", "1000");
    url.searchParams.set("startTime", String(startTime));
    url.searchParams.set("endTime", String(endTime));

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Binance HTTP ${res.status}: ${await res.text()}`);

    const pageCandles = (await res.json()) as BinanceCandle[];
    if (!pageCandles.length) break;

    candles.push(
      ...pageCandles.map((candle) => ({
        time: Math.floor(Number(candle[0]) / 1000),
        open: Number(candle[1]),
        high: Number(candle[2]),
        low: Number(candle[3]),
        close: Number(candle[4]),
        volume: Number(candle[5]),
      })),
    );

    startTime = Number(pageCandles[pageCandles.length - 1][0]) + GRANULARITY_SEC * 1000;
    if (pageCandles.length < 1000) break;
  }

  return dedupeAndSort(candles);
}

function dedupeAndSort(candles: NormalizedCandle[]) {
  const byTime = new Map<number, NormalizedCandle>();

  for (const candle of candles) {
    if (
      Number.isFinite(candle.time) &&
      Number.isFinite(candle.open) &&
      Number.isFinite(candle.high) &&
      Number.isFinite(candle.low) &&
      Number.isFinite(candle.close)
    ) {
      byTime.set(candle.time, candle);
    }
  }

  return [...byTime.values()].sort((a, b) => a.time - b.time);
}
