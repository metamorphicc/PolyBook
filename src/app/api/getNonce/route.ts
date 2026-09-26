import crypto from "crypto";
import { getPool } from "../db";
import { NextResponse } from "next/server";
import { isAddress } from "@/app/lib/auth/session";
import { NONCE_TTL_SECONDS } from "@/app/lib/auth/nonce";
import { rejectOutsideTradingMode } from "@/app/lib/tradingGuard";
import { getTradingPublicConfig } from "@/app/lib/appMode";
import { ethers } from "ethers";
import { SiweMessage } from "siwe";

export async function POST(req: Request) {
  const unavailable = rejectOutsideTradingMode();
  if (unavailable) return unavailable;

  try {
    const pool = getPool();
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

    const appUrl = new URL(getTradingPublicConfig().appUrl);
    const issuedAt = new Date();
    const expirationTime = new Date(
      issuedAt.getTime() + NONCE_TTL_SECONDS * 1000,
    );
    const message = new SiweMessage({
      domain: appUrl.host,
      address: ethers.utils.getAddress(address),
      statement: "Sign in to PolyBook trading.",
      uri: appUrl.origin,
      version: "1",
      chainId: 137,
      nonce,
      issuedAt: issuedAt.toISOString(),
      expirationTime: expirationTime.toISOString(),
    }).prepareMessage();

    return NextResponse.json({ nonce, message });
  } catch (error) {
    console.error("getNonce error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
