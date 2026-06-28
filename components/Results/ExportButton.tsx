"use client";
import React from "react";
import type { ScoredAd } from "@/types";
import { eff } from "@/lib/metrics";

interface Props { ads: ScoredAd[] }

function toCSV(rows: object[]): string {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  const header = keys.join(",");
  const body = rows.map((row) =>
    keys.map((k) => {
      const v = (row as Record<string, unknown>)[k];
      if (v == null) return "";
      const s = String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(",")
  );
  return [header, ...body].join("\n");
}

function download(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ExportButton({ ads }: Props) {
  const exportScored = () => {
    const rows = ads.map((ad) => ({
      ad_name: ad.adName ?? "",
      ad_set_name: ad.adSetName ?? "",
      campaign_name: ad.campaignName ?? "",
      funnel_stage: ad.funnelStage,
      funnel_stage_source: ad.funnelStageSource,
      classification: ad.classification,
      score: ad.score,
      confidence: ad.confidence,
      spend: ad.spend ?? "",
      impressions: ad.impressions ?? "",
      cpm: eff.cpm(ad)?.toFixed(2) ?? "",
      ctr: eff.ctr(ad) != null ? (eff.ctr(ad)! * 100).toFixed(2) + "%" : "",
      cpc: eff.cpc(ad)?.toFixed(2) ?? "",
      hook_rate: eff.hookRate(ad) != null ? (eff.hookRate(ad)! * 100).toFixed(2) + "%" : "",
      hold_rate: eff.holdRate(ad) != null ? (eff.holdRate(ad)! * 100).toFixed(2) + "%" : "",
      lpv_rate: eff.lpvRate(ad) != null ? (eff.lpvRate(ad)! * 100).toFixed(2) + "%" : "",
      cpa: eff.cpa(ad)?.toFixed(2) ?? "",
      roas: eff.roas(ad)?.toFixed(2) ?? "",
      purchases: ad.purchases ?? "",
      reason_codes: ad.reasonCodes.join(" | "),
      recommended_action: ad.recommendedAction,
    }));
    download(toCSV(rows), "full-funnel-scored-ads.csv");
  };

  const exportSummary = () => {
    const byStage: Record<string, ScoredAd[]> = {};
    ads.forEach((ad) => {
      byStage[ad.funnelStage] = [...(byStage[ad.funnelStage] ?? []), ad];
    });

    const rows: object[] = [];
    Object.entries(byStage).forEach(([stage, stageAds]) => {
      ["Scale", "Iterate", "Monitor", "Kill", "Insufficient Data"].forEach((cls) => {
        const clsAds = stageAds.filter((a) => a.classification === cls);
        if (!clsAds.length) return;
        rows.push({
          funnel_stage: stage,
          classification: cls,
          ad_count: clsAds.length,
          total_spend: clsAds.reduce((s, a) => s + (a.spend ?? 0), 0).toFixed(2),
          avg_score: (clsAds.reduce((s, a) => s + a.score, 0) / clsAds.length).toFixed(1),
          avg_cpa: (() => {
            const vals = clsAds.map(eff.cpa).filter(Boolean) as number[];
            return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : "";
          })(),
          avg_roas: (() => {
            const vals = clsAds.map(eff.roas).filter(Boolean) as number[];
            return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : "";
          })(),
        });
      });
    });

    download(toCSV(rows), "full-funnel-decision-summary.csv");
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={exportScored}
        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 rounded-lg text-sm transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Export Scored CSV
      </button>
      <button
        onClick={exportSummary}
        className="flex items-center gap-2 px-4 py-2 bg-violet-800 hover:bg-violet-700 border border-violet-700 text-white rounded-lg text-sm transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Decision Summary CSV
      </button>
    </div>
  );
}
