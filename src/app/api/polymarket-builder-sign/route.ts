import { NextRequest, NextResponse } from "next/server";
import {
  buildHmacSignature,
} from "@polymarket/builder-signing-sdk";
import { serverEnv } from "@/app/lib/env";
import { readSession } from "@/app/lib/auth/session";

const MAX_BODY_LENGTH = 50000;

export async function POST(request: NextRequest) {
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

    const builderCredentials = serverEnv().polyBuilder;
    const sigTimestamp = Date.now().toString();

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
