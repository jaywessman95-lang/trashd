"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { ChartEntry } from "@/lib/admin/stats";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmtTick(d: string) {
  const [, m, day] = d.split("-");
  return `${MONTHS[parseInt(m, 10) - 1]} ${parseInt(day, 10)}`;
}

const SERIES: { key: keyof ChartEntry; label: string; color: string; grad: string }[] = [
  { key: "realtors",          label: "Realtors added",        color: "#0f766e", grad: "gradR"  },
  { key: "operators",         label: "Operators added",        color: "#2563eb", grad: "gradO"  },
  { key: "sent",              label: "Emails sent",            color: "#f59e0b", grad: "gradS"  },
  { key: "verifiedRealtors",  label: "Realtors verified",      color: "#10b981", grad: "gradVR" },
  { key: "verifiedOperators", label: "Junk/Movers verified",   color: "#8b5cf6", grad: "gradVO" },
];

export function AdminStatsChart({ data }: { data: ChartEntry[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return <div className="admin-chart-placeholder" />;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <defs>
          {SERIES.map(({ color, grad }) => (
            <linearGradient key={grad} id={grad} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={0.28} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={fmtTick}
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          interval={4}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
          width={28}
          allowDecimals={false}
        />
        <Tooltip
          labelFormatter={(d) => fmtTick(String(d))}
          formatter={(value, key) => {
            const s = SERIES.find((x) => x.key === key);
            return [value ?? 0, s?.label ?? String(key)];
          }}
          contentStyle={{ fontSize: 13, borderRadius: 8, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px #0f172a14" }}
          cursor={{ stroke: "#0f766e22", strokeWidth: 1 }}
        />
        <Legend
          formatter={(key: string) => SERIES.find((x) => x.key === key)?.label ?? key}
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
        />
        {SERIES.map(({ key, color, grad }) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            stroke={color}
            strokeWidth={2}
            fill={`url(#${grad})`}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
