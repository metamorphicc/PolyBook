import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { order, headers } = body;

    if (!order || !headers) {
      return NextResponse.json(
        { error: "order and headers are required" },
        { status: 400 },
      );
    }

    const res = await fetch("https://clob.polymarket.com/order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        POLY_ADDRESS: headers.POLY_ADDRESS,
        POLY_SIGNATURE: headers.POLY_SIGNATURE,
        POLY_TIMESTAMP: headers.POLY_TIMESTAMP,
        POLY_NONCE: headers.POLY_NONCE,
      },
      body: JSON.stringify(order),
    });

    const text = await res.text();

    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[/api/order] error", e);
    return NextResponse.json(
      { error: "Internal error", details: String(e?.message ?? e) },
      { status: 500 },
    );
  }
}