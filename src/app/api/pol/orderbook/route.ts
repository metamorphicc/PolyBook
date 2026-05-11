// app/api/pol/orderbook/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  getPolymarketServerTime,
  alignTimestampToWindow,
  makeUpdownSlug,
  type Asset,
  type Timeframe,
} from "@/app/lib/polymarket/time";
import { getMarketBySlug } from "@/app/lib/polymarket/markets";

const ORDERBOOK_URL = "https://clob.polymarket.com/market-data/orderbook";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const asset = searchParams.get("asset") as Asset | null;
    const timeframe = searchParams.get("timeframe") as Timeframe | null;

    if (!asset || !timeframe) {
      return NextResponse.json(
        { error: "asset and timeframe are required" },
        { status: 400 },
      );
    }

    const serverTs = await getPolymarketServerTime();

    const alignedTs = alignTimestampToWindow(serverTs, timeframe);

    const slug = makeUpdownSlug(asset, timeframe, alignedTs);

    const { tokenId } = await getMarketBySlug(slug);

    const url = `${ORDERBOOK_URL}?tokenId=${encodeURIComponent(
      String(tokenId),
    )}`;

    const obRes = await fetch(url);

    if (!obRes.ok) {
      const text = await obRes.text();
      return NextResponse.json(
        {
          error: "Failed to fetch orderbook from Polymarket",
          status: obRes.status,
          body: text,
          slug,
          tokenId,
        },
        { status: 502 },
      );
    }

    const ob = await obRes.json();

    return NextResponse.json(
      {
        slug,
        tokenId,
        bids: ob.bids ?? [],
        asks: ob.asks ?? [],
      },
      { status: 200 },
    );
  } catch (e: any) {
    console.error("[/api/pol/orderbook] error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 },
    );
  }
}