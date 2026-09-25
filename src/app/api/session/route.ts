import { NextResponse } from "next/server";
import { clearSessionCookie, readSession } from "@/app/lib/auth/session";
import { rejectOutsideTradingMode } from "@/app/lib/tradingGuard";

// Returns the address bound to the current session cookie, or null.
export async function GET() {
  const unavailable = rejectOutsideTradingMode();
  if (unavailable) return unavailable;

  const session = await readSession();
  return NextResponse.json({ address: session?.address ?? null });
}

// Logs out by clearing the session cookie.
export async function DELETE() {
  const unavailable = rejectOutsideTradingMode();
  if (unavailable) return unavailable;

  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
