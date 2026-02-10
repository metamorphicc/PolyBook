import Image from "next/image";
import GetMarkets from "./Components/GetMarkets";
import ScalpOrderbook from "./Components/ScalpBook";

export default function Home() {
  return <div className="flex h-screen flex-col px-5 py-3 box-border">
  <div className="px-4 py-2 border rounded-full mb-3">
    <p className="flex gap-4 text-[25px]">
      <Image
        src="/logo.png"
        alt="logo"
        width={20}
        height={20}
        className="object-contain"
      />
      PolyBooks
    </p>
  </div>

  <div className="flex-1 bg-zinc-900">
    <GetMarkets/>
    <ScalpOrderbook/>
  </div>
</div>
}
