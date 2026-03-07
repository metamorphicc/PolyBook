"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type ChartPoint = {
  timestamp: number;
  probability: number;
};

type Series = {
  marketId: string;
  label: string;
  color: string;
  points: ChartPoint[];
};

type UiPoint = {
  time: string;
  [key: string]: number | string;
};

export default function PriceChart({ series }: { series: Series[] }) {
  if (!series.length) return null;

  const length = series[0].points.length;

  const uiData: UiPoint[] = Array.from({ length }).map((_, i) => {
    const basePoint = series[0].points[i];

    const row: UiPoint = {
      time: new Date(basePoint.timestamp * 1000).toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    series.forEach((s, idx) => {
      const p = s.points[i];
      row[`prob${idx}`] = p?.probability || 0 * 100;
    });

    return row;
  });

  return (
    <div style={{ width: "100%", height: 340 }}>
      <ResponsiveContainer>
        <LineChart data={uiData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
          <Tooltip
            formatter={(value, name) => {
              const idx = Number((name as string).replace("prob", ""));
              const label = series[idx]?.label ?? `Market ${idx + 1}`;
              return [`${value}%`, label];
            }}
          />
          <Legend />
          {series.map((s, idx) => (
            <Line
              key={s.marketId}
              type="monotone"
              dataKey={`prob${idx}`}
              stroke={s.color}
              dot={false}
              name={s.label}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
