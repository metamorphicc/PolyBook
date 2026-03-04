import { NextResponse } from "next/server";
import { getCurrent1hEpoch } from "@/app/share/usefulFunctions";

export async function GET() {
  const num = getCurrent1hEpoch();

  const url = `https://gamma-api.polymarket.com/events/slug/btc-updown-1h-${num}`;

  const res = await fetch(url, { cache: "no-store" });
  const page = await res.json();
  console.log(`page; ${JSON.stringify(page)}`);

  return NextResponse.json(page);
}
