import Header from "@/app/Components/header";
import { GAMMA_HOST } from "../../../../app/share/main";
import { parse } from "path/posix";
import { parseToChartData } from "../../../../app/Components/parseData";
import PriceChart from "./PriceChart";
import EventDiv from "./EventDiv";

type Props = { params: { id: string } };
type RawPoint = { t: number; p: number };

type ApiResponse = { history: RawPoint[] };

type ChartPoint = { timestamp: number; probability: number };
const id = "";

export default async function marketsId({ params }: Props) {
  const param = await params;
  const marketId = param.id;
  const rows = await fetch(`${GAMMA_HOST}/events/${marketId}`);
  const jsonRows = await rows.json();
  const markets = jsonRows.markets;

  const targetMarkets = markets.slice(0, 3);

  const colors = ["#22c55e", "#3b82f6", "#ef4444"];
  const series = await Promise.all(
    targetMarkets.map(async (m: any, idx: any) => {
      const [yesTokenId] = JSON.parse(m.clobTokenIds) as string[];

      const historyRes = await fetch(
        `http://localhost:3002/api/graphics?id=${yesTokenId}`,
        { cache: "no-store" }
      );
      const json = await historyRes.json();
      const points = parseToChartData(json); 

      return {
        marketId: m.id,
        label: m.groupItemTitle ?? m.question, 
        color: colors[idx % colors.length],
        points,
      };
    })
  );


  const market = jsonRows.markets[0];
  const market2 = jsonRows.markets[1];
  const market3 = jsonRows.markets[2];

  const tokenId = market ? JSON.parse(market?.clobTokenIds) : "123";
  const tokenId2 = market2 ?  JSON.parse(market2?.clobTokenIds) : "123";
  const tokenId3 = market3 ? JSON.parse(market3?.clobTokenIds) : "123";

  const graphRow = await fetch(
    `http://localhost:3002/api/graphics?id=${tokenId[0]}`
  );
  const json = await graphRow.json();
  const graphRow2 = await fetch(
    `http://localhost:3002/api/graphics?id=${tokenId2[0]}`
  );
  const json2 = await graphRow2.json();
  const graphRow3 = await fetch(
    `http://localhost:3002/api/graphics?id=${tokenId3[0]}`
  );
  const json3 = await graphRow3.json();

  const chartData: ChartPoint[] = parseToChartData(json);
  const chartData2: ChartPoint[] = parseToChartData(json2);
  const chartData3: ChartPoint[] = parseToChartData(json3);
  
  return (
    <div className="relative w-full ">
      <div className="h-screen flex flex-col w-full p-3 items-center justify-center">
        <Header />

        {/* <div className="flex h-full items-center justify-center w-full">
          <div className="border w-[80vw] h-[40vw] flex shadow-lg">
            <div className="w-full h-full items-center  flex flex-col">
              <div className="flex items-center h-[70%] justify-center w-full border">
                <PriceChart series={series} />

              </div>
              <div className="flex flex-col w-full max-h-80 border  overflow-y-auto ">
                {jsonRows.markets.map((m: any) => (
                  <div
                    key={m.id}
                    className="border p-3 w-full flex justify-between cursor-pointer hover:shadow-lg"
                  >
                    <div>
                      <p className="hover:scale-103 transition">{m.question}</p>
                    </div>
                    <div className="flex gap-5 text-white">
                      <button className="bg-green-500 h-7 cursor-pointer hover:bg-green-400 px-3 rounded-[10px] py-0.5 ">
                        YES
                      </button>
                      <button className="bg-red-500 cursor-pointer h-7 hover:bg-red-400 px-3 rounded-[10px] py-0.5">
                        NO
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="w-full flex flex-col  h-full p-15 justify-between">
              <div className=" w-full h-[60%] w-[50%] border rounded-[40px] items-center flex justify-center p-5">
                order window
              </div>
              <div className="p-10 h-[30%] flex items-center justify-center rounded-[40px] flex w-full border">
                Smth
              </div>
            </div>
          </div>
        </div> */}
        <EventDiv markets={jsonRows.markets} series={series} />
      </div>
    </div>
  );
}
