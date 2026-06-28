"use client";
import React from "react";
import type { ScoredAd, Classification } from "@/types";
import { CLASSIFICATION_COLORS } from "@/lib/constants";

interface Props { ads: ScoredAd[] }

export default function SummaryCards({ ads }: Props) {
  const total = ads.length;
  const totalSpend = ads.reduce((s, a) => s + (a.spend ?? 0), 0);
  const totalRevenue = ads.reduce((s, a) => s + (a.revenue ?? (a.roas != null && a.spend != null ? a.roas * a.spend : 0)), 0);
  const overallRoas = totalSpend > 0 ? totalRevenue / totalSpend : undefined;

  const classCounts = ads.reduce((acc, a) => {
    acc[a.classification] = (acc[a.classification] ?? 0) + 1;
    return acc;
  }, {} as Record<Classification, number>);

  const scaleSpend = ads.filter((a) => a.classification === "Scale").reduce((s, a) => s + (a.spend ?? 0), 0);
  const killSpend = ads.filter((a) => a.classification === "Kill").reduce((s, a) => s + (a.spend ?? 0), 0);

  const cards = [
    { label: "Total Ads", value: total.toString(), sub: `${ads.filter((a) => a.confidence === "Insufficient").length} insufficient data` },
    { label: "Total Spend", value: `$${totalSpend.toFixed(0)}`, sub: overallRoas != null ? `${overallRoas.toFixed(2)}× blended ROAS` : "ROAS unavailable" },
    { label: "Scale", value: (classCounts["Scale"] ?? 0).toString(), sub: `$${scaleSpend.toFixed(0)} in scale ads`, color: "#22c55e" },
    { label: "Kill", value: (classCounts["Kill"] ?? 0).toString(), sub: `$${killSpend.toFixed(0)} at risk`, color: "#ef4444" },
    { label: "Iterate", value: (classCounts["Iterate"] ?? 0).toString(), sub: `${classCounts["Monitor"] ?? 0} monitoring`, color: "#f59e0b" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((card) => (
        <div key={card.label} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
          <div className="text-gray-400 text-xs mb-1">{card.label}</div>
          <div className="text-2xl font-bold" style={{ color: card.color ?? "#fff" }}>{card.value}</div>
          <div className="text-gray-500 text-xs mt-1">{card.sub}</div>
        </div>
      ))}
    </div>
  );
}
