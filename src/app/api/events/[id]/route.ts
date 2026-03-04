import { NextResponse, NextRequest } from "next/server";

const GAMMA_URL = "https://gamma-api.polymarket.com";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const res = await fetch(`${GAMMA_URL}/events/${id}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: `Gamma HTTP ${res.status}` },
      { status: res.status }
    );
  }

  const json = await res.json();
  return NextResponse.json(json);
}
