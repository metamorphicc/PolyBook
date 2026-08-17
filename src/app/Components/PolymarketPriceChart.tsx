"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Asset = "BTC" | "ETH" | "SOL" | "XRP";
type Timeframe = "5m" | "15m" | "1h";
type Outcome = "Up" | "Down";

type HistoryPoint = {
  t: number;
  p: number;
};

type ChartPoint = {
  time: number;
  price: number;
};

type PolymarketPriceChartProps = {
  asset: Asset;
  timeframe: Timeframe;
};

/** The plot box in real pixels, measured from the container. */
type Box = {
  width: number;
  height: number;
};

const PAD = {
  top: 14,
  right: 52,
  bottom: 22,
  left: 12,
};
const LABEL_FONT_SIZE = 10;

function normalizeTimestamp(timestamp: number) {
  return timestamp > 1e12 ? Math.floor(timestamp / 1000) : timestamp;
}

function normalizeHistory(history: HistoryPoint[]) {
  return history
    .map((point) => ({
      time: normalizeTimestamp(Number(point.t)),
      price: Number(point.p),
    }))
    .filter(
      (point) =>
        Number.isFinite(point.time) &&
        Number.isFinite(point.price) &&
        point.price >= 0 &&
        point.price <= 1
    )
    .sort((a, b) => a.time - b.time);
}

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(timestamp * 1000));
}

function buildLinePath(points: ChartPoint[], box: Box) {
  if (points.length === 0) return "";

  const plotWidth = box.width - PAD.left - PAD.right;
  const plotHeight = box.height - PAD.top - PAD.bottom;
  const minTime = points[0].time;
  const maxTime = points[points.length - 1].time;
  const timeRange = Math.max(1, maxTime - minTime);

  return points
    .map((point, index) => {
      const x = PAD.left + ((point.time - minTime) / timeRange) * plotWidth;
      const y = PAD.top + (1 - point.price) * plotHeight;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function buildAreaPath(points: ChartPoint[], box: Box) {
  const linePath = buildLinePath(points, box);
  if (!linePath || points.length === 0) return "";

  const plotWidth = box.width - PAD.left - PAD.right;
  const plotBottom = box.height - PAD.bottom;
  const minTime = points[0].time;
  const maxTime = points[points.length - 1].time;
  const timeRange = Math.max(1, maxTime - minTime);
  const lastX =
    PAD.left + ((points[points.length - 1].time - minTime) / timeRange) * plotWidth;
  const firstX = PAD.left;

  return `${linePath} L ${lastX.toFixed(2)} ${plotBottom} L ${firstX} ${plotBottom} Z`;
}

export default function PolymarketPriceChart({
  asset,
  timeframe,
}: PolymarketPriceChartProps) {
  const [outcome, setOutcome] = useState<Outcome>("Up");
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [box, setBox] = useState<Box>({ width: 0, height: 0 });

  const plotRef = useRef<HTMLDivElement>(null);

  // Measured so the SVG can be drawn at its real pixel size. The alternative —
  // a fixed viewBox stretched to fit — scales every unit by a different factor
  // on each axis, so font sizes and stroke widths come out both too large and
  // horizontally squashed, and by an amount that changes with the window.
  useEffect(() => {
    const node = plotRef.current;
    if (!node) return;

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;

      // Sub-pixel jitter from the flex layout would otherwise re-render the
      // whole path set on every resize frame.
      setBox((current) =>
        Math.abs(current.width - rect.width) < 1 &&
        Math.abs(current.height - rect.height) < 1
          ? current
          : { width: rect.width, height: rect.height },
      );
    });

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const points = useMemo(() => normalizeHistory(history), [history]);
  const linePath = useMemo(() => buildLinePath(points, box), [box, points]);
  const areaPath = useMemo(() => buildAreaPath(points, box), [box, points]);
  const latest = points.at(-1);
  const first = points.at(0);

  const latestX = useMemo(() => {
    if (!latest || points.length === 0) return PAD.left;
    const plotWidth = box.width - PAD.left - PAD.right;
    const minTime = points[0].time;
    const maxTime = points[points.length - 1].time;
    const timeRange = Math.max(1, maxTime - minTime);
    return PAD.left + ((latest.time - minTime) / timeRange) * plotWidth;
  }, [box.width, latest, points]);

  const latestY = latest
    ? PAD.top + (1 - latest.price) * (box.height - PAD.top - PAD.bottom)
    : PAD.top;

  useEffect(() => {
    let cancelled = false;

    const fetchHistory = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/pol/chart?asset=${asset}&timeframe=${timeframe}&outcome=${outcome}`,
          { cache: "no-store" }
        );

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`HTTP ${res.status}: ${text}`);
        }

        const data = await res.json();
        if (cancelled) return;

        setSlug(String(data.slug ?? ""));
        setHistory(Array.isArray(data.history) ? data.history : []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load chart");
          setHistory([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchHistory();
    const interval = window.setInterval(fetchHistory, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [asset, timeframe, outcome]);

  return (
    <div className="flex h-full flex-col theme-terminal-bg">
      <div className="flex h-10 shrink-0 items-center justify-between border-b theme-border px-3 text-xs">
        <div className="min-w-0 truncate theme-muted" title={slug}>
          {asset} / {timeframe === "1h" ? "60m" : timeframe} / {slug || "market"}
          {loading ? " / updating" : ""}
        </div>
        <div className="grid grid-cols-2 overflow-hidden border theme-border">
          {(["Up", "Down"] as Outcome[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setOutcome(item)}
              className={`px-3 py-1 transition ${
                outcome === item
                  ? "bg-[var(--surface-soft)] text-[var(--foreground)]"
                  : "theme-muted hover:bg-[var(--surface-muted)]"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="border-b border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      <div ref={plotRef} className="relative min-h-0 flex-1 overflow-hidden">
        {points.length === 0 && !error ? (
          <div className="flex h-full items-center justify-center text-sm theme-muted">
            No Polymarket price history yet.
          </div>
        ) : box.width > 0 && box.height > 0 ? (
          <svg
            className="h-full w-full"
            viewBox={`0 0 ${box.width} ${box.height}`}
            role="img"
            aria-label={`${asset} ${timeframe} ${outcome} probability chart`}
          >
            <defs>
              <linearGradient id="polyChartFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {[0, 0.25, 0.5, 0.75, 1].map((level) => {
              const y =
                PAD.top + (1 - level) * (box.height - PAD.top - PAD.bottom);
              return (
                <g key={level}>
                  <line
                    x1={PAD.left}
                    x2={box.width - PAD.right}
                    y1={y}
                    y2={y}
                    stroke="var(--terminal-grid)"
                    strokeWidth="1"
                  />
                  <text
                    x={box.width - PAD.right + 8}
                    y={y + 3}
                    fill="var(--muted)"
                    fontSize={LABEL_FONT_SIZE}
                    fontFamily="monospace"
                  >
                    {Math.round(level * 100)}%
                  </text>
                </g>
              );
            })}

            {points.length > 1 && (
              <>
                <path d={areaPath} fill="url(#polyChartFill)" />
                <path
                  d={linePath}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </>
            )}

            {latest && (
              <>
                <line
                  x1={PAD.left}
                  x2={box.width - PAD.right}
                  y1={latestY}
                  y2={latestY}
                  stroke="#38bdf8"
                  strokeDasharray="4 5"
                  strokeOpacity="0.58"
                />
                <circle
                  cx={latestX}
                  cy={latestY}
                  r="2.5"
                  fill="#38bdf8"
                  stroke="var(--terminal-bg)"
                  strokeWidth="1.5"
                />
                <rect
                  x={box.width - PAD.right + 4}
                  y={latestY - 7}
                  width="38"
                  height="14"
                  fill="#38bdf8"
                  rx="2"
                />
                <text
                  x={box.width - PAD.right + 23}
                  y={latestY + 3}
                  fill="#020617"
                  fontSize={LABEL_FONT_SIZE}
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {(latest.price * 100).toFixed(1)}
                </text>
              </>
            )}

            {first && latest && (
              <>
                <text
                  x={PAD.left}
                  y={box.height - 6}
                  fill="var(--muted)"
                  fontSize={LABEL_FONT_SIZE}
                  fontFamily="monospace"
                >
                  {formatTime(first.time)}
                </text>
                <text
                  x={box.width - PAD.right}
                  y={box.height - 6}
                  fill="var(--muted)"
                  fontSize={LABEL_FONT_SIZE}
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  {formatTime(latest.time)}
                </text>
              </>
            )}
          </svg>
        ) : null}
      </div>
    </div>
  );
}
