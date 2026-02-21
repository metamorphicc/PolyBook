"use client";

import { useAppKitAccount } from "@reown/appkit/react";
import Header from "./Components/header";
import ScalpTerminal2 from "./Components/ScalpBook";
import Markets from "./Components/Markets";
import Image from "next/image";
import Loading from "./Components/Loading";
import { useEffect, useState, useMemo } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { ethers } from "ethers";

export function useEthersSigner() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  return useMemo(() => {
    if (!isConnected || !walletClient) return null;

    const provider = new ethers.BrowserProvider(walletClient as any);
    return provider.getSigner(address);
  }, [address, isConnected, walletClient]);
}

export default function Home() {
  const signerPromise = useEthersSigner();
  useEffect(() => {
    const run = async () => {
      if (!signerPromise) return;
      const signer = await signerPromise;
      if (!signer) return;
    };
    run();
  }, [signerPromise]);

  const { address, isConnected, status } = useAppKitAccount();
  const [ress, setRess] = useState<any>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState<any>();
  useEffect(() => {
    const parse = async () => {
      try {
        setLoading(true);

        const row = await fetch("/api/markets").then((res) => res.json());

        setRess(row);
        console.log(row);
      } catch (e) {
        console.log("pizda bochok potic: " + e);
      } finally {
        setLoading(false);
      }
    };

    parse();
  }, []);
  const filteredMarkets = useMemo(() => {
    if (!search) return ress;

    const query = search.toLowerCase();

    return ress.filter((market: any) => {
      const titleMatch = market.title?.toLowerCase().includes(query);

      const tagMatch = market.tags?.[0]?.label?.toLowerCase().includes(query);

      return titleMatch || tagMatch;
    });
  }, [search, ress]);
  if (loading) return <Loading />;
  return (
    <div className="flex h-screen flex-col px-3 py-3 box-border gap-3 relative items-center">
      <Header />
      <div className="flex flex-col w-full justify-center items-center">
        <div className="relative group max-w-xl w-full">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400 transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <input
            type="text"
            value={search ?? ""}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full border border-sky-300/50 rounded-2xl py-4 pl-12 pr-12 placeholder:text-gray-600"
          />

          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-white"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 w-full flex justify-center">
        {/* ----- MARKETS PAGE -----*/}
        <div className="w-[90vw] p-4   rounded-md shadow-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            {filteredMarkets.map((market: any) => {
              const data = new Date(market.endDate);
              return (
                <div
                  key={market.id}
                  className="flex flex-col shadow-xl p-4 border border-sky-300/50  rounded-lg min-h-[150px]"
                >
                  <div className="flex items-center gap-3 text-[15px] ">
                    <Image
                      alt="img"
                      width={53}
                      height={53}
                      src={`${market?.image}`}
                      className="rounded-[13px]"
                    ></Image>
                    <div className="flex items-center justify-between w-full">
                      <a
                        href="/profile"
                        className="font-bold hover:scale-[1.05] h-[68px] transition-all duration-100 items-center flex"
                      >
                        {market.title}
                      </a>
                      <button
                        className="border border-sky-300/50 flex items-center rounded-xl h-5 px-2
             w-fit whitespace-nowrap text-[12px]"
                      >
                        {market.tags[0]?.label}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x justify-center">
                    <div className="flex flex-col gap-2 overflow-y-auto pr-1 h-[160px] items-center custom-scrollbar">
                      {[
                        { name: "Alexandria O...", yes: "9¢", no: "92¢" },
                        { name: "Kamala Harris", yes: "6¢", no: "94¢" },
                        { name: "Jon Ossoff", yes: "5¢", no: "95¢" },
                        { name: "Gavin Newsom", yes: "4¢", no: "96¢" },
                        { name: "Pete Buttigieg", yes: "3¢", no: "97¢" },
                      ].map((item, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between py-1 group"
                        >
                          <span className="text-sm text-gray-300 truncate w-24 group-hover:text-white transition-colors">
                            {item.name}
                          </span>

                          <div className="flex gap-2">
                            <button className="bg-green-500/10 hover:bg-green-500/20 text-green-500 text-xs font-bold py-1.5 px-3 rounded-full border border-green-500/20 transition-all">
                              Yes {item.yes}
                            </button>
                            <button className="bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold py-1.5 px-3 rounded-full border border-red-500/20 transition-all">
                              No {item.no}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    End: <div>{data.toLocaleDateString()}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* <ScalpTerminal2 /> */}
        {/* <Markets/> */}
      </div>
    </div>
  );
}
