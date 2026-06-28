import type { FunnelStage, AdRow } from "@/types";
import { FUNNEL_KEYWORDS } from "./constants";

function matchKeywords(text: string, stage: string): boolean {
  const lower = text.toLowerCase();
  return FUNNEL_KEYWORDS[stage].some((kw) => lower.includes(kw));
}

function inferFromText(text: string): FunnelStage | null {
  // Check in priority order
  for (const stage of ["Retargeting", "Retention", "BOF", "MOF", "TOF"] as FunnelStage[]) {
    if (matchKeywords(text, stage)) return stage;
  }
  return null;
}

const OBJECTIVE_MAP: Record<string, FunnelStage> = {
  // Meta
  OUTCOME_AWARENESS: "TOF",
  OUTCOME_REACH: "TOF",
  OUTCOME_TRAFFIC: "MOF",
  OUTCOME_ENGAGEMENT: "TOF",
  OUTCOME_VIDEO_VIEWS: "TOF",
  OUTCOME_LEADS: "MOF",
  OUTCOME_SALES: "BOF",
  OUTCOME_APP_PROMOTION: "BOF",
  REACH: "TOF",
  BRAND_AWARENESS: "TOF",
  VIDEO_VIEWS: "TOF",
  POST_ENGAGEMENT: "TOF",
  TRAFFIC: "MOF",
  LEAD_GENERATION: "MOF",
  CONVERSIONS: "BOF",
  CATALOG_SALES: "BOF",
  STORE_VISITS: "BOF",
  // TikTok
  REACH_AWARENESS: "TOF",
  TRAFFIC_AWARENESS: "MOF",
  VIDEO_VIEW: "TOF",
  CONVERSION: "BOF",
  // Google
  AWARENESS: "TOF",
  CONSIDERATION: "MOF",
  CONVERSIONS_GOAL: "BOF",
};

export function inferFunnelStage(row: AdRow): {
  stage: FunnelStage;
  source: "inferred" | "objective";
} {
  // 1. Try objective first
  if (row.objective) {
    const upper = row.objective.toUpperCase().replace(/\s+/g, "_");
    if (OBJECTIVE_MAP[upper]) {
      return { stage: OBJECTIVE_MAP[upper], source: "objective" };
    }
  }

  // 2. Try text from campaign/adset/ad name
  const combined = [row.campaignName, row.adSetName, row.adName]
    .filter(Boolean)
    .join(" ");

  if (combined) {
    const stage = inferFromText(combined);
    if (stage) return { stage, source: "inferred" };
  }

  return { stage: "Unknown", source: "inferred" };
}

export function inferAllStages(
  rows: AdRow[]
): Array<{ stage: FunnelStage; source: "inferred" | "objective" | "manual" }> {
  return rows.map((row) => inferFunnelStage(row));
}
