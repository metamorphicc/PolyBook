import { NextResponse } from "next/server";

export async function GET() {
  const resp = await fetch(
    "https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=5&order=volume&ascending=false",
    { next: { revalidate: 60 } }
  );
  const data = await resp.json();
  return NextResponse.json(data);
}
