import crypto from "crypto";
import { pool } from "../db";
import { NextResponse } from "next/server";
import { isAddress } from "@/app/lib/auth/session";
import { NONCE_TTL_SECONDS } from "@/app/lib/auth/nonce";

export async function POST(req: Request) {
  try {
    const { address } = await req.json();
    if (!isAddress(address)) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();
    const nonce = crypto.randomBytes(16).toString("hex");

    // Bound the table: drop this address's used or expired nonces before
    // issuing a fresh one. A wallet only ever needs its newest unused nonce.
    await pool.query(
      "DELETE FROM login_nonces WHERE address = ? AND (used = 1 OR created_at < (NOW() - INTERVAL ? SECOND))",
      [normalizedAddress, NONCE_TTL_SECONDS],
    );

    await pool.query(
      "INSERT INTO login_nonces (address, nonce, used) VALUES (?, ?, 0)",
      [normalizedAddress, nonce],
    );

    return NextResponse.json({ nonce });
  } catch (error) {
    console.error("getNonce error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
