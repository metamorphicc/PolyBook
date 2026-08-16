"use client";

import { useEffect, useRef } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { useEthersSigner } from "./CustomConnect";
import { clearSiweSession, ensureSiweSession } from "../lib/auth/client";

// Mounted app-wide (inside the wagmi/AppKit provider). Establishes a SIWE
// session as soon as a wallet is connected, so wallet-scoped API routes accept
// requests. Prompts for one signature per wallet (session lasts 7 days).
export default function SessionSync() {
  const { address, isConnected } = useAppKitAccount();
  const signer = useEthersSigner();
  const handledAddress = useRef<string | null>(null);

  useEffect(() => {
    if (!isConnected || !address || !signer) {
      return;
    }

    const normalized = address.toLowerCase();
    if (handledAddress.current === normalized) return;
    handledAddress.current = normalized;

    ensureSiweSession(signer, normalized)
      .then(() => {
        // Session cookie is now set — let wallet-scoped views refetch with it.
        window.dispatchEvent(new Event("polybook:trading-wallet-updated"));
      })
      .catch((error) => {
        // Allow a retry on the next connect/render if login failed or was rejected.
        handledAddress.current = null;
        console.warn("[SessionSync] SIWE login failed:", error);
      });
  }, [address, isConnected, signer]);

  useEffect(() => {
    if (!isConnected) {
      handledAddress.current = null;
      clearSiweSession().catch(() => {});
    }
  }, [isConnected]);

  return null;
}
