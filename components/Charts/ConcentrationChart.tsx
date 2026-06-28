"use client";
import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import type { ScoredAd } from "@/types";

interface Props { ads: ScoredAd[] }

export default function ConcentrationChart({ ads }: Props) {
  const sorted = [...ads].sort((a, b) => (b.spend ?? 0) - (a.spend ?? 0));
  const total = sorted.reduce((s, a) => s + (a.spend ?? 0), 0);
  if (total === 0) return <p className="text-gray-500 text-sm">No spend data.</p>;

  const buckets = [
    { label: "Top 1%", from: 0, to: 0.01 },
    { label: "2–5%", from: 0.01, to: 0.05 },
    { label: "5–10%", from: 0.05, to: 0.10 },
    { label: "10–20%", from: 0.10, to: 0.20 },
    { label: "20–50%", from: 0.20, to: 0.50 },
    { label: "50–100%", from: 0.50, to: 1.0 },
  ];

  const data = buckets.map(({ label, from, to }) => {
    const fromIdx = Math.floor(from * sorted.length);
    const toIdx = Math.ceil(to * sorted.length);
    const slice = sorted.slice(fromIdx, toIdx);
    const spend = slice.reduce((s, a) => s + (a.spend ?? 0), 0);
    return { label, spend, pct: (spend / total) * 100, count: slice.length };
  });

  const colors = ["#7c3aed", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe", "#ede9fe"];

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="label" tick={{ fill: "#9ca3af", fontSize: 10 }} />
          <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fill: "#9ca3af", fontSize: 11 }} />
          <Tooltip
            formatter={(value) => [`${Number(value).toFixed(1)}%`, "% of Total Spend"]}
            contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#fff" }}
          />
          <Bar dataKey="pct" name="% Spend">
            {data.map((_, i) => <Cell key={i} fill={colors[i]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-500 text-center">Spend concentration by ad rank (sorted by spend descending)</p>
    </div>
  );
}
