import { NextResponse } from "next/server";
import { getPool } from "../db";
import { isAddress, setSessionCookie, signSession } from "@/app/lib/auth/session";
import { NONCE_TTL_SECONDS } from "@/app/lib/auth/nonce";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { rejectOutsideTradingMode } from "@/app/lib/tradingGuard";
import { getTradingPublicConfig } from "@/app/lib/appMode";
import { SiweMessage } from "siwe";

export async function POST(req: Request) {
  const unavailable = rejectOutsideTradingMode();
  if (unavailable) return unavailable;

  try {
    const pool = getPool();
    const { address, message, signature } = await req.json();
    if (
      !isAddress(address) ||
      typeof message !== "string" ||
      message.length > 4096 ||
      typeof signature !== "string" ||
      signature.length > 1024
    ) {
      return NextResponse.json(
        { error: "address, message and signature are required" },
        { status: 400 },
      );
    }

    const addr = address.toLowerCase();
    let siwe: SiweMessage;
    try {
      siwe = new SiweMessage(message);
    } catch {
      return NextResponse.json({ error: "Invalid SIWE message" }, { status: 400 });
    }

    if (siwe.address.toLowerCase() !== addr) {
      return NextResponse.json({ error: "Address mismatch" }, { status: 401 });
    }

    const [rows] = await pool.query<Array<RowDataPacket & { nonce: string }>>(
      "SELECT nonce FROM login_nonces WHERE address = ? AND used = 0 AND created_at >= (NOW() - INTERVAL ? SECOND) ORDER BY id DESC LIMIT 1",
      [addr, NONCE_TTL_SECONDS]
    );

    if (!rows.length) {
      return NextResponse.json({ error: "No valid nonce for this address" }, { status: 400 });
    }

    const expectedNonce = rows[0].nonce;
    const appUrl = new URL(getTradingPublicConfig().appUrl);
    if (
      siwe.uri !== appUrl.origin ||
      siwe.chainId !== 137 ||
      siwe.version !== "1"
    ) {
      return NextResponse.json(
        { error: "SIWE audience or chain mismatch" },
        { status: 401 },
      );
    }

    const verification = await siwe.verify(
      {
        signature,
        domain: appUrl.host,
        nonce: expectedNonce,
        time: new Date().toISOString(),
      },
      { suppressExceptions: true },
    );
    if (!verification.success) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const [consumed] = await pool.query<ResultSetHeader>(
      "UPDATE login_nonces SET used = 1 WHERE address = ? AND nonce = ? AND used = 0 AND created_at >= (NOW() - INTERVAL ? SECOND)",
      [addr, expectedNonce, NONCE_TTL_SECONDS],
    );
    if (consumed.affectedRows !== 1) {
      return NextResponse.json(
        { error: "Nonce was already used or expired" },
        { status: 409 },
      );
    }

    const token = signSession(addr);
    await setSessionCookie(token);

    return NextResponse.json({ ok: true, address: addr });
  } catch (e) {
    console.error("verify error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
