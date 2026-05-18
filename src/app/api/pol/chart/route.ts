import { NextRequest, NextResponse } from "next/server";
import {
  alignTimestampToWindow,
  getPolymarketServerTime,
  makeUpdownSlugCandidates,
  type Asset,
  type Timeframe,
} from "@/app/lib/polymarket/time";
import { getMarketBySlug } from "@/app/lib/polymarket/markets";

const PRICES_HISTORY_URL = "https://clob.polymarket.com/prices-history";
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
        { status: 400 }
      );
    }

    if (!VALID_ASSETS.has(asset) || !VALID_TIMEFRAMES.has(timeframe)) {
      return NextResponse.json(
        { error: "unsupported asset or timeframe" },
        { status: 400 }
      );
    }

    const serverTs = await getPolymarketServerTime();
    const alignedTs = alignTimestampToWindow(serverTs, timeframe);
    const slugs = makeUpdownSlugCandidates(asset, timeframe, alignedTs);

    let marketResult: Awaited<ReturnType<typeof getMarketBySlug>> | null = null;
    let resolvedSlug = "";

    for (const slug of slugs) {
      try {
        marketResult = await getMarketBySlug(slug);
        resolvedSlug = slug;
        break;
      } catch (e) {
        console.warn("[/api/pol/chart] slug miss:", slug, e);
      }
    }

    if (!marketResult) {
      return NextResponse.json(
        {
          error: "Fast market not found",
          triedSlugs: slugs,
        },
        { status: 404 }
      );
    }

    const outcomeIndex = outcomeParam === "down" ? 1 : 0;
    const tokenId = marketResult.tokenIds[outcomeIndex] ?? marketResult.tokenId;
    const outcome =
      marketResult.outcomes[outcomeIndex] ?? (outcomeIndex ? "Down" : "Up");

    const url = new URL(PRICES_HISTORY_URL);
    url.searchParams.set("market", String(tokenId));
    url.searchParams.set("interval", timeframe === "1h" ? "6h" : "1h");
    url.searchParams.set("fidelity", "1");

    const historyRes = await fetch(url, { cache: "no-store" });

    if (!historyRes.ok) {
      const text = await historyRes.text();
      return NextResponse.json(
        {
          error: "Failed to fetch Polymarket price history",
          status: historyRes.status,
          body: text,
          slug: resolvedSlug,
          tokenId,
        },
        { status: 502 }
      );
    }

    const history = await historyRes.json();

    return NextResponse.json({
      slug: resolvedSlug,
      marketId: marketResult.marketId,
      conditionId: marketResult.conditionId,
      tokenId,
      tokenIds: marketResult.tokenIds,
      outcomes: marketResult.outcomes,
      outcome,
      history: history.history ?? [],
    });
  } catch (e: unknown) {
    console.error("[/api/pol/chart] error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
