import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import { pool } from "../../db";
import { isAddress, readSession } from "@/app/lib/auth/session";

interface TradingWalletRow extends RowDataPacket {
  deposit_wallet_address: string | null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!isAddress(address)) {
      return NextResponse.json(
        { error: "valid address is required" },
        { status: 400 },
      );
    }

    const normalizedAddress = address.toLowerCase();
    const session = await readSession();
    if (session && session.address !== normalizedAddress) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [rows] = await pool.query<TradingWalletRow[]>(
      "SELECT deposit_wallet_address FROM users WHERE address = ?",
      [normalizedAddress],
    );

    return NextResponse.json({
      depositWalletAddress: rows[0]?.deposit_wallet_address ?? null,
    });
  } catch (error: unknown) {
    console.error("GET /api/user/trading-wallet error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ownerAddress, depositWalletAddress } = body as {
      ownerAddress?: string;
      depositWalletAddress?: string;
    };

    if (!isAddress(ownerAddress) || !isAddress(depositWalletAddress)) {
      return NextResponse.json(
        { error: "valid ownerAddress and depositWalletAddress are required" },
        { status: 400 },
      );
    }

    const normalizedOwnerAddress = ownerAddress.toLowerCase();
    const normalizedDepositWalletAddress = depositWalletAddress.toLowerCase();
    const session = await readSession();
    if (session && session.address !== normalizedOwnerAddress) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await pool.query(
      `
      INSERT INTO users (address, deposit_wallet_address)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE deposit_wallet_address = VALUES(deposit_wallet_address)
    `,
      [normalizedOwnerAddress, normalizedDepositWalletAddress],
    );

    return NextResponse.json({
      ok: true,
      depositWalletAddress: normalizedDepositWalletAddress,
    });
  } catch (error: unknown) {
    console.error("POST /api/user/trading-wallet error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
