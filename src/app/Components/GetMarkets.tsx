import ApiPolyMarkets from "./ApiPolyMarkets";

export default function GetMarkets() {
  return (
    <div className="flex border border-zinc-700 p-4 rounded-md items-center justify-center">
      {/* <ApiPolyMarkets query="trump"/>
       */}
       <p className="text-[24px]">Market: Will the price of Bitcoin be above $70,000 on February 8?</p>
    </div>
  );
}
