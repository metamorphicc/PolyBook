import { NextResponse } from "next/server";
import { getCurrent5mEpoch } from "@/app/share/usefulFunctions";

export async function GET() {
  const num = getCurrent5mEpoch();

  const url = `https://gamma-api.polymarket.com/events/slug/btc-updown-5m-${num}`;

  const res = await fetch(url, { cache: "no-store" });
  const page = await res.json();
  console.log(`page; ${JSON.stringify(page)}`);

  return NextResponse.json(page);
}
