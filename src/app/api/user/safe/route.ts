import { NextResponse } from "next/server";
import { pool } from "../../db";
import { RowDataPacket } from "mysql2";
import {
  BuilderConfig,
  BuilderApiKeyCreds,
} from "@polymarket/builder-signing-sdk";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        { error: "address is required" },
        { status: 400 }
      );
    }
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT safe_address FROM users WHERE address = ?",
      [address]
    );

    const safeAddress =
      rows && rows.length > 0 && rows[0].safe_address
        ? (rows[0].safe_address as string)
        : null;
    console.log(`from api`+safeAddress)
    return NextResponse.json({ safeAddress });
  } catch (error: any) {
    console.error("GET /api/user/safe error:", error);
    return NextResponse.json(
      { error: error.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ownerAddress, safeAddress } = body as {
      ownerAddress?: string;
      safeAddress?: string;
    };

    if (!ownerAddress || !safeAddress) {
      return NextResponse.json(
        { error: "ownerAddress and safeAddress are required" },
        { status: 400 }
      );
    }

    await pool.query(
      `
      INSERT INTO users (address, safe_address)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE safe_address = VALUES(safe_address)
    `,
      [ownerAddress, safeAddress]
    );

    return NextResponse.json({ ok: true, safeAddress });
  } catch (error: any) {
    console.error("POST /api/user/safe error:", error);
    return NextResponse.json(
      { error: error.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
