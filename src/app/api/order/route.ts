import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const res = await fetch("https://clob.polymarket.com/order", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "POLY_ADDRESS": body.headers["POLY_ADDRESS"],
      "POLY_SIGNATURE": body.headers["POLY_SIGNATURE"],
      "POLY_TIMESTAMP": body.headers["POLY_TIMESTAMP"],
      "POLY_NONCE": body.headers["POLY_NONCE"],
    },
    body: JSON.stringify(body.order),
  });

  const data = await res.json();
  return NextResponse.json(data);
}