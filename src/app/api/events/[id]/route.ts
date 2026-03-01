import { NextResponse } from "next/server";

const GAMMA_URL = "https://gamma-api.polymarket.com";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

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
