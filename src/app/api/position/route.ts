import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const user = searchParams.get("user");

  if (!user) {
    return NextResponse.json(
      { error: "user query param is required" },
      { status: 400 }
    );
  }

  const url = `https://gamma-api.polymarket.com/positions?user=${user}`;

  try {
    console.log("[positions] fetching:", url);
    const res = await fetch(url, { cache: "no-store" });
    console.log("[positions] upstream status:", res.status);
    const text = await res.text();

    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[positions] upstream error:", e);
    return NextResponse.json(
      { error: "Failed to fetch from Polymarket" },
      { status: 500 }
    );
  }
}
