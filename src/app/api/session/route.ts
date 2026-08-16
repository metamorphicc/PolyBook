import { NextResponse } from "next/server";
import { clearSessionCookie, readSession } from "@/app/lib/auth/session";

// Returns the address bound to the current session cookie, or null.
export async function GET() {
  const session = await readSession();
  return NextResponse.json({ address: session?.address ?? null });
}

// Logs out by clearing the session cookie.
export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
