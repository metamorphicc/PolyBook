const MARKETS_URL = "https://gamma-api.polymarket.com/markets"; 

export type PolymarketMarket = {
  id: string;
  slug?: string;
  outcomes?: Array<{
    tokenId?: string;
  }>;
  tokenId?: string;
};

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

  const tokenId =
    market.tokenId ?? market.outcomes?.[0]?.tokenId;

  if (!tokenId) {
    throw new Error(`No tokenId in market for slug: ${slug}`);
  }

  return {
    marketId: market.id,
    tokenId,
    market,
  };
}