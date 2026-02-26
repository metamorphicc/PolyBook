import { NextResponse } from "next/server";
import Safe from "@safe-global/protocol-kit";
import { pool } from "../../db";

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

    const checker = await pool.query(
      "SELECT safe_address FROM USERS WHERE address = ?",
      [ownerAddress]
    );

    if (checker.length) {
      console.log("user already registered");
      return NextResponse.json({ proxyAddress: checker[0] });
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
