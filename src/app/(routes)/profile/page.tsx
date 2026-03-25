"use client";
import { useAppKitAccount } from "@reown/appkit/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/app/Components/header";
import Image from "next/image";
import { fetchHistory } from "@/app/Components/TradeHistoryComponent";

export default function Profile() {
  const { address, isConnected } = useAppKitAccount();
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!isConnected || !address) return;

    const getProfileData = async () => {
      setLoading(true);
      try {
        const dbRes = await fetch("/api/getSafeWallet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address }),
        });
        const dbData = await dbRes.json();
        const safeAddr = dbData.proxyAddress;

        if (safeAddr) {
      
          const history = await fetchHistory(safeAddr);
          setTrades(history);
        }
      } catch (e) {
        console.error("Profile data error:", e);
      } finally {
        setLoading(false);
      }
    };

    getProfileData();
  }, [isConnected, address]);

  return (
    <>
      <div className="flex flex-col items-center h-screen py-5 gap-15 overflow-hidden">
        <Header />
        <div className="h-3/4 w-[70vw] shadow-lg hover:scale-101 transition bg-white rounded-xl">
          <div className="px-7 py-4 flex h-full gap-15">
            <div className="w-[70%] flex flex-col">
              <div className="h-[30%] p-3 flex flex-col justify-center">
                <div className="bg-white rounded-[60px] h-[70%] flex items-center px-8 shadow-lg gap-3 border border-gray-100">
                  <Image
                    src={"/logo.png"}
                    alt="img"
                    width={65}
                    height={65}
                    className="rounded-[60px]"
                  />
                  <div className="min-w-55 max-w-60">
                    <p className="font-bold text-[19px]">Morph</p>
                    <div className="flex gap-2">
                      <span className="text-gray-500 text-sm">
                        Say something abt you...
                      </span>
                      <button className="cursor-pointer hover:scale-110 transition">
                        <Image alt="edit" width={12} height={12} src={"/edit.svg"} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-[70%] pb-5">
                <div className="bg-white rounded-[30px] h-full flex flex-col px-5 py-6 shadow-lg border border-gray-50 overflow-y-auto">
                  <h3 className="font-bold mb-4 text-zinc-800">Trading History</h3>
                  
                  {loading ? (
                    <div className="flex justify-center items-center h-full text-gray-400">Loading trades...</div>
                  ) : trades.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {trades.map((trade, index) => (
                        <div key={index} className="flex justify-between items-center p-3 border-b border-gray-50 hover:bg-gray-50 transition rounded-lg">
                          <div className="flex flex-col max-w-[60%]">
                            <span className="text-[13px] font-medium truncate">{trade.title}</span>
                            <span className="text-[10px] text-gray-400">{trade.timestamp}</span>
                          </div>
                          <div className="flex gap-6 items-center">
                            <div className="flex flex-col items-end">
                              <span className={`text-[12px] font-bold ${trade.outcome === 'Yes' ? 'text-green-500' : 'text-red-500'}`}>
                                {trade.outcome}
                              </span>
                              <span className="text-[11px] text-zinc-500">${parseFloat(trade.amount).toFixed(2)}</span>
                            </div>
                            <span className={`text-[11px] px-2 py-1 rounded-full ${trade.status === 'Open' ? 'bg-sky-100 text-sky-600' : 'bg-gray-100 text-gray-500'}`}>
                              {trade.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex justify-center items-center h-full text-gray-400 text-sm italic">
                      No trades found for this Safe.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="w-[30%] h-full flex flex-col">
              <div className="h-[30%] flex items-center justify-center">
                <div className="h-[70%] flex shadow-lg w-full items-center justify-center bg-white rounded-2xl border border-gray-50">
                  <div className="h-full flex flex-col w-full items-center justify-center gap-1">
                    <p className="flex justify-center font-medium">W/R: 90% </p>
                    <p className="flex justify-center text-gray-500 text-sm text-center px-2 font-mono">
                      Safe: {address?.slice(0,6)}...{address?.slice(-4)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="h-[70%]">
                <div className="h-[90%] flex flex-col items-center shadow-lg rounded-[30px] p-5 bg-white border border-gray-50">
                  <span className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Active Markets</span>
                  <div className="flex items-center justify-center h-full text-gray-300 italic text-xs">
                    Coming soon...
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}