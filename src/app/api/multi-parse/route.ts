import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const asset = (searchParams.get("asset") || "btc").toLowerCase();

  if (!["btc", "eth", "sol", "xrp"].includes(asset)) {
    return NextResponse.json(
      { error: "Unsupported asset" },
      { status: 400 },
    );
  }

  const epoch = getCurrent15mEpoch();
  const slug = `${asset}-updown-15m-${epoch}`;
  const url = `https://gamma-api.polymarket.com/events/slug/${slug}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    return NextResponse.json(
      { error: `Gamma HTTP ${res.status}` },
      { status: res.status },
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}

function getCurrent15mEpoch() {
  const nowSec = Math.floor(Date.now() / 1000);
  const interval = 15 * 60;
  return Math.floor(nowSec / interval) * interval;
}