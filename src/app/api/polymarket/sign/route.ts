import { NextRequest, NextResponse } from "next/server";
import {
  buildHmacSignature,
} from "@polymarket/builder-signing-sdk";
import { serverEnv } from "@/app/lib/env";

export async function POST(request: NextRequest) {
  try {
    const { method, path, body } = await request.json();

    if (typeof method !== "string" || typeof path !== "string") {
      return NextResponse.json(
        { error: "method and path are required" },
        { status: 400 },
      );
    }

    const builderCredentials = serverEnv().polyBuilder;
    const sigTimestamp = Date.now().toString();

    const signature = buildHmacSignature(
      builderCredentials.secret,
      parseInt(sigTimestamp),
      method.toUpperCase(),
      path,
      body ?? "",
    );

    return NextResponse.json({
      POLY_BUILDER_SIGNATURE: signature,
      POLY_BUILDER_TIMESTAMP: sigTimestamp,
      POLY_BUILDER_API_KEY: builderCredentials.key,
      POLY_BUILDER_PASSPHRASE: builderCredentials.passphrase,
    });
  } catch (error) {
    console.error("[POLYMARKET SIGN ERROR]:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
