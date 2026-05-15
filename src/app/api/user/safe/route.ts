import { NextResponse } from "next/server";
import { pool } from "../../db";
import { RowDataPacket } from "mysql2";
import { isAddress, readSession } from "@/app/lib/auth/session";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!isAddress(address)) {
      return NextResponse.json(
        { error: "valid address is required" },
        { status: 400 }
      );
    }
    const normalizedAddress = address.toLowerCase();
    const session = await readSession();
    if (session && session.address !== normalizedAddress) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT safe_address FROM users WHERE address = ?",
      [normalizedAddress]
    );

    const safeAddress =
      rows && rows.length > 0 && rows[0].safe_address
        ? (rows[0].safe_address as string)
        : null;
    return NextResponse.json({ safeAddress });
  } catch (error: unknown) {
    console.error("GET /api/user/safe error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
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

    if (!isAddress(ownerAddress) || !isAddress(safeAddress)) {
      return NextResponse.json(
        { error: "valid ownerAddress and safeAddress are required" },
        { status: 400 }
      );
    }

    const normalizedOwnerAddress = ownerAddress.toLowerCase();
    const normalizedSafeAddress = safeAddress.toLowerCase();
    const session = await readSession();
    if (session && session.address !== normalizedOwnerAddress) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await pool.query(
      `
      INSERT INTO users (address, safe_address)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE safe_address = VALUES(safe_address)
    `,
      [normalizedOwnerAddress, normalizedSafeAddress]
    );

    return NextResponse.json({ ok: true, safeAddress: normalizedSafeAddress });
  } catch (error: unknown) {
    console.error("POST /api/user/safe error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
