// app/api/pol/rail/route.ts
import { NextResponse } from "next/server";
import type { Asset, Timeframe } from "@/app/lib/polymarket/time";
import {
  currentServerTime,
  resolveFastMarket,
} from "@/app/lib/polymarket/fastMarket";

const MIDPOINTS_URL = "https://clob.polymarket.com/midpoints";
const ASSETS: Asset[] = ["BTC", "ETH", "SOL", "XRP"];
const TIMEFRAMES: Timeframe[] = ["5m", "15m", "1h"];

type RailRow = {
  asset: Asset;
  timeframe: Timeframe;
  slug: string;
  conditionId: string;
  upTokenId: string;
  downTokenId: string;
  /** Midpoint of the Up outcome, 0..1, or null when the book is empty. */
  upMid: number | null;
  endTs: number;
};

/**
 * Feeds the terminal's market rail: every asset/timeframe pair with its current
 * Up midpoint and resolution time.
 *
 * Market resolution is cached per window by `resolveFastMarket`, and all 12
 * midpoints come back in one batched /midpoints call, so a rail tick is a single
 * upstream request once the windows are warm.
 */
export async function GET() {
  try {
    const serverTs = await currentServerTime();

    const resolved = await Promise.all(
      ASSETS.flatMap((asset) =>
        TIMEFRAMES.map(async (timeframe) => {
          const market = await resolveFastMarket(asset, timeframe, serverTs);
          if (!market) return null;

          return {
            asset,
            timeframe,
            slug: market.slug,
            conditionId: market.conditionId,
            upTokenId: market.tokenIds[0] ?? market.tokenId,
            downTokenId: market.tokenIds[1] ?? "",
            endTs: market.endTs,
          };
        }),
      ),
    );

    const markets = resolved.filter((row): row is NonNullable<typeof row> =>
      Boolean(row?.upTokenId),
    );

    const midpoints = await fetchMidpoints(
      markets.map((market) => market.upTokenId),
    );

    const rows: RailRow[] = markets.map((market) => ({
      ...market,
      upMid: midpoints.get(market.upTokenId) ?? null,
    }));

    return NextResponse.json({ serverTs, markets: rows });
  } catch (e: unknown) {
    console.error("[/api/pol/rail] error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}

async function fetchMidpoints(tokenIds: string[]) {
  const result = new Map<string, number>();
  if (tokenIds.length === 0) return result;

  try {
    const res = await fetch(MIDPOINTS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tokenIds.map((tokenId) => ({ token_id: tokenId }))),
      cache: "no-store",
    });

    if (!res.ok) return result;

    // Shape is { [tokenId]: "0.53" }; a token with no book is simply absent.
    const data = (await res.json()) as Record<string, unknown>;

    for (const [tokenId, value] of Object.entries(data ?? {})) {
      const mid = Number(value);
      if (Number.isFinite(mid)) result.set(tokenId, mid);
    }
  } catch (e) {
    console.warn("[/api/pol/rail] midpoints failed:", e);
  }

  return result;
}
