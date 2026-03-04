import { NextResponse } from "next/server";
import { getCurrent15mEpoch } from "@/app/share/usefulFunctions";

export async function GET() {
  const num = getCurrent15mEpoch();

  const url = `https://gamma-api.polymarket.com/events/slug/btc-updown-15m-${num}`;
  console.log(num)
  const res = await fetch(url, { cache: "no-store" });
  const page = await res.json();
  console.log(`page; ${JSON.stringify(page)}`);

  return NextResponse.json(page);
}
