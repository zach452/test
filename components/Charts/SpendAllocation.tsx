"use client";
import React from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { ScoredAd, Classification } from "@/types";
import { CLASSIFICATION_COLORS } from "@/lib/constants";

interface Props { ads: ScoredAd[] }

export default function SpendAllocation({ ads }: Props) {
  const totalSpend = ads.reduce((s, a) => s + (a.spend ?? 0), 0);

  const byClass = Object.entries(
    ads.reduce((acc, ad) => {
      const cls = ad.classification;
      acc[cls] = (acc[cls] ?? 0) + (ad.spend ?? 0);
      return acc;
    }, {} as Record<Classification, number>)
  ).map(([cls, spend]) => ({
    name: cls,
    value: spend,
    pct: totalSpend > 0 ? (spend / totalSpend) * 100 : 0,
  }));

  return (
    <div className="flex flex-col items-center gap-4">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={byClass}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
          >
            {byClass.map((entry) => (
              <Cell key={entry.name} fill={CLASSIFICATION_COLORS[entry.name as Classification]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [`$${Number(value).toFixed(2)}`, "Spend"]}
            contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8, fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-1.5 w-full">
        {byClass.sort((a, b) => b.value - a.value).map((entry) => (
          <div key={entry.name} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: CLASSIFICATION_COLORS[entry.name as Classification] }} />
            <span className="text-gray-300 text-xs flex-1">{entry.name}</span>
            <span className="text-gray-400 text-xs">${entry.value.toFixed(0)}</span>
            <span className="text-gray-500 text-xs w-10 text-right">{entry.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
