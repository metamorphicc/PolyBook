import { NextResponse } from "next/server";

const CLOB_URL = "https://clob.polymarket.com";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const row = await fetch(
    `${CLOB_URL}/prices-history?market=${id}&interval=1h`,
    {
      next: { revalidate: 60 },
    }
  );

  if (!row.ok) {
    return NextResponse.json(
      { error: `CLOB HTTP ${row.status}` },
      { status: row.status }
    );
  }

  const jsonRow = await row.json();
  return NextResponse.json(jsonRow);
}
