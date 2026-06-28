"use client";
import React from "react";
import type { ScoredAd, FunnelStage } from "@/types";
import type { AppConfig } from "@/types";
import { eff } from "@/lib/metrics";

interface Props { ads: ScoredAd[]; config: AppConfig }

interface Row {
  stage: FunnelStage;
  kpi: string;
  target: string;
  actual: string;
  gap: string;
  status: "good" | "warn" | "bad";
  rec: string;
}

function avg(vals: (number | undefined)[]): number | undefined {
  const clean = vals.filter((v) => v != null) as number[];
  if (!clean.length) return undefined;
  return clean.reduce((a, b) => a + b, 0) / clean.length;
}

function fmt(v: number | undefined, pct = false, prefix = ""): string {
  if (v == null) return "—";
  if (pct) return `${(v * 100).toFixed(1)}%`;
  return `${prefix}${v.toFixed(2)}`;
}

export default function KPIHealthTable({ ads, config }: Props) {
  const stages: FunnelStage[] = ["TOF", "MOF", "BOF", "Retargeting", "Retention"];

  const rows: Row[] = [];

  stages.forEach((stage) => {
    const stageAds = ads.filter((a) => a.funnelStage === stage);
    if (!stageAds.length) return;

    if (stage === "TOF") {
      const b = config.benchmarks.TOF;
      const actualHook = avg(stageAds.map(eff.hookRate));
      const actualCpm = avg(stageAds.map(eff.cpm));
      const actualCtr = avg(stageAds.map(eff.ctr));
      rows.push({
        stage, kpi: "Hook Rate", target: `${(b.targetHookRate * 100).toFixed(0)}%`,
        actual: fmt(actualHook, true),
        gap: actualHook != null ? `${((actualHook - b.targetHookRate) * 100).toFixed(1)}%` : "—",
        status: actualHook != null ? (actualHook >= b.targetHookRate ? "good" : actualHook >= b.targetHookRate * 0.7 ? "warn" : "bad") : "bad",
        rec: actualHook != null && actualHook < b.targetHookRate ? "Test stronger opening 3 seconds" : "Maintain current creative approach",
      });
      rows.push({
        stage, kpi: "CPM", target: `$${b.targetCpm}`,
        actual: fmt(actualCpm, false, "$"),
        gap: actualCpm != null ? `$${(actualCpm - b.targetCpm).toFixed(2)}` : "—",
        status: actualCpm != null ? (actualCpm <= b.targetCpm ? "good" : actualCpm <= b.targetCpm * 1.5 ? "warn" : "bad") : "bad",
        rec: actualCpm != null && actualCpm > b.targetCpm ? "Review audience targeting and bid strategy" : "Efficiency looks healthy",
      });
    }
    if (stage === "MOF") {
      const b = config.benchmarks.MOF;
      const actualCpc = avg(stageAds.map(eff.cpc));
      const actualLpv = avg(stageAds.map(eff.lpvRate));
      rows.push({
        stage, kpi: "CPC", target: `$${b.targetCpc}`,
        actual: fmt(actualCpc, false, "$"),
        gap: actualCpc != null ? `$${(actualCpc - b.targetCpc).toFixed(2)}` : "—",
        status: actualCpc != null ? (actualCpc <= b.targetCpc ? "good" : actualCpc <= b.targetCpc * 1.5 ? "warn" : "bad") : "bad",
        rec: actualCpc != null && actualCpc > b.targetCpc ? "Improve ad relevance score or audience match" : "CPC on target",
      });
      rows.push({
        stage, kpi: "LPV Rate", target: `${(b.targetLpvRate * 100).toFixed(0)}%`,
        actual: fmt(actualLpv, true),
        gap: actualLpv != null ? `${((actualLpv - b.targetLpvRate) * 100).toFixed(1)}%` : "—",
        status: actualLpv != null ? (actualLpv >= b.targetLpvRate ? "good" : actualLpv >= b.targetLpvRate * 0.7 ? "warn" : "bad") : "bad",
        rec: actualLpv != null && actualLpv < b.targetLpvRate ? "Improve landing page speed or align ad-to-page message" : "LPV rate healthy",
      });
    }
    if (stage === "BOF" || stage === "Retargeting" || stage === "Retention") {
      const b = config.benchmarks[stage === "BOF" ? "BOF" : stage === "Retargeting" ? "Retargeting" : "Retention"];
      const actualCpa = avg(stageAds.map(eff.cpa));
      const actualRoas = avg(stageAds.map(eff.roas));
      rows.push({
        stage, kpi: "CPA", target: `$${(b as typeof config.benchmarks.BOF).targetCpa}`,
        actual: fmt(actualCpa, false, "$"),
        gap: actualCpa != null ? `$${(actualCpa - (b as typeof config.benchmarks.BOF).targetCpa).toFixed(2)}` : "—",
        status: actualCpa != null ? (actualCpa <= (b as typeof config.benchmarks.BOF).targetCpa ? "good" : actualCpa <= (b as typeof config.benchmarks.BOF).targetCpa * 1.5 ? "warn" : "bad") : "bad",
        rec: actualCpa != null && actualCpa > (b as typeof config.benchmarks.BOF).targetCpa ? "Review offer, audience, and creative angle" : "CPA on target",
      });
      rows.push({
        stage, kpi: "ROAS", target: `${(b as typeof config.benchmarks.BOF).targetRoas}×`,
        actual: actualRoas != null ? `${actualRoas.toFixed(2)}×` : "—",
        gap: actualRoas != null ? `${(actualRoas - (b as typeof config.benchmarks.BOF).targetRoas).toFixed(2)}×` : "—",
        status: actualRoas != null ? (actualRoas >= (b as typeof config.benchmarks.BOF).targetRoas ? "good" : actualRoas >= (b as typeof config.benchmarks.BOF).targetRoas * 0.7 ? "warn" : "bad") : "bad",
        rec: actualRoas != null && actualRoas < (b as typeof config.benchmarks.BOF).targetRoas ? "Check AOV, CVR, and audience quality" : "ROAS on target",
      });
    }
  });

  const statusColor = { good: "text-green-400", warn: "text-yellow-400", bad: "text-red-400" };
  const statusBg = { good: "bg-green-900/20", warn: "bg-yellow-900/20", bad: "bg-red-900/20" };

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-800/60 text-gray-400 text-xs border-b border-gray-800">
            <th className="px-4 py-2.5 text-left">Stage</th>
            <th className="px-4 py-2.5 text-left">KPI</th>
            <th className="px-4 py-2.5 text-right">Target</th>
            <th className="px-4 py-2.5 text-right">Actual</th>
            <th className="px-4 py-2.5 text-right">Gap</th>
            <th className="px-4 py-2.5 text-left">Recommendation</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={`border-b border-gray-800/50 ${statusBg[row.status]}`}>
              <td className="px-4 py-2.5">
                <span className="text-xs font-semibold text-gray-400">{row.stage}</span>
              </td>
              <td className="px-4 py-2.5 text-white">{row.kpi}</td>
              <td className="px-4 py-2.5 text-right text-gray-400">{row.target}</td>
              <td className={`px-4 py-2.5 text-right font-medium ${statusColor[row.status]}`}>{row.actual}</td>
              <td className={`px-4 py-2.5 text-right ${statusColor[row.status]}`}>{row.gap}</td>
              <td className="px-4 py-2.5 text-gray-400 text-xs">{row.rec}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
