import { ClobClient } from "@polymarket/clob-client";

export async function initPolymarketClient(signer: any, proxyAddress: string) {
  const HOST = "https://clob.polymarket.com";
  const CHAIN_ID = 137;
  const STORAGE_KEY = `poly_creds_${proxyAddress}`;

  const savedCreds = localStorage.getItem(STORAGE_KEY);
  if (savedCreds) {
    try {
      const creds = JSON.parse(savedCreds);
      return new ClobClient(HOST, CHAIN_ID, signer, creds, 2, proxyAddress);
    } catch (e) {
      console.error("key's parsing got error in localStorage");
    }
  }

  const tempClient = new ClobClient(HOST, CHAIN_ID, signer, undefined, 2, proxyAddress);

  let apiCreds;
  try {
    apiCreds = await tempClient.deriveApiKey(); 
  } catch (e) {
    apiCreds = await tempClient.createApiKey();
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(apiCreds));

  return new ClobClient(HOST, CHAIN_ID, signer, apiCreds, 2, proxyAddress);
}