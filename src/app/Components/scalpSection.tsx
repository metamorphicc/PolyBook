"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Loading from "../Components/Loading";
import Image from "next/image";
import { routerServerGlobal } from "next/dist/server/lib/router-utils/router-server-context";
export default function ScalpSection() {
  const router = useRouter();
  const [btc15m, setBtc15m] = useState<any>(null);
  const [btc5m, setBtc5m] = useState<any>([]);
  useEffect(() => {
    const getBtcMarkets15m = async () => {
      const row = await fetch("/api/btc-parse/btc-15m-parse");
      const jsonRow = await row.json();
      setBtc15m(jsonRow);
    };
    const getBtcMarkets5m = async () => {
      const row = await fetch("/api/btc-parse/btc-5m-parse");
      const jsonRow = await row.json();
      setBtc5m(jsonRow);
    };
    getBtcMarkets15m();
    getBtcMarkets5m();
  }, []);

  if (!btc15m) return <Loading />;

  return (
    <div className="flex flex-col w-full">
      <div
        onClick={() => {
          router.push(`/markets/${btc5m.id}`);
        }}
        className="flex items-center gap-3 px-5 py-3 border-b border-gray-200 hover:bg-zinc-100 cursor-pointer"
      >
        <Image src={btc15m.icon} alt="img" width={30} height={30} />
        <span className="truncate">{btc15m.title}</span>
      </div>
      <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-200 hover:bg-zinc-100 cursor-pointer">
        <Image src={btc5m.icon || ""} alt="img" width={30} height={30} />
        <span className="truncate">{btc5m.title}</span>
      </div>
      <div className="flex h-full items-center gap-3 px-5 py-3 border-b border-gray-200 hover:bg-zinc-100 cursor-pointer">
        <Image src={btc15m.icon} alt="img" width={30} height={30} />
        <span className="truncate">{btc15m.title}</span>
      </div>
      <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-200 hover:bg-zinc-100 cursor-pointer">
        <Image src={btc5m.icon} alt="img" width={30} height={30} />
        <span className="truncate">{btc5m.title}</span>
      </div>
    </div>
  );
}
