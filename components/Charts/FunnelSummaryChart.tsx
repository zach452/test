"use client";
import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import type { ScoredAd, FunnelStage, Classification } from "@/types";
import { CLASSIFICATION_COLORS, FUNNEL_STAGE_LABELS } from "@/lib/constants";

interface Props { ads: ScoredAd[] }

const CLASSIFICATIONS: Classification[] = ["Scale", "Iterate", "Monitor", "Kill", "Insufficient Data"];
const STAGES: FunnelStage[] = ["TOF", "MOF", "BOF", "Retargeting", "Retention", "Unknown"];

export default function FunnelSummaryChart({ ads }: Props) {
  const data = STAGES.map((stage) => {
    const stageAds = ads.filter((a) => a.funnelStage === stage);
    if (stageAds.length === 0) return null;
    const entry: Record<string, number | string> = { stage: stage };
    CLASSIFICATIONS.forEach((cls) => {
      entry[cls] = stageAds.filter((a) => a.classification === cls).length;
    });
    return entry;
  }).filter(Boolean) as Record<string, number | string>[];

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis dataKey="stage" tick={{ fill: "#9ca3af", fontSize: 11 }} />
        <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
        <Tooltip
          contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#fff" }}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: "#9ca3af" }} />
        {CLASSIFICATIONS.map((cls) => (
          <Bar key={cls} dataKey={cls} stackId="a" fill={CLASSIFICATION_COLORS[cls]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
