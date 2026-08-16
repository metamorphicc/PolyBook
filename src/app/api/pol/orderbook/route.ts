// app/api/pol/orderbook/route.ts
import { NextRequest, NextResponse } from "next/server";
import type { Asset, Timeframe } from "@/app/lib/polymarket/time";
import {
  currentServerTime,
  fastMarketSlugCandidates,
  resolveFastMarket,
} from "@/app/lib/polymarket/fastMarket";

const ORDERBOOK_URL = "https://clob.polymarket.com/book";
const VALID_ASSETS = new Set<Asset>(["BTC", "ETH", "SOL", "XRP"]);
const VALID_TIMEFRAMES = new Set<Timeframe>(["5m", "15m", "1h"]);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const asset = searchParams.get("asset") as Asset | null;
    const timeframe = searchParams.get("timeframe") as Timeframe | null;
    const outcomeParam = searchParams.get("outcome")?.toLowerCase();

    if (!asset || !timeframe) {
      return NextResponse.json(
        { error: "asset and timeframe are required" },
        { status: 400 },
      );
    }

    if (!VALID_ASSETS.has(asset) || !VALID_TIMEFRAMES.has(timeframe)) {
      return NextResponse.json(
        { error: "unsupported asset or timeframe" },
        { status: 400 },
      );
    }

    const serverTs = await currentServerTime();
    const market = await resolveFastMarket(asset, timeframe, serverTs);

    if (!market) {
      return NextResponse.json(
        {
          error: "Fast market not found",
          triedSlugs: fastMarketSlugCandidates(asset, timeframe, serverTs),
          serverTs,
        },
        { status: 404 },
      );
    }

    const outcomeIndex = outcomeParam === "down" ? 1 : 0;
    const tokenId = market.tokenIds[outcomeIndex] ?? market.tokenId;
    const outcome = market.outcomes[outcomeIndex] ?? (outcomeIndex ? "Down" : "Up");

    const url = `${ORDERBOOK_URL}?token_id=${encodeURIComponent(
      String(tokenId),
    )}`;

    const obRes = await fetch(url, { cache: "no-store" });

    if (!obRes.ok) {
      const text = await obRes.text();
      return NextResponse.json(
        {
          error: "Failed to fetch orderbook from Polymarket",
          status: obRes.status,
          body: text,
          slug: market.slug,
          tokenId,
        },
        { status: 502 },
      );
    }

    const ob = await obRes.json();

    return NextResponse.json(
      {
        slug: market.slug,
        marketId: market.marketId,
        conditionId: market.conditionId,
        tokenId,
        tokenIds: market.tokenIds,
        outcomes: market.outcomes,
        outcome,
        bids: ob.bids ?? [],
        asks: ob.asks ?? [],
        tickSize: ob.tick_size,
        minOrderSize: ob.min_order_size,
        timestamp: ob.timestamp,
        // Countdown inputs: when this window resolves, and the clock that time is
        // measured against so the client can tick locally between polls.
        endTs: market.endTs,
        serverTs,
      },
      { status: 200 },
    );
  } catch (e: unknown) {
    console.error("[/api/pol/orderbook] error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
