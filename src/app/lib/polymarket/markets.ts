const MARKETS_URL = "https://gamma-api.polymarket.com/markets"; 

export type PolymarketMarket = {
  id: string;
  question?: string;
  slug?: string;
  conditionId?: string;
  outcomes?: string[] | string;
  clobTokenIds?: string[] | string;
  tokenId?: string;
  // Gamma returns the resolution time under one of these; used for the
  // terminal countdown. Field naming varies by market, so read both.
  endDate?: string;
  endDateIso?: string;
};

/**
 * Resolution time of a market as a unix timestamp in seconds, or null when the
 * upstream payload has no usable date.
 */
export function marketEndTimestamp(
  market: Pick<PolymarketMarket, "endDate" | "endDateIso">,
): number | null {
  for (const value of [market.endDate, market.endDateIso]) {
    if (!value) continue;

    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return Math.floor(parsed / 1000);
  }

  return null;
}

export async function getMarketBySlug(slug: string) {
  const url = `${MARKETS_URL}?slug=${encodeURIComponent(slug)}&limit=1`;
  const res = await fetch(url);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Failed to fetch market by slug (${res.status}): ${text}`,
    );
  }

  const data = await res.json();

  const market: PolymarketMarket | undefined = Array.isArray(data)
    ? data[0]
    : data.markets?.[0];

  if (!market) {
    throw new Error(`Market not found for slug: ${slug}`);
  }

  const clobTokenIds = parseStringArray(market.clobTokenIds);
  const outcomes = parseStringArray(market.outcomes);
  const tokenId = market.tokenId ?? clobTokenIds[0];

  if (!tokenId) {
    throw new Error(`No tokenId in market for slug: ${slug}`);
  }

  return {
    marketId: market.id,
    conditionId: market.conditionId,
    tokenId,
    tokenIds: clobTokenIds,
    outcomes,
    market,
  };
}

function parseStringArray(value: string[] | string | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}
