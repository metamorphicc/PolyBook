import { NextRequest, NextResponse } from "next/server";

const DATA_API_URL = "https://data-api.polymarket.com";

type RawPosition = {
  title?: string;
  slug?: string;
  eventSlug?: string;
  icon?: string;
  outcome?: string;
  size?: number;
  avgPrice?: number;
  curPrice?: number;
  initialValue?: number;
  currentValue?: number;
  cashPnl?: number;
  realizedPnl?: number;
  percentPnl?: number;
  endDate?: string;
};

type PortfolioPosition = {
  title: string;
  slug: string;
  eventSlug: string;
  icon: string;
  outcome: string;
  size: number;
  avgPrice: number;
  curPrice: number;
  currentValue: number;
  cashPnl: number;
  realizedPnl: number;
  percentPnl: number;
  status: "Open" | "Closed";
  endDate: string;
};

export async function GET(req: NextRequest) {
  const user = req.nextUrl.searchParams.get("user");

  if (!user || !/^0x[a-fA-F0-9]{40}$/.test(user)) {
    return NextResponse.json(
      { error: "valid user address is required" },
      { status: 400 },
    );
  }

  try {
    const [openPositions, closedPositions, valueRows] = await Promise.all([
      fetchPositions("positions", user),
      fetchPositions("closed-positions", user),
      fetchValue(user),
    ]);

    const active = openPositions
      .filter((position) => Number(position.size ?? 0) > 0.01)
      .map((position) => normalizePosition(position, "Open"));

    const closed = closedPositions.map((position) =>
      normalizePosition(position, "Closed"),
    );

    const history = [...active, ...closed].sort((a, b) => {
      const aTime = a.endDate ? new Date(a.endDate).getTime() : 0;
      const bTime = b.endDate ? new Date(b.endDate).getTime() : 0;
      return bTime - aTime;
    });

    const closedWithPnl = closed.filter(
      (position) =>
        Number.isFinite(position.cashPnl) || Number.isFinite(position.realizedPnl),
    );
    const wins = closedWithPnl.filter(
      (position) => position.cashPnl + position.realizedPnl > 0,
    ).length;
    const losses = closedWithPnl.filter(
      (position) => position.cashPnl + position.realizedPnl < 0,
    ).length;
    const settled = wins + losses;

    return NextResponse.json({
      tradingWalletAddress: user,
      value: valueRows[0]?.value ?? 0,
      active,
      history,
      stats: {
        activeCount: active.length,
        historyCount: history.length,
        wins,
        losses,
        winRate: settled > 0 ? Math.round((wins / settled) * 100) : null,
        totalPnl: history.reduce(
          (sum, position) => sum + position.cashPnl + position.realizedPnl,
          0,
        ),
      },
    });
  } catch (e: unknown) {
    console.error("[/api/profile/portfolio] error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}

async function fetchPositions(endpoint: "positions" | "closed-positions", user: string) {
  const url = `${DATA_API_URL}/${endpoint}?user=${encodeURIComponent(
    user,
  )}&limit=500&sizeThreshold=0`;
  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${endpoint} failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as unknown;
  return Array.isArray(data) ? (data as RawPosition[]) : [];
}

async function fetchValue(user: string): Promise<Array<{ value: number }>> {
  const res = await fetch(`${DATA_API_URL}/value?user=${user}`, {
    cache: "no-store",
  });

  if (!res.ok) return [];

  const data = (await res.json()) as unknown;
  return Array.isArray(data) ? (data as Array<{ value: number }>) : [];
}

function normalizePosition(
  position: RawPosition,
  status: "Open" | "Closed",
): PortfolioPosition {
  return {
    title: position.title ?? "Unknown market",
    slug: position.slug ?? "",
    eventSlug: position.eventSlug ?? "",
    icon: position.icon ?? "",
    outcome: position.outcome ?? "",
    size: Number(position.size ?? 0),
    avgPrice: Number(position.avgPrice ?? 0),
    curPrice: Number(position.curPrice ?? 0),
    currentValue: Number(position.currentValue ?? 0),
    cashPnl: Number(position.cashPnl ?? 0),
    realizedPnl: Number(position.realizedPnl ?? 0),
    percentPnl: Number(position.percentPnl ?? 0),
    status,
    endDate: position.endDate ?? "",
  };
}
