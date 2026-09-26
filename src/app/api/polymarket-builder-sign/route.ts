import { NextRequest, NextResponse } from "next/server";
import {
  buildHmacSignature,
} from "@polymarket/builder-signing-sdk";
import { serverEnv } from "@/app/lib/env";
import { readSession } from "@/app/lib/auth/session";
import { rejectOutsideTradingMode } from "@/app/lib/tradingGuard";

const MAX_BODY_LENGTH = 50000;

export async function POST(request: NextRequest) {
  const unavailable = rejectOutsideTradingMode();
  if (unavailable) return unavailable;

  try {
    // This route hands back the app's builder credentials (API key + passphrase)
    // and a valid signature for the requested path. Only signed-in wallets may
    // call it, otherwise anyone could mint builder-authed relayer requests.
    const session = await readSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { method, path, body } = await request.json();

    if (typeof method !== "string" || typeof path !== "string") {
      return NextResponse.json(
        { error: "method and path are required" },
        { status: 400 },
      );
    }

    if (body && typeof body !== "string") {
      return NextResponse.json(
        { error: "body must be a string" },
        { status: 400 },
      );
    }

    if (body && body.length > MAX_BODY_LENGTH) {
      return NextResponse.json(
        { error: "body is too large" },
        { status: 413 },
      );
    }

    if (method.toUpperCase() !== "POST" || path !== "/submit" || !body) {
      return NextResponse.json(
        { error: "Only relayer transaction submission may be signed" },
        { status: 403 },
      );
    }

    let relayerPayload: { from?: unknown };
    try {
      relayerPayload = JSON.parse(body) as { from?: unknown };
    } catch {
      return NextResponse.json(
        { error: "body must contain valid JSON" },
        { status: 400 },
      );
    }

    if (
      typeof relayerPayload.from !== "string" ||
      relayerPayload.from.toLowerCase() !== session.address
    ) {
      return NextResponse.json(
        { error: "Relayer signer does not match the authenticated wallet" },
        { status: 403 },
      );
    }

    const builderCredentials = serverEnv().polyBuilder;
    // Builder timestamps are Unix seconds. Milliseconds produce a valid HMAC
    // over the wrong timestamp domain and the relayer rejects the request.
    const sigTimestamp = Math.floor(Date.now() / 1000).toString();

    const signature = buildHmacSignature(
      builderCredentials.secret,
      parseInt(sigTimestamp),
      method.toUpperCase(),
      path,
      body ?? ""
    );

    return NextResponse.json({
      POLY_BUILDER_SIGNATURE: signature,
      POLY_BUILDER_TIMESTAMP: sigTimestamp,
      POLY_BUILDER_API_KEY: builderCredentials.key,
      POLY_BUILDER_PASSPHRASE: builderCredentials.passphrase,
    });
  } catch (e: unknown) {
    console.error("[POLY BUILDER SIGN ERROR]:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal error" },
      { status: 500 }
    );
  }
}
