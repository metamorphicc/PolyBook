import { ClobClient } from "@polymarket/clob-client";
export async function initPolymarketClient(signer: any, proxyAddress: string) {
  const HOST = "https://clob.polymarket.com";
  const CHAIN_ID = 137;

  
  const tempClient = new ClobClient(
    HOST,
    CHAIN_ID,
    signer,
    undefined, 
    2, 
    proxyAddress 
  );

  const apiCreds = await tempClient.createOrDeriveApiKey();

  const client = new ClobClient(
    HOST,
    CHAIN_ID,
    signer,
    apiCreds,
    2,
    proxyAddress
  );

  return client;
}
