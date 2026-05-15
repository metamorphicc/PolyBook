import crypto from "crypto";
import { pool } from "../db";
import { NextResponse } from "next/server";
import { isAddress } from "@/app/lib/auth/session";

export async function POST(req: Request) {
  try {
    const { address } = await req.json();
    if (!isAddress(address)) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();
    const nonce = crypto.randomBytes(16).toString("hex");

    await pool.query(
      "INSERT INTO login_nonces (address, nonce, used) VALUES (?, ?, 0)",
      [normalizedAddress, nonce]
    );

    return NextResponse.json({ nonce });
  } catch (error) {
    console.error("getNonce error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
