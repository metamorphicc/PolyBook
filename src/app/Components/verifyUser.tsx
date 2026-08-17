import {
  ClobClient,
  SignatureTypeV2,
  type ApiKeyCreds,
  type ClobClientOptions,
} from "@polymarket/clob-client-v2";
import type { ethers } from "ethers";

const HOST = "https://clob.polymarket.com";
const CHAIN = 137;

type WalletFlow = "deposit-wallet" | "proxy" | "gnosis-safe";

type ApiKeyCapableClient = ClobClient & {
  createApiKey: () => Promise<ApiKeyCreds>;
  deriveApiKey: () => Promise<ApiKeyCreds>;
};

function isApiKeyCreds(value: unknown): value is ApiKeyCreds {
  if (!value || typeof value !== "object") return false;

  const creds = value as Partial<Record<keyof ApiKeyCreds, unknown>>;

  return (
    typeof creds.key === "string" &&
    creds.key.length > 0 &&
    typeof creds.secret === "string" &&
    creds.secret.length > 0 &&
    typeof creds.passphrase === "string" &&
    creds.passphrase.length > 0
  );
}

function getSignatureType(flow: WalletFlow) {
  if (flow === "deposit-wallet") return SignatureTypeV2.POLY_1271;
  if (flow === "gnosis-safe") return SignatureTypeV2.POLY_GNOSIS_SAFE;
  return SignatureTypeV2.POLY_PROXY;
}

function credsStorageKey(flow: WalletFlow, proxyAddress: string) {
  return `poly_creds_v2_${flow}_${proxyAddress.toLowerCase()}`;
}

function buildClient(
  signer: ethers.Signer,
  proxyAddress: string,
  flow: WalletFlow,
  creds?: ApiKeyCreds,
) {
  return new ClobClient({
    host: HOST,
    chain: CHAIN,
    signer: signer as unknown as ClobClientOptions["signer"],
    ...(creds ? { creds } : {}),
    signatureType: getSignatureType(flow),
    funderAddress: proxyAddress.toLowerCase(),
    retryOnError: true,
    throwOnError: true,
  });
}

/**
 * True when API credentials for this wallet are already cached.
 *
 * Needs no signer, so callers can tell "trading was enabled before, the client is
 * just a tick behind" from "trading was never enabled" — the two look identical
 * through `restorePolymarketClient`, which returns null for both.
 */
export function hasPolymarketCreds(
  proxyAddress: string,
  flow: WalletFlow = "proxy",
) {
  if (typeof window === "undefined") return false;

  const saved = window.localStorage.getItem(credsStorageKey(flow, proxyAddress));
  if (!saved) return false;

  try {
    return isApiKeyCreds(JSON.parse(saved) as unknown);
  } catch {
    return false;
  }
}

/**
 * Rebuilds a signed client from cached API credentials, or null if there are none.
 *
 * Synchronous and prompt-free: creating the API key is the part that needs a
 * signature, and that already happened. This is what lets a page navigation or a
 * tab switch keep trading enabled instead of sending the user back through
 * "Enable trading" every time the component remounts.
 */
export function restorePolymarketClient(
  signer: ethers.Signer,
  proxyAddress: string,
  flow: WalletFlow = "proxy",
) {
  if (typeof window === "undefined") return null;

  const saved = window.localStorage.getItem(credsStorageKey(flow, proxyAddress));
  if (!saved) return null;

  try {
    const creds = JSON.parse(saved) as unknown;
    if (!isApiKeyCreds(creds)) return null;

    return buildClient(signer, proxyAddress, flow, creds);
  } catch {
    return null;
  }
}

export async function initPolymarketClient(
  signer: ethers.Signer,
  proxyAddress: string,
  flow: WalletFlow = "proxy",
) {
  const normalizedProxyAddress = proxyAddress.toLowerCase();
  const STORAGE_KEY = credsStorageKey(flow, proxyAddress);
  const LEGACY_STORAGE_KEY = `poly_creds_${proxyAddress}`;
  const LEGACY_NORMALIZED_STORAGE_KEY = `poly_creds_${normalizedProxyAddress}`;

  if (typeof window !== "undefined") {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_NORMALIZED_STORAGE_KEY);
  }

  const restored = restorePolymarketClient(signer, proxyAddress, flow);
  if (restored) return restored;

  // Anything left under the key is unusable — drop it so the retry is clean.
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }

  // 1) временный клиент БЕЗ creds — только чтобы получить apiCreds
  const tempClient = buildClient(
    signer,
    proxyAddress,
    flow,
  ) as ApiKeyCapableClient;

  let apiCreds: ApiKeyCreds;
  try {
    try {
      apiCreds = await tempClient.createApiKey();
    } catch (createError) {
      console.warn("create api key failed, deriving existing key", createError);
      apiCreds = await tempClient.deriveApiKey();
    }
  } catch (e) {
    console.error("failed to create/derive api key", e);
    throw e;
  }

  if (!isApiKeyCreds(apiCreds)) {
    throw new Error(
      "Polymarket API credentials are incomplete. Reconnect wallet and try again.",
    );
  }

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(apiCreds));
  }

  // 2) полноценный клиент с creds
  return buildClient(signer, proxyAddress, flow, apiCreds);
}
