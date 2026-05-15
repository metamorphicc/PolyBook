import { NextResponse } from "next/server";
import { pool } from "../db";
import { ethers } from "ethers";
import { isAddress, setSessionCookie, signSession } from "@/app/lib/auth/session";
import type { RowDataPacket } from "mysql2";

export async function POST(req: Request) {
  try {
    const { address, nonce, signature } = await req.json();
    if (!isAddress(address) || typeof nonce !== "string" || typeof signature !== "string") {
      return NextResponse.json(
        { error: "address, nonce and signature are required" },
        { status: 400 },
      );
    }

    const addr = address.toLowerCase();

    const [rows] = await pool.query<Array<RowDataPacket & { nonce: string }>>(
      "SELECT nonce FROM login_nonces WHERE address = ? AND used = 0 ORDER BY id DESC LIMIT 1",
      [addr]
    );

    if (!rows.length) {
      return NextResponse.json({ error: "No nonce for this address" }, { status: 400 });
    }

    const expectedNonce = rows[0].nonce;
    if (nonce !== expectedNonce) {
      return NextResponse.json({ error: "Invalid nonce" }, { status: 400 });
    }

    const message = `PolyBook login nonce: ${nonce}`;
    const recoveredAddress = ethers.utils.verifyMessage(message, signature).toLowerCase();
    if (recoveredAddress !== addr) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    await pool.query(
      "UPDATE login_nonces SET used = 1 WHERE address = ? AND nonce = ?",
      [addr, expectedNonce]
    );

    const token = signSession(addr);
    await setSessionCookie(token);

    return NextResponse.json({ ok: true, address: addr });
  } catch (e) {
    console.error("verify error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
