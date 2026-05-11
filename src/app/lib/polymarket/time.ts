const SERVER_TIME_URL = "https://clob.polymarket.com/time";

export type Timeframe = "5m" | "15m" | "1h";
export type Asset = "BTC" | "ETH" | "SOL" | "XRP";

const SHORT_ASSET_SLUG: Record<Asset, string> = {
  BTC: "btc",
  ETH: "eth",
  SOL: "sol",
  XRP: "xrp",
};

const HOURLY_ASSET_SLUG: Record<Asset, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  XRP: "xrp",
};

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
  if (tf === "1h") {
    return makeHourlyUpdownSlug(asset, ts);
  }

  return `${SHORT_ASSET_SLUG[asset]}-updown-${tf}-${ts}`;
}

export function makeUpdownSlugCandidates(
  asset: Asset,
  tf: Timeframe,
  ts: number,
): string[] {
  const step = timeframeToStepSeconds(tf);
  return [ts, ts - step].map((candidateTs) =>
    makeUpdownSlug(asset, tf, candidateTs),
  );
}

function makeHourlyUpdownSlug(asset: Asset, ts: number): string {
  const dateParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    hour12: true,
  }).formatToParts(new Date(ts * 1000));

  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    dateParts.find((part) => part.type === type)?.value ?? "";

  const month = getPart("month").toLowerCase();
  const day = getPart("day");
  const year = getPart("year");
  const hour = getPart("hour");
  const period = getPart("dayPeriod").toLowerCase();

  return `${HOURLY_ASSET_SLUG[asset]}-up-or-down-${month}-${day}-${year}-${hour}${period}-et`;
}
