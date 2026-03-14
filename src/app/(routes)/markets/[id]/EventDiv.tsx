"use client";

import { useState } from "react";
import PriceChart from "./PriceChart";
import UnlockTrading from "@/app/Components/UnlockTrading";
import { useAppKitAccount } from "@reown/appkit/react";
import { useConnectorClient } from "wagmi";
import { ethers } from "ethers";
import { useMemo } from "react";
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

  const { address } = useAppKitAccount();
  const signer = useEthersSigner();

  const log = (msg: string) => {
    console.log(msg);
    setOrderLog((prev) => [...prev, msg]);
  };

  const handlePlaceOrder = async () => {
    if (!selected.market || !selected.side || !amount) {
      log("❌ Выбери маркет, сторону и введи сумму");
      return;
    }
    if (!signer || !address) {
      log("❌ Кошелёк не подключён");
      return;
    }

    setPlacing(true);
    setOrderLog([]);

    try {
      const savedRaw = localStorage.getItem(`poly_creds_${address}`);
      if (!savedRaw) {
        log("❌ Нет сохранённых creds — переподключись");
        return;
      }
      const { safeAddr } = JSON.parse(savedRaw);
      log(`✅ Safe адрес: ${safeAddr}`);

      log("🔧 Инициализация ClobClient...");
      const { initPolymarketClient } = await import(
        "../../../Components/verifyUser"
      );
      const client = await initPolymarketClient(signer, safeAddr);
      log("✅ ClobClient готов");

      const tokenIds = JSON.parse(selected.market.clobTokenIds);
      const tokenId = selected.side === "yes" ? tokenIds[0] : tokenIds[1];
      log(`📌 TokenId: ${tokenId}`);
      log(`📌 Side: ${selected.side.toUpperCase()}, Amount: $${amount}`);

      log("📊 Получаем стакан...");
      const book = await client.getOrderBook(tokenId);
      const bestAsk = book?.asks?.[0]?.price;
      const bestBid = book?.bids?.[0]?.price;
      log(`📊 Best ask: ${bestAsk}, Best bid: ${bestBid}`);

      const price =
        selected.side === "yes"
          ? parseFloat(bestAsk ?? "0.5")
          : parseFloat(bestBid ?? "0.5");

      log(`💰 Используем цену: ${price}`);

      const orderArgs = {
        tokenID: tokenId,
        price,
        side: selected.side === "yes" ? Side.BUY : Side.SELL,
        size: parseFloat(amount),
      };

      log(`📝 Параметры ордера: ${JSON.stringify(orderArgs)}`);

      log("🚀 Создаём ордер...");
      const order = await client.createOrder(orderArgs);
      log(`✅ Ордер создан: ${JSON.stringify(order)}`);

      log("📤 Отправляем ордер через прокси...");
      const result = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order,
          headers: (client as any).creds, 
        }),
      });
      const data = await result.json();
      log(`🎉 Результат: ${JSON.stringify(data)}`);
    } catch (e: any) {
      log(`❌ Ошибка: ${e?.message ?? String(e)}`);
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

                  {/* Лог ордера */}
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
            Smth
          </div>
        </div>
      </div>
    </div>
  );
}
