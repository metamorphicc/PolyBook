"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import PriceChart from "./PriceChart";
import UnlockTrading from "@/app/Components/UnlockTrading";
import { useAppKitAccount } from "@reown/appkit/react";
import { useConnectorClient } from "wagmi";
import { ethers } from "ethers";
import { Side } from "@polymarket/clob-client";

type Market = { id: string; question: string; clobTokenIds: string };
type Selected = { market: Market | null; side: "yes" | "no" | null };

function useEthersSigner() {
  const { data: client } = useConnectorClient();
  return useMemo(() => {
    if (!client) return undefined;
    const { account, transport } = client;
    const provider = new ethers.providers.Web3Provider(transport as any);
    return provider.getSigner(account?.address);
  }, [client]);
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

  const { address } = useAppKitAccount();
  const signer = useEthersSigner();

  const log = (msg: string) => {
    console.log(msg);
    setOrderLog((prev) => [...prev, msg]);
  };


  const initSession = async () => {
    if (!signer || !address || polyClient) return;

    try {
      const dbRes = await fetch("/api/getSafeWallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      
      const dbData = await dbRes.json();
      
      const safeAddr = dbData.safeAddress;

      if (!safeAddr) {
        console.error("no address: ", dbData);
        return;
      }

      console.log("Safe is found:", safeAddr);

      const { initPolymarketClient } = await import("../../../Components/verifyUser");
      const client = await initPolymarketClient(signer, safeAddr);
      
      setPolyClient(client);
    } catch (e: any) {
      console.error("error initialization", e);
    }
  };

  const isInitializing = useRef(false);

useEffect(() => {
  const start = async () => {
    if (polyClient || isInitializing.current || !address || !signer) return;

    isInitializing.current = true;
    await initSession();
    isInitializing.current = false;
  };

  start();
}, [address, signer]);

  const handlePlaceOrder = async () => {
    if (!polyClient) {
      await initSession();
      return;
    }

    if (!selected.market || !selected.side || !amount) {
      return;
    }

    setPlacing(true);
    setOrderLog([]);

    try {
      const tokenIds = JSON.parse(selected.market.clobTokenIds);
      const tokenId = selected.side === "yes" ? tokenIds[0] : tokenIds[1];
      
      const book = await polyClient.getOrderBook(tokenId);
      const bestAsk = book?.asks?.[0]?.price;
      const bestBid = book?.bids?.[0]?.price;

      const price = selected.side === "yes"
          ? parseFloat(bestAsk ?? "0.5")
          : parseFloat(bestBid ?? "0.5");

      const order = await polyClient.createOrder({
        tokenID: tokenId,
        price,
        side: selected.side === "yes" ? Side.BUY : Side.SELL,
        size: parseFloat(amount),
      });

      const result = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order,
          headers: polyClient.creds, 
        }),
      });
      
      const data = await result.json();
    } catch (e: any) {
      console.error(e);
    } finally {
      setPlacing(false);
    }
  };

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
                      onClick={() => setSelected((s) => ({ ...s, side: "yes" }))}
                      className={`px-4 py-1.5 rounded-[10px] text-white transition ${
                        selected.side === "yes"
                          ? "bg-green-600 ring-2 ring-green-300"
                          : "bg-green-500 hover:bg-green-400"
                      }`}
                    >
                      YES
                    </button>
                    <button
                      onClick={() => setSelected((s) => ({ ...s, side: "no" }))}
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
                </div>
              ) : (
                <p className="text-gray-400 text-sm">Select a market...</p>
              )}
            </UnlockTrading>
          </div>

          <div className="p-10 h-[30%] flex items-center justify-center rounded-[40px] w-full border">
            {!polyClient ? "Initializing session..." : "Terminal is Active"}
          </div>
        </div>
      </div>
    </div>
  );
}