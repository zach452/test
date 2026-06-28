"use client";
import React, { useState } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import type { ScoredAd, FunnelStage } from "@/types";
import { CLASSIFICATION_COLORS, FUNNEL_STAGE_LABELS } from "@/lib/constants";
import { eff } from "@/lib/metrics";

interface Props {
  ads: ScoredAd[];
}

const ALL_STAGES: FunnelStage[] = ["TOF", "MOF", "BOF", "Retargeting", "Retention", "Unknown"];

function getPrimaryKPI(stage: FunnelStage, ad: ScoredAd): number | undefined {
  switch (stage) {
    case "TOF": return eff.hookRate(ad) ?? eff.ctr(ad);
    case "MOF": return eff.lpvRate(ad) ?? eff.ctr(ad);
    case "BOF": return eff.roas(ad) ?? (eff.cpa(ad) ? 1 / (eff.cpa(ad)! / 50) : undefined);
    case "Retargeting": return eff.roas(ad);
    case "Retention": return eff.roas(ad);
    default: return ad.score / 100;
  }
}

function getYLabel(stage: FunnelStage): string {
  switch (stage) {
    case "TOF": return "Hook Rate / CTR";
    case "MOF": return "LPV Rate / CTR";
    case "BOF": return "ROAS";
    case "Retargeting": return "ROAS";
    case "Retention": return "ROAS";
    default: return "Score";
  }
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: ScoredAd }[] }) => {
  if (!active || !payload?.length) return null;
  const ad = payload[0].payload;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs max-w-xs shadow-xl">
      <p className="text-white font-medium mb-1 truncate">{ad.adName ?? ad.campaignName ?? "Ad"}</p>
      <p className="text-gray-400">Stage: <span className="text-white">{ad.funnelStage}</span></p>
      <p className="text-gray-400">Classification: <span style={{ color: CLASSIFICATION_COLORS[ad.classification] }}>{ad.classification}</span></p>
      <p className="text-gray-400">Score: <span className="text-white">{ad.score}</span></p>
      <p className="text-gray-400">Spend: <span className="text-white">${(ad.spend ?? 0).toFixed(2)}</span></p>
      <p className="text-gray-400">Confidence: <span className="text-white">{ad.confidence}</span></p>
    </div>
  );
};

export default function DecisionMatrix({ ads }: Props) {
  const [stageFilter, setStageFilter] = useState<FunnelStage | "All">("All");

  const filtered = stageFilter === "All" ? ads : ads.filter((a) => a.funnelStage === stageFilter);

  const data = filtered
    .filter((a) => (a.spend ?? 0) > 0)
    .map((ad) => ({
      ...ad,
      x: Math.log10(Math.max(1, ad.spend ?? 1)),
      y: (getPrimaryKPI(ad.funnelStage, ad) ?? 0) * 100,
      z: Math.sqrt(ad.spend ?? 1),
    }));

  const activeStage = stageFilter === "All" ? null : stageFilter;
  const yLabel = activeStage ? getYLabel(activeStage) : "Primary KPI (×100)";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {(["All", ...ALL_STAGES] as (FunnelStage | "All")[]).map((s) => (
          <button
            key={s}
            onClick={() => setStageFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              stageFilter === s ? "bg-violet-600 text-white" : "bg-gray-800 text-gray-400 hover:text-gray-200"
            }`}
          >
            {s === "All" ? "All Stages" : s}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            dataKey="x"
            type="number"
            name="Spend (log)"
            domain={["auto", "auto"]}
            tick={{ fill: "#6b7280", fontSize: 11 }}
            tickFormatter={(v) => `$${Math.pow(10, v).toFixed(0)}`}
            label={{ value: "Spend (log scale)", position: "insideBottom", offset: -10, fill: "#6b7280", fontSize: 11 }}
          />
          <YAxis
            dataKey="y"
            type="number"
            name={yLabel}
            tick={{ fill: "#6b7280", fontSize: 11 }}
            label={{ value: yLabel, angle: -90, position: "insideLeft", offset: 10, fill: "#6b7280", fontSize: 11 }}
          />
          <ZAxis dataKey="z" range={[20, 300]} />
          <Tooltip content={<CustomTooltip />} />
          <Scatter data={data} name="Ads">
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={CLASSIFICATION_COLORS[entry.classification]}
                fillOpacity={0.8}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex gap-4 flex-wrap justify-center">
        {Object.entries(CLASSIFICATION_COLORS).map(([cls, color]) => (
          <div key={cls} className="flex items-center gap-1.5 text-xs text-gray-400">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            {cls}
          </div>
        ))}
      </div>
    </div>
  );
}
