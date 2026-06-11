import {
  ClobClient,
  SignatureTypeV2,
  type ApiKeyCreds,
  type ClobClientOptions,
} from "@polymarket/clob-client-v2";
import type { ethers } from "ethers";

const HOST = "https://clob.polymarket.com";
const CHAIN = 137;

type ApiKeyCapableClient = ClobClient & {
  createOrDeriveApiKey?: () => Promise<ApiKeyCreds>;
  createApiKey: () => Promise<ApiKeyCreds>;
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

export async function initPolymarketClient(
  signer: ethers.Signer,
  proxyAddress: string,
) {
  const STORAGE_KEY = `poly_creds_${proxyAddress}`;
  const clobSigner = signer as unknown as ClobClientOptions["signer"];

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
        signatureType: SignatureTypeV2.POLY_PROXY,
        funderAddress: proxyAddress,
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
    signatureType: SignatureTypeV2.POLY_PROXY,
    funderAddress: proxyAddress,
  }) as ApiKeyCapableClient;

  let apiCreds: ApiKeyCreds;
  try {
    if (typeof tempClient.createOrDeriveApiKey === "function") {
      apiCreds = await tempClient.createOrDeriveApiKey();
    } else {
      apiCreds = await tempClient.createApiKey();
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
    signatureType: SignatureTypeV2.POLY_PROXY,
    funderAddress: proxyAddress,
  });

  return client;
}
