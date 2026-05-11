"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import PriceChart from "./PriceChart";
import UnlockTrading from "@/app/Components/UnlockTrading";
import { useAppKitAccount } from "@reown/appkit/react";
import { useConnectorClient } from "wagmi";
import { ethers } from "ethers";
import { Side, OrderType } from "@polymarket/clob-client-v2";

type Market = { id: string; question: string; clobTokenIds: string };
type Selected = { market: Market | null; side: "yes" | "no" | null };

type Position = {
  conditionId: string;
  size: number;
  avgPrice: number;
  cashPnl: number;
  isClaimed: boolean;
};

function useEthersSigner() {
  const { data: client } = useConnectorClient();
  return useMemo(() => {
    if (!client) return undefined;
    const { account, transport } = client;
    const provider = new ethers.providers.Web3Provider(transport as any);
    return provider.getSigner(account?.address);
  }, [client]);
}

async function fetchPositions(safeAddr: string): Promise<Position[]> {
  try {
    const res = await fetch(`/api/pol/poses?user=${safeAddr}`);

    if (!res.ok) {
      const text = await res.text();
      console.error("[fetchPositions] API error:", res.status, text);
      return [];
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      console.warn("[fetchPositions] unexpected format:", data);
      return [];
    }

    return data.map((p: any) => ({
      conditionId: p.conditionId,
      size: Number(p.size ?? 0),
      avgPrice: Number(p.avgPrice ?? 0),
      cashPnl: Number(p.cashPnl ?? 0),
      isClaimed: !!p.isClaimed,
    }));
  } catch (e) {
    console.error("[fetchPositions] failed:", e);
    return [];
  }
}

export default function EventDiv({
  markets,
  series,
}: {
  markets: Market[];
  series: any[];
}) {
  const [selected, setSelected] = useState<Selected>({
    market: null,
    side: null,
  });
  const [amount, setAmount] = useState("");
  const [orderLog, setOrderLog] = useState<string[]>([]);
  const [placing, setPlacing] = useState(false);
  const [polyClient, setPolyClient] = useState<any>(null);

  const [safeAddr, setSafeAddr] = useState<string | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);

  const { address } = useAppKitAccount();
  const signer = useEthersSigner();

  const log = (msg: string) => {
    console.log(msg);
    setOrderLog((prev) => [...prev, msg]);
  };

  const isInitializing = useRef(false);

  const initSession = async () => {
    if (!signer || !address || polyClient) return;

    try {
      log("Fetching Safe from backend...");
      const dbRes = await fetch("/api/getSafeWallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });

      const dbData = await dbRes.json();
      const safe = dbData.safeAddress;

      if (!safe) {
        console.error("no safe address: ", dbData);
        log("No Safe address found for this wallet");
        return;
      }

      setSafeAddr(safe);
      console.log("Safe is found:", safe);
      log(`Safe found: ${safe}`);

      const { initPolymarketClient } = await import("../../../Components/verifyUser");
      log("Initializing Polymarket client...");
      const client = await initPolymarketClient(signer, safe);

      setPolyClient(client);
      log("Polymarket client initialized");

      log("Fetching current positions...");
      const pos = await fetchPositions(safe);
      setPositions(pos);
      log(`Positions loaded: ${pos.length}`);
    } catch (e) {
      console.error("error initialization", e);
      log("Error during session initialization");
    }
  };

  useEffect(() => {
    const start = async () => {
      if (polyClient || isInitializing.current || !address || !signer) return;

      isInitializing.current = true;
      await initSession();
      isInitializing.current = false;
    };

    start();
  }, [address, signer, polyClient]);

  const handlePlaceOrder = async () => {
    if (!polyClient) {
      await initSession();
      return;
    }

    if (!selected.market || !selected.side || !amount) {
      return;
    }

    if (!safeAddr) {
      log("Safe address is not initialized");
      return;
    }

    setPlacing(true);
    setOrderLog([]);

    try {
      const tokenIds = JSON.parse(selected.market.clobTokenIds);
      const tokenId = selected.side === "yes" ? tokenIds[0] : tokenIds[1];

      log(`Loading orderbook for token ${tokenId}...`);
      const book = await polyClient.getOrderBook(tokenId);
      const bestAsk = book?.asks?.[0]?.price;
      const bestBid = book?.bids?.[0]?.price;

      const price =
        selected.side === "yes"
          ? parseFloat(bestAsk ?? "0.5")
          : parseFloat(bestBid ?? "0.5");

      log(
        `Best bid/ask: bid=${bestBid ?? "n/a"} ask=${bestAsk ?? "n/a"}, using price=${price}`,
      );

      const size = parseFloat(amount);
      if (!size || size <= 0) {
        log("Invalid size");
        return;
      }

      log(
        `Creating order: side=${selected.side.toUpperCase()} size=${size} price=${price}`,
      );

      const order = await polyClient.createOrder(
        {
          tokenID: tokenId,
          price,
          side: selected.side === "yes" ? Side.BUY : Side.SELL,
          size,
        },
        {
          tickSize: "0.001",
          negRisk: false,
        },
      );

      log("Order created, posting to CLOB...");

      const resp = await polyClient.postOrder(order, OrderType.GTC);

      log(`Order posted: ${JSON.stringify(resp).slice(0, 200)}...`);

      log("Refreshing positions...");
      const pos = await fetchPositions(safeAddr);
      setPositions(pos);
      log(`Positions updated: ${pos.length}`);
    } catch (e: any) {
      console.error(e);
      log(`Error: ${String(e?.message ?? e)}`);
    } finally {
      setPlacing(false);
    }
  };

  const currentMarketPosition = useMemo(() => {
    if (!selected.market) return null;
    return positions.find((p) => p.conditionId === selected.market!.id) ?? null;
  }, [positions, selected.market]);

  return (
    <div className="flex h-full items-center justify-center w-full">
      <div className="border w-[80vw] h-[40vw] flex shadow-lg">
        <div className="w-full h-full items-center flex flex-col">
          <div className="flex items-center h-[70%] justify-center w-full border">
            <PriceChart series={series} />
          </div>

          <div className="flex flex-col w-full max-h-80 border overflow-y-auto">
            {markets.map((m) => (
              <div
                key={m.id}
                onClick={() => setSelected({ market: m, side: null })}
                className="border p-3 w-full flex justify-between cursor-pointer hover:shadow-lg"
              >
                <p className="hover:scale-103 transition">{m.question}</p>
                <div className="flex gap-5 text-white">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected({ market: m, side: "yes" });
                    }}
                    className="bg-green-500 h-7 cursor-pointer hover:bg-green-400 px-3 rounded-[10px] py-0.5"
                  >
                    YES
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected({ market: m, side: "no" });
                    }}
                    className="bg-red-500 cursor-pointer h-7 hover:bg-red-400 px-3 rounded-[10px] py-0.5"
                  >
                    NO
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full flex flex-col h-full p-15 justify-between">
          <div className="w-full h-[60%] border rounded-[40px] items-center flex justify-center p-5">
            <UnlockTrading>
              {selected.market ? (
                <div className="flex flex-col h-full gap-3 p-5 w-[80%]">
                  <p className="text-lg font-semibold">
                    {selected.market.question}
                  </p>
                  <div className="flex justify-between gap-3 w-full">
                    <button
                      onClick={() =>
                        setSelected((s) => ({ ...s, side: "yes" }))
                      }
                      className={`px-4 py-1.5 rounded-[10px] text-white transition ${
                        selected.side === "yes"
                          ? "bg-green-600 ring-2 ring-green-300"
                          : "bg-green-500 hover:bg-green-400"
                      }`}
                    >
                      YES
                    </button>
                    <button
                      onClick={() =>
                        setSelected((s) => ({ ...s, side: "no" }))
                      }
                      className={`px-4 py-1.5 rounded-[10px] text-white transition ${
                        selected.side === "no"
                          ? "bg-red-600 ring-2 ring-red-300"
                          : "bg-red-500 hover:bg-red-400"
                      }`}
                    >
                      NO
                    </button>
                  </div>

                  {selected.side && (
                    <div className="flex flex-col gap-2 mt-1">
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Amount (USDC)"
                        className="border rounded-[10px] px-3 py-1.5 text-sm bg-transparent"
                      />
                      <button
                        onClick={handlePlaceOrder}
                        disabled={placing}
                        className="bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white rounded-[10px] py-1.5 text-sm"
                      >
                        {placing ? "Placing..." : "Place Order"}
                      </button>
                    </div>
                  )}

                  {orderLog.length > 0 && (
                    <div className="mt-2 bg-black/40 rounded-[10px] p-3 text-xs font-mono flex flex-col gap-1 max-h-40 overflow-y-auto">
                      {orderLog.map((line, i) => (
                        <span key={i}>{line}</span>
                      ))}
                    </div>
                  )}

                  {currentMarketPosition && (
                    <div className="mt-3 bg-black/30 rounded-[10px] p-3 text-xs text-gray-200 font-mono flex flex-col gap-1">
                      <div>
                        Size: {currentMarketPosition.size.toFixed(2)}
                      </div>
                      <div>
                        Avg price: {currentMarketPosition.avgPrice.toFixed(3)}
                      </div>
                      <div>
                        PnL: {currentMarketPosition.cashPnl.toFixed(2)} USDC
                      </div>
                      <div>
                        Status:{" "}
                        {currentMarketPosition.isClaimed
                          ? "Closed/Claimed"
                          : "Open"}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">Select a market...</p>
              )}
            </UnlockTrading>
          </div>

          <div className="p-10 h-[30%] flex items-center justify-center rounded-[40px] w-full border">
            {!polyClient
              ? "Initializing session..."
              : safeAddr
              ? `Terminal is Active • Safe: ${safeAddr.slice(
                  0,
                  6,
                )}...${safeAddr.slice(-4)}`
              : "Terminal is Active"}
          </div>
        </div>
      </div>
    </div>
  );
}