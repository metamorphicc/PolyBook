import { ClobClient } from '@polymarket/clob-client';

export async function initPolymarketClient(signer: any, proxyAddress: string) {
    const HOST = "https://clob.polymarket.com";
    
    const client = new ClobClient(HOST, signer);
    
    const apiCreds = await (client as any).api.createOrDeriveApiKey();
    
    const tradingClient = new ClobClient(HOST, signer, apiCreds);
    (tradingClient as any).funderAddress = proxyAddress;
    (tradingClient as any).signatureType = 2;

    return tradingClient;
}