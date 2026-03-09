import { NextResponse } from "next/server";
import Safe from "@safe-global/protocol-kit";
import { pool } from "../../db";
import { RowDataPacket } from "mysql2";

const RPC_URL =
  "https://polygon-mainnet.g.alchemy.com/v2/F6AAfcAUEeGEEAU6PWdwwIeb4sz1cMai";

export async function POST(request: Request) {
  try {
    console.log();
    const body = await request.json();
    const { ownerAddress } = body;
    console.log(
      `owner adds;` + ownerAddress
    );

    if (!ownerAddress) {
      return NextResponse.json(
        { error: "ownerAddress is required" },
        { status: 400 }
      );
    }

    const [checker] = await pool.query<RowDataPacket[]>(
      "SELECT safe_address FROM users WHERE address = ?",
      [ownerAddress]
    );

    if (checker && checker.length > 0) {
      const existingSafeAddress = checker[0].safe_address;
      console.log(existingSafeAddress)
      return NextResponse.json({
        ok: "ok",
        proxyAddress: existingSafeAddress 
      });
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

    await fetch("http://localhost:3002/api/registerUser", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: ownerAddress,
        safe_address: predictedAddress,
      }),
    }).then((res) => {
      res.json();
    });

    return NextResponse.json({ proxyAddress: predictedAddress });
  } catch (error: any) {
    console.error("back error", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
