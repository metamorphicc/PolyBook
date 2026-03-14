import { NextResponse } from "next/server";

export async function GET() {
  const resp = await fetch(
    "https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=10",
    { cache: "no-store" }
  );

  const text = await resp.text();

  return new NextResponse(text, {
    status: resp.status,
    headers: { "content-type": "application/json" },
  });
}