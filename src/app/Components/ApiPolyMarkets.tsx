"use server";

const GAMMA_HOST = "https://gamma-api.polymarket.com";

type GammaMarket = {
  id: string;
  question?: string;
  title?: string;
  slug: string;
  active: boolean;
  archived: boolean;
  resolved: boolean;
  endDateIso?: string;
};

export default async function ApiPolyMarkets({ query }: { query?: string }) {
  const q = (query ?? "").trim();

  if (!q) {
    return (
      <div className="text-sm text-zinc-400">Type something to search…</div>
    );
  }

  const url = new URL(`${GAMMA_HOST}/public-search`);
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "50");
  url.searchParams.set("active", "true");
  url.searchParams.set("archived", "false");

  const res = await fetch(url.toString(), { cache: "no-store" });

  if (!res.ok) {
    const text = await res.text();
    console.error("Gamma search error", res.status, text);
    return <div>Failed to load markets</div>;
  }

  const json = (await res.json()) as any;
  const markets: GammaMarket[] = json?.events.slice(0, 2) ?? [];
  return (
    <>
      {markets.map((m) => (
        <div key={m.id} className="flex flex-col items-center justify-center">
          <div className="p-3 flex justify-center">{m.title ?? m.question}</div>
          <div className="p-3 flex justify-center">
            <button className="cursor-pointer w-20 h-10 hover:bg-zinc-500 text-green-500">UP</button>
            <button className="cursor-pointer w-20 h-10 hover:bg-zinc-500 text-red-500">DOWN</button>
          </div>
        </div>
      ))}
    </>
  );
}
