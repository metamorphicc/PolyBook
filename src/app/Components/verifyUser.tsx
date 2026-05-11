import {
  ClobClient,
  type ApiKeyCreds,
} from "@polymarket/clob-client-v2";

const HOST = "https://clob.polymarket.com";
const CHAIN = 137;

export async function initPolymarketClient(signer: any, proxyAddress: string) {
  const STORAGE_KEY = `poly_creds_${proxyAddress}`;

  const savedCreds =
    typeof window !== "undefined"
      ? window.localStorage.getItem(STORAGE_KEY)
      : null;

  if (savedCreds) {
    try {
      const creds: ApiKeyCreds = JSON.parse(savedCreds);

      const client = new ClobClient({
        host: HOST,
        chain: CHAIN,
        signer,
        creds,
      });

      return client;
    } catch (e) {
      console.error("key's parsing got error in localStorage", e);
    }
  }

  // 1) временный клиент БЕЗ creds — только чтобы получить apiCreds
  const tempClient = new ClobClient({
    host: HOST,
    chain: CHAIN,
    signer,
  });

  let apiCreds: ApiKeyCreds;
  try {
    if (typeof (tempClient as any).createOrDeriveApiKey === "function") {
      apiCreds = await (tempClient as any).createOrDeriveApiKey();
    } else {
      apiCreds = await (tempClient as any).createApiKey();
    }
  } catch (e) {
    console.error("failed to create/derive api key", e);
    throw e;
  }

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(apiCreds));
  }

  // 2) полноценный клиент с creds
  const client = new ClobClient({
    host: HOST,
    chain: CHAIN,
    signer,
    creds: apiCreds,
  });

  return client;
}