const SERVER_TIME_URL = "https://clob.polymarket.com/time";

export type Timeframe = "5m" | "15m" | "1h";
export type Asset = "BTC" | "ETH" | "SOL" | "XRP";

export async function getPolymarketServerTime(): Promise<number> {
  const res = await fetch(SERVER_TIME_URL);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Failed to get server time (${res.status}): ${text}`,
    );
  }

  const text = await res.text().then((t) => t.trim());
  const ts = Number(text);

  if (!Number.isFinite(ts)) {
    throw new Error(`Invalid server time value: "${text}"`);
  }

  return ts > 1e12 ? Math.floor(ts / 1000) : ts;
}

export function timeframeToStepSeconds(tf: Timeframe): number {
  switch (tf) {
    case "5m":
      return 300;
    case "15m":
      return 900;
    case "1h":
      return 3600;
  }
}

export function alignTimestampToWindow(
  serverTsSec: number,
  tf: Timeframe,
): number {
  const step = timeframeToStepSeconds(tf);
  return Math.floor(serverTsSec / step) * step;
}

export function makeUpdownSlug(
  asset: Asset,
  tf: Timeframe,
  ts: number,
): string {
  const base = asset.toLowerCase();
  const tfPart = tf.toLowerCase();
  return `${base}-updown-${tfPart}-${ts}`;
}