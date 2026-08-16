import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { serverEnv } from "@/app/lib/env";

export const SESSION_COOKIE = "polybook_session";

export type SessionPayload = {
  sub: string;
  address: string;
};

export function signSession(address: string) {
  const normalizedAddress = address.toLowerCase();

  return jwt.sign(
    {
      sub: normalizedAddress,
      address: normalizedAddress,
    },
    serverEnv().jwtSecret,
    { expiresIn: "7d" },
  );
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function readSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const payload = jwt.verify(token, serverEnv().jwtSecret) as SessionPayload;
    if (!payload.address) return null;
    return {
      sub: payload.sub,
      address: payload.address.toLowerCase(),
    };
  } catch {
    return null;
  }
}

export function isAddress(value: unknown): value is string {
  return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value);
}
