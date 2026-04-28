import { NextResponse } from "next/server";
import Safe from "@safe-global/protocol-kit";
import { pool } from "../../db";
import { RowDataPacket } from "mysql2";

const RPC_URL =
  "https://polygon-mainnet.g.alchemy.com/v2/F6AAfcAUEeGEEAU6PWdwwIeb4sz1cMai";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ownerAddress } = body;

    if (!ownerAddress) {
      return NextResponse.json(
        { error: "ownerAddress is required" },
        { status: 400 }
      );
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT safe_address FROM users WHERE address = ?",
      [ownerAddress]
    );

    if (rows && rows.length > 0 && rows[0].safe_address) {
      const predicted = rows[0].safe_address as string;
      return NextResponse.json({ safe_address: predicted });
    }

    const safeSdk = await Safe.init({
      provider: RPC_URL,
      signer: ownerAddress,
      predictedSafe: {
        safeAccountConfig: {
          owners: [ownerAddress],
          threshold: 1,
        },
      },
    });

    const predictedAddress = await safeSdk.getAddress();
    console.log(predictedAddress, `<- сам адрес`);
    await pool.query(
      `
      INSERT INTO users (address, safe_address)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE safe_address = VALUES(safe_address)
    `,
      [ownerAddress, predictedAddress]
    );

    return NextResponse.json({ safe_address: predictedAddress });
  } catch (error: any) {
    console.error("getOrCreateSafe error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
