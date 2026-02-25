import { NextResponse } from "next/server";
import { pool } from "../db";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  try {
    const { address, nonce } = await req.json();
    const addr = address.toLowerCase();

    const [rows]: any = await pool.query(
      "SELECT nonce FROM login_nonces WHERE address = ? AND used = 0 ORDER BY id DESC LIMIT 1",
      [addr]
    );

    if (!rows.length) {
      return NextResponse.json({ error: "No nonce for this address" }, { status: 400 });
    }

    const expectedNonce = rows[0].nonce;

    await pool.query(
      "UPDATE login_nonces SET used = 1 WHERE address = ? AND nonce = ?",
      [addr, expectedNonce]
    );

    const token = jwt.sign(
      { sub: 10, address: addr },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    return NextResponse.json({ ok: "ok", token: token });
  } catch (e) {
    console.error("verify error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}