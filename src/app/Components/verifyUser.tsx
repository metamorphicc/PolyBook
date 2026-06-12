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

export async function initPolymarketClient(
  signer: ethers.Signer,
  proxyAddress: string,
  flow: WalletFlow = "proxy",
) {
  const normalizedProxyAddress = proxyAddress.toLowerCase();
  const signatureType = getSignatureType(flow);
  const STORAGE_KEY = `poly_creds_v2_${flow}_${normalizedProxyAddress}`;
  const LEGACY_STORAGE_KEY = `poly_creds_${proxyAddress}`;
  const LEGACY_NORMALIZED_STORAGE_KEY = `poly_creds_${normalizedProxyAddress}`;
  const clobSigner = signer as unknown as ClobClientOptions["signer"];

  if (typeof window !== "undefined") {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_NORMALIZED_STORAGE_KEY);
  }

  const savedCreds =
    typeof window !== "undefined"
      ? window.localStorage.getItem(STORAGE_KEY)
      : null;

  if (savedCreds) {
    try {
      const creds = JSON.parse(savedCreds) as unknown;

      if (!isApiKeyCreds(creds)) {
        window.localStorage.removeItem(STORAGE_KEY);
        throw new Error("Stored Polymarket API credentials are incomplete.");
      }

      const client = new ClobClient({
        host: HOST,
        chain: CHAIN,
        signer: clobSigner,
        creds,
        signatureType,
        funderAddress: normalizedProxyAddress,
        retryOnError: true,
        throwOnError: true,
      });

      return client;
    } catch (e) {
      console.error("key's parsing got error in localStorage", e);
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }

  // 1) временный клиент БЕЗ creds — только чтобы получить apiCreds
  const tempClient = new ClobClient({
    host: HOST,
    chain: CHAIN,
    signer: clobSigner,
    signatureType,
    funderAddress: normalizedProxyAddress,
    retryOnError: true,
    throwOnError: true,
  }) as ApiKeyCapableClient;

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
  const client = new ClobClient({
    host: HOST,
    chain: CHAIN,
    signer: clobSigner,
    creds: apiCreds,
    signatureType,
    funderAddress: normalizedProxyAddress,
    retryOnError: true,
    throwOnError: true,
  });

  return client;
}
