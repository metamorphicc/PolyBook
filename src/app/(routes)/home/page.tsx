"use client";

import { useAppKitAccount } from "@reown/appkit/react";
import Header from "../../Components/header";
import ScalpTerminal2 from "../../Components/ScalpBook";
import Markets from "../../markets/page";
import Image from "next/image";
import Loading from "../../Components/Loading";
import { useEffect, useState, useMemo } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { ethers } from "ethers";
import TrendingSearch from "./trendingSearch";


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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState<any>();

  return (
    <div className="flex h-screen flex-col px-3 py-3 box-border gap-3 relative items-center">
      <Header />
      <div className="w-[90vw] min-h-88  flex items-center flex-shrink-0 gap-5">
        <div className=" h-full w-full shadow-lg">
          <TrendingSearch />
        </div>
        <div className=" h-full w-full  flex flex-col justify-between">
          <div className="w-full h-[60%] shadow-lg"></div>
          <div className="w-full h-[30%] shadow-lg"></div>
        </div>
      </div>
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
        <Markets searchQuery={search} />
          
        {/* <ScalpTerminal2 /> */}
        {/* <Markets/> */}
      </div>
    </div>
  );
}
