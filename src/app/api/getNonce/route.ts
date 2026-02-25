import crypto from "crypto";
import { pool } from "../db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { address } = await req.json();
    const nonce = crypto.randomBytes(16).toString("hex");

    console.log(`nonce: ${nonce}`);
    console.log(`ADDRESS: ${address}`);

    await pool.query(
      "INSERT INTO login_nonces (address, nonce, used) VALUES (?, ?, 0)",
      [address, nonce]
    );

    return NextResponse.json({ nonce });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}