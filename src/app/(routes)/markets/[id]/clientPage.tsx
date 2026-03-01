import PriceChart from "./PriceChart";
import { parseToChartData } from "@/app/Components/parseData";

export default async function Page({ params }: { params: { id: string } }) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/graphics?id=${params.id}`,
    { cache: "no-store" }
  );
  const historyJson = await res.json();
  const chartData = parseToChartData(historyJson);

  return <PriceChart data={chartData} />;
}
