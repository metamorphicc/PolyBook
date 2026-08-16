import type { ethers } from "ethers";

// Client-side SIWE session helpers.
//
// The server binds a signed JWT to a wallet address via an httpOnly cookie
// (see src/app/lib/auth/session.ts). All wallet-scoped API routes require that
// cookie and derive the owner from it, so the client must establish a session
// once per wallet before those routes will accept reads or writes.

export const SIWE_MESSAGE_PREFIX = "PolyBook login nonce: ";

let inflightLogin: { address: string; promise: Promise<void> } | null = null;

async function fetchSessionAddress(): Promise<string | null> {
  try {
    const res = await fetch("/api/session", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { address?: string | null };
    return data.address ? data.address.toLowerCase() : null;
  } catch {
    return null;
  }
}

async function runSiweLogin(
  signer: ethers.Signer,
  address: string,
): Promise<void> {
  const normalized = address.toLowerCase();

  const nonceRes = await fetch("/api/getNonce", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: normalized }),
  });
  if (!nonceRes.ok) {
    throw new Error("Failed to request login nonce");
  }
  const { nonce } = (await nonceRes.json()) as { nonce?: string };
  if (!nonce) throw new Error("Login nonce missing in response");

  const signature = await signer.signMessage(`${SIWE_MESSAGE_PREFIX}${nonce}`);

  const verifyRes = await fetch("/api/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: normalized, nonce, signature }),
  });
  if (!verifyRes.ok) {
    const data = await verifyRes.json().catch(() => ({}));
    throw new Error(
      typeof (data as { error?: unknown }).error === "string"
        ? (data as { error: string }).error
        : "Login verification failed",
    );
  }
}

// Ensures an active session bound to `address`. Reuses an in-flight login for
// the same address so concurrent callers trigger only one signature prompt.
// Resolves immediately if the cookie already matches the connected wallet.
export async function ensureSiweSession(
  signer: ethers.Signer,
  address: string,
): Promise<void> {
  const normalized = address.toLowerCase();

  if (inflightLogin && inflightLogin.address === normalized) {
    return inflightLogin.promise;
  }

  const promise = (async () => {
    const current = await fetchSessionAddress();
    if (current === normalized) return;
    await runSiweLogin(signer, normalized);
  })();

  inflightLogin = { address: normalized, promise };

  try {
    await promise;
  } finally {
    if (inflightLogin?.promise === promise) {
      inflightLogin = null;
    }
  }
}

export async function clearSiweSession(): Promise<void> {
  inflightLogin = null;
  try {
    await fetch("/api/session", { method: "DELETE" });
  } catch {
    // best-effort logout
  }
}
