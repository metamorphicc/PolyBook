import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import { pool } from "../../db";
import { isAddress, readSession } from "@/app/lib/auth/session";

interface TradingWalletRow extends RowDataPacket {
  deposit_wallet_address: string | null;
}

type DatabaseError = Error & {
  code?: string;
  errno?: number;
};

function isMissingDepositWalletColumn(error: unknown) {
  const dbError = error as DatabaseError;
  return dbError.code === "ER_BAD_FIELD_ERROR" || dbError.errno === 1054;
}

function isSafeAddressRequired(error: unknown) {
  const dbError = error as DatabaseError;
  return dbError.code === "ER_NO_DEFAULT_FOR_FIELD" || dbError.errno === 1364;
}

async function ensureDepositWalletColumn() {
  try {
    await pool.query(
      "ALTER TABLE users ADD COLUMN deposit_wallet_address varchar(42) NULL UNIQUE AFTER safe_address",
    );
  } catch (error: unknown) {
    const dbError = error as DatabaseError;
    if (dbError.code !== "ER_DUP_FIELDNAME" && dbError.errno !== 1060) {
      throw error;
    }
  }
}

async function ensureSafeAddressNullable() {
  await pool.query("ALTER TABLE users MODIFY safe_address varchar(42) NULL");
}

async function ensureTradingWalletSchema() {
  await ensureDepositWalletColumn();
  await ensureSafeAddressNullable();
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

    let depositWalletAddress: string | null;
    try {
      depositWalletAddress = await getDepositWalletAddress(normalizedAddress);
    } catch (error: unknown) {
      if (!isMissingDepositWalletColumn(error)) throw error;
      await ensureTradingWalletSchema();
      depositWalletAddress = await getDepositWalletAddress(normalizedAddress);
    }

    return NextResponse.json({
      depositWalletAddress,
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

    try {
      await upsertDepositWalletAddress(
        normalizedOwnerAddress,
        normalizedDepositWalletAddress,
      );
    } catch (error: unknown) {
      if (!isMissingDepositWalletColumn(error) && !isSafeAddressRequired(error)) {
        throw error;
      }
      await ensureTradingWalletSchema();
      await upsertDepositWalletAddress(
        normalizedOwnerAddress,
        normalizedDepositWalletAddress,
      );
    }

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
