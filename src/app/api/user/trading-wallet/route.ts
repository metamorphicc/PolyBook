import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import { pool } from "../../db";
import { isAddress, readSession } from "@/app/lib/auth/session";

interface TradingWalletRow extends RowDataPacket {
  deposit_wallet_address: string | null;
}

async function getDepositWalletAddress(ownerAddress: string) {
  const [rows] = await pool.query<TradingWalletRow[]>(
    "SELECT deposit_wallet_address FROM users WHERE address = ?",
    [ownerAddress],
  );

  return rows[0]?.deposit_wallet_address ?? null;
}

async function upsertDepositWalletAddress(
  ownerAddress: string,
  depositWalletAddress: string,
) {
  await pool.query(
    `
    INSERT INTO users (address, deposit_wallet_address)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE deposit_wallet_address = VALUES(deposit_wallet_address)
  `,
    [ownerAddress, depositWalletAddress],
  );
}

export async function GET(request: Request) {
  try {
    const session = await readSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // The owner is always the authenticated wallet — never trust the client.
    // A mismatched ?address= param is a clear client bug, so surface it.
    const requested = new URL(request.url).searchParams.get("address");
    if (requested && requested.toLowerCase() !== session.address) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const depositWalletAddress = await getDepositWalletAddress(session.address);

    return NextResponse.json({ depositWalletAddress });
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
    const session = await readSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { depositWalletAddress } = body as {
      depositWalletAddress?: string;
    };

    if (!isAddress(depositWalletAddress)) {
      return NextResponse.json(
        { error: "valid depositWalletAddress is required" },
        { status: 400 },
      );
    }

    // Owner is derived from the session — a caller can only write its own row.
    const normalizedDepositWalletAddress = depositWalletAddress.toLowerCase();
    await upsertDepositWalletAddress(
      session.address,
      normalizedDepositWalletAddress,
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
