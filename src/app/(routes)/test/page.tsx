"use client";

import { useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { ClobClient, Side } from "@polymarket/clob-client";

type AnyObj = Record<string, any>;

export default function TestTrade() {
  const { isConnected, address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  const [result, setResult] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const log = (msg: string) => {
    setResult((prev) => (prev ? prev + "\n" + msg : msg));
  };

  const resetLog = (msg = "") => setResult(msg);

  const ensurePolygon = async () => {
    if (chainId !== 137) {
      log("Switching to Polygon...");
      await switchChainAsync({ chainId: 137 });
    }
  };

  const getEthersSigner = async () => {
    if (!(window as any).ethereum) {
      throw new Error("No wallet provider found");
    }

    const { ethers } = await import("ethers");
    const provider = new ethers.providers.Web3Provider(
      (window as any).ethereum
    );
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
    const signerAddr = await signer.getAddress();

    return { ethers, provider, signer, signerAddr };
  };

  const normalizeCreds = (raw: AnyObj) => {
    const apiKey = raw?.apiKey ?? raw?.key;
    const secret = raw?.secret;
    const passphrase = raw?.passphrase;

    if (!apiKey || !secret || !passphrase) {
      throw new Error("Invalid API credentials shape");
    }

    return { apiKey, secret, passphrase };
  };

  const buildAuthedClient = async () => {
    if (!address) throw new Error("Wallet not connected");

    await ensurePolygon();
    const { signer, signerAddr } = await getEthersSigner();

    const raw = localStorage.getItem("poly_creds");
    if (!raw) throw new Error("No keys found. Run Generate Keys first.");

    const saved = JSON.parse(raw);
    const creds = normalizeCreds(saved);

    const client = new ClobClient(
      "https://clob.polymarket.com",
      137,
      signer as any,
      {
        key: creds.apiKey,
        secret: creds.secret,
        passphrase: creds.passphrase,
      } as any
    );

    return { client, signerAddr, creds };
  };

  const testConnection = async () => {
    setBusy(true);
    try {
      resetLog("Testing public endpoints...");
  
      const urls = [
        "/api/gamma",
        "https://clob.polymarket.com/time",
      ];
  
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        log(`\n--- [${i}]`);
        log(`Fetching: ${url}`);
  
        try {
          const resp = await fetch(url);
          log(`Status: ${resp.status} ${resp.statusText}`);
  
          const text = await resp.text();
          log(`Body preview: ${text.slice(0, 400)}`);
        } catch (e: any) {
          log(`❌ Failed: ${url}`);
          log(`Message: ${e?.message || "unknown error"}`);
          log(`Name: ${e?.name || "unknown"}`);
        }
      }
  
      log("\nDone.");
    } finally {
      setBusy(false);
    }
  };

  const generateKeys = async () => {
    setBusy(true);
    try {
      resetLog("Step 1: Checking wallet/network...");
      if (!address) throw new Error("Wallet not connected");

      await ensurePolygon();

      log("Step 2: Getting signer...");
      const { signerAddr, signer } = await getEthersSigner();
      log(`Signer address: ${signerAddr}`);

      log("Step 3: Creating unauthenticated ClobClient...");
      const client = new ClobClient(
        "https://clob.polymarket.com",
        137,
        signer as any
      );

      log("Step 4: Requesting / deriving API credentials...");
      const credsRaw = await client.createOrDeriveApiKey();
      log("Raw creds received:");
      log(JSON.stringify(credsRaw, null, 2));

      const creds = normalizeCreds(credsRaw);
      localStorage.setItem("poly_creds", JSON.stringify(creds));

      log("\n✅ Normalized creds saved to localStorage as poly_creds");
      log(JSON.stringify(creds, null, 2));
    } catch (error: any) {
      log(`\n❌ Error: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  const checkKeys = async () => {
    try {
      resetLog("Checking localStorage...");
      const raw = localStorage.getItem("poly_creds");
      if (!raw) throw new Error("No keys in localStorage");
      const creds = JSON.parse(raw);
      log("✅ Keys found:");
      log(JSON.stringify(creds, null, 2));
    } catch (error: any) {
      log(`❌ Error: ${error.message}`);
    }
  };

  const inspectMarket = async () => {
    setBusy(true);
    try {
      resetLog("Fetching one active market from Gamma...");

      const gammaResp = await fetch("/api/gamma");
      const gammaData = await gammaResp.json();

      if (!Array.isArray(gammaData) || !gammaData.length) {
        throw new Error("No active markets from Gamma");
      }

      const market = gammaData[0];
      log("Selected Gamma market:");
      log(
        JSON.stringify(
          {
            question: market.question,
            conditionId: market.conditionId,
            slug: market.slug,
            active: market.active,
            closed: market.closed,
            liquidity: market.liquidity,
            volume: market.volume,
          },
          null,
          2
        )
      );

      log("\nFetching related CLOB market by conditionId...");
      const clobResp = await fetch(
        `https://clob.polymarket.com/markets/${market.conditionId}`
      );
      const clobText = await clobResp.text();

      log(`CLOB market status: ${clobResp.status}`);

      let clobData: AnyObj = {};
      try {
        clobData = JSON.parse(clobText);
      } catch {
        throw new Error("CLOB market response is not JSON");
      }

      const tokens = clobData?.tokens ?? [];
      if (!tokens.length) {
        log("Full CLOB response:");
        log(clobText.slice(0, 4000));
        throw new Error("No tokens found in CLOB market response");
      }

      log("\nTokens:");
      log(
        JSON.stringify(
          tokens.map((t: AnyObj) => ({
            token_id: t.token_id,
            outcome: t.outcome,
            price: t.price,
            winner: t.winner,
          })),
          null,
          2
        )
      );

      const chosen =
        tokens.find((t: AnyObj) => String(t.outcome).toLowerCase() === "yes") ??
        tokens[0];
      const tokenId = chosen.token_id;

      log(
        `\nChosen token_id: ${tokenId} (${chosen.outcome ?? "unknown outcome"})`
      );

      log("\nFetching order book...");
      const bookResp = await fetch(
        `https://clob.polymarket.com/book?token_id=${tokenId}`
      );
      const bookText = await bookResp.text();
      log(`Book status: ${bookResp.status}`);

      let book: AnyObj = {};
      try {
        book = JSON.parse(bookText);
      } catch {
        throw new Error("Book response is not JSON");
      }

      log("Order book summary:");
      log(
        JSON.stringify(
          {
            asset_id: book.asset_id,
            market: book.market,
            bestBid: book.bids?.[0] ?? null,
            bestAsk: book.asks?.[0] ?? null,
            bidsCount: book.bids?.length ?? 0,
            asksCount: book.asks?.length ?? 0,
          },
          null,
          2
        )
      );
    } catch (error: any) {
      log(`\n❌ Error: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  const testTinyOrder = async () => {
    setBusy(true);
    try {
      resetLog("Starting tiny order test...");

      const { client, signerAddr, creds } = await buildAuthedClient();
      log(`Signer: ${signerAddr}`);
      log(`Using API key: ${creds.apiKey}`);

      log("\nStep 1: Fetching active markets from Gamma...");
      const gammaResp = await fetch(
        "https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=10"
      );
      const gammaData = await gammaResp.json();

      if (!Array.isArray(gammaData) || !gammaData.length) {
        throw new Error("No active Gamma markets");
      }

      const market = gammaData[0];
      log("Selected market:");
      log(
        JSON.stringify(
          {
            question: market.question,
            conditionId: market.conditionId,
            active: market.active,
            closed: market.closed,
            liquidity: market.liquidity,
            volume: market.volume,
          },
          null,
          2
        )
      );

      log("\nStep 2: Fetching CLOB market...");
      const clobResp = await fetch(
        `https://clob.polymarket.com/markets/${market.conditionId}`
      );
      const clobData = await clobResp.json();

      const tokens = clobData?.tokens ?? [];
      if (!tokens.length) {
        throw new Error("No tokens in CLOB response");
      }

      log("Available tokens:");
      log(
        JSON.stringify(
          tokens.map((t: AnyObj) => ({
            token_id: t.token_id,
            outcome: t.outcome,
            price: t.price,
          })),
          null,
          2
        )
      );

      const chosen =
        tokens.find((t: AnyObj) => String(t.outcome).toLowerCase() === "yes") ??
        tokens[0];
      const tokenId = chosen.token_id;

      log(`Chosen token: ${tokenId} (${chosen.outcome ?? "unknown"})`);

      log("\nStep 3: Fetching order book...");
      const bookResp = await fetch(
        `https://clob.polymarket.com/book?token_id=${tokenId}`
      );
      const book = await bookResp.json();

      const bestBid = Number(book?.bids?.[0]?.price ?? 0);
      const bestAsk = Number(book?.asks?.[0]?.price ?? 0);

      log("Book snapshot:");
      log(
        JSON.stringify(
          {
            bestBid,
            bestAsk,
            topBid: book?.bids?.[0] ?? null,
            topAsk: book?.asks?.[0] ?? null,
          },
          null,
          2
        )
      );

      let price = 0.01;
      if (bestBid > 0 && bestBid < 0.99) {
        price = bestBid;
      } else if (bestAsk > 0.01 && bestAsk <= 0.99) {
        price = Math.max(0.01, Number((bestAsk - 0.01).toFixed(2)));
      }

      const orderArgs = {
        tokenID: tokenId,
        side: Side.BUY,
        price,
        size: 1,
      };

      log("\nStep 4: Creating order...");
      log(JSON.stringify(orderArgs, null, 2));

      const signedOrder = await client.createOrder(orderArgs as any);
      log("✅ Signed order:");
      log(JSON.stringify(signedOrder, null, 2).slice(0, 4000));

      log("\nStep 5: Posting order...");
      const postResp = await client.postOrder(signedOrder as any);
      log("✅ Post response:");
      log(JSON.stringify(postResp, null, 2));

      log(
        "\nIf response includes orderID / success / status=live, order placement worked."
      );
    } catch (error: any) {
      log(`\n❌ Error: ${error.message}`);
      if (error?.response) {
        log("Error response:");
        try {
          log(JSON.stringify(error.response, null, 2));
        } catch {}
      }
      if (error?.data) {
        log("Error data:");
        try {
          log(JSON.stringify(error.data, null, 2));
        } catch {}
      }
    } finally {
      setBusy(false);
    }
  };

  const getOpenOrders = async () => {
    setBusy(true);
    try {
      resetLog("Fetching user open orders...");

      const { client } = await buildAuthedClient();

      const orders =
        (await (client as any).getOrders?.()) ??
        (await (client as any).getOpenOrders?.());
      log("Open orders response:");
      log(JSON.stringify(orders, null, 2));
    } catch (error: any) {
      log(`❌ Error: ${error.message}`);
      if (error?.response) {
        try {
          log(JSON.stringify(error.response, null, 2));
        } catch {}
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-2">Polymarket CLOB Test</h2>

      <p className="text-sm text-gray-400 mb-4">
        Connected: {isConnected ? `✅ ${address}` : "❌ Not connected"} | Chain:{" "}
        {chainId ?? "unknown"}
      </p>

      <div className="flex gap-3 flex-wrap mb-4">
        <button
          onClick={testConnection}
          disabled={busy}
          className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
        >
          1. Test Connection
        </button>

        <button
          onClick={generateKeys}
          disabled={busy}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          2. Generate Keys
        </button>

        <button
          onClick={checkKeys}
          disabled={busy}
          className="px-4 py-2 bg-yellow-600 text-white rounded disabled:opacity-50"
        >
          3. Check Keys
        </button>

        <button
          onClick={inspectMarket}
          disabled={busy}
          className="px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50"
        >
          4. Inspect Market
        </button>

        <button
          onClick={testTinyOrder}
          disabled={busy}
          className="px-4 py-2 bg-purple-600 text-white rounded disabled:opacity-50"
        >
          5. Test Tiny Order
        </button>

        <button
          onClick={getOpenOrders}
          disabled={busy}
          className="px-4 py-2 bg-pink-600 text-white rounded disabled:opacity-50"
        >
          6. Get Open Orders
        </button>
      </div>

      {result && (
        <pre className="p-4 bg-gray-900 rounded text-sm text-green-400 overflow-auto max-h-[650px] whitespace-pre-wrap">
          {result}
        </pre>
      )}
    </div>
  );
}
