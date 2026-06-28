import type {
  AdRow, ScoredAd, FunnelStage, Classification, Confidence,
  KPIDetail, AppConfig,
} from "@/types";
import { eff } from "./metrics";

// Clamp a ratio to [0,1]
const clamp = (v: number) => Math.min(1, Math.max(0, v));

// Score where lower is better (e.g. CPM, CPA, CPC)
function scoreLower(actual: number | undefined, target: number): { score: number; status: KPIDetail["status"] } {
  if (actual == null) return { score: 0, status: "missing" };
  const ratio = actual / target;
  if (ratio <= 1) return { score: clamp(1 - (ratio - 0) * 0.3), status: "good" };
  if (ratio <= 1.5) return { score: clamp(1 - (ratio - 1) * 0.8), status: "warn" };
  return { score: clamp(Math.max(0, 1 - (ratio - 1))), status: "bad" };
}

// Score where higher is better (e.g. CTR, hook rate, ROAS)
function scoreHigher(actual: number | undefined, target: number): { score: number; status: KPIDetail["status"] } {
  if (actual == null) return { score: 0, status: "missing" };
  const ratio = actual / target;
  if (ratio >= 1) return { score: Math.min(1, 0.7 + ratio * 0.1), status: "good" };
  if (ratio >= 0.7) return { score: clamp(ratio * 0.9), status: "warn" };
  return { score: clamp(ratio * 0.7), status: "bad" };
}

function kpi(
  name: string,
  value: number | undefined,
  target: number,
  weight: number,
  direction: "lower" | "higher"
): KPIDetail {
  const { score, status } = direction === "lower"
    ? scoreLower(value, target)
    : scoreHigher(value, target);
  return { name, value, target, weight, score, contribution: score * weight, status };
}

function computeConfidence(
  stage: FunnelStage,
  row: AdRow,
  config: AppConfig
): Confidence {
  const spend = row.spend ?? 0;
  const purchases = row.purchases ?? 0;

  switch (stage) {
    case "BOF":
    case "Retargeting":
    case "Retention": {
      const minSpend = stage === "BOF" ? config.benchmarks.BOF.minSpend : 100;
      const minPurch = stage === "BOF" ? config.benchmarks.BOF.minPurchases : 3;
      if (spend < minSpend || purchases < minPurch) return "Insufficient";
      if (spend >= minSpend * 3 && purchases >= minPurch * 3) return "High";
      return "Medium";
    }
    case "TOF": {
      const minSpend = config.benchmarks.TOF.minSpend;
      if (spend < minSpend) return "Insufficient";
      if (spend >= minSpend * 5 && (row.impressions ?? 0) > 10000) return "High";
      return "Medium";
    }
    case "MOF": {
      const minSpend = config.benchmarks.MOF.minSpend;
      if (spend < minSpend) return "Insufficient";
      if (spend >= minSpend * 4 && (row.clicks ?? 0) > 200) return "High";
      return "Medium";
    }
    default:
      return spend < 20 ? "Insufficient" : "Low";
  }
}

function classifyFromScore(
  score: number,
  confidence: Confidence,
  stage: FunnelStage,
  row: AdRow,
  config: AppConfig
): Classification {
  if (confidence === "Insufficient") return "Insufficient Data";

  // Hard kill check for BOF: CPA above kill threshold
  if ((stage === "BOF" || stage === "Retargeting") && config.benchmarks.BOF) {
    const actualCpa = eff.cpa(row);
    const { targetCpa, killCpaMultiplier, minSpend } = config.benchmarks.BOF;
    if (actualCpa != null && (row.spend ?? 0) >= minSpend && actualCpa > targetCpa * killCpaMultiplier) {
      return "Kill";
    }
  }

  if (score >= 72) return "Scale";
  if (score >= 52) return "Iterate";
  if (score >= 35) return "Monitor";
  return "Kill";
}

function reasonCodes(stage: FunnelStage, row: AdRow, config: AppConfig): string[] {
  const codes: string[] = [];
  const b = config.benchmarks;

  if (stage === "TOF") {
    const hookRate = eff.hookRate(row);
    const holdRate = eff.holdRate(row);
    const cpm = eff.cpm(row);
    const ctr = eff.ctr(row);
    const er = eff.engagementRate(row);
    if (hookRate != null && hookRate >= b.TOF.targetHookRate) codes.push("Strong hook rate");
    if (hookRate != null && hookRate < b.TOF.targetHookRate * 0.7) codes.push("Low hook rate");
    if (holdRate != null && holdRate < b.TOF.targetHoldRate * 0.7) codes.push("Low hold rate");
    if (holdRate != null && holdRate >= b.TOF.targetHoldRate) codes.push("Strong video retention");
    if (cpm != null && cpm <= b.TOF.targetCpm) codes.push("Efficient CPM");
    if (cpm != null && cpm > b.TOF.targetCpm * 2) codes.push("High CPM");
    if (ctr != null && ctr >= b.TOF.targetCtr) codes.push("Strong CTR");
    if (er != null && er >= b.TOF.targetEngagementRate) codes.push("High engagement quality");
    if ((row.spend ?? 0) < b.TOF.minSpend) codes.push("Insufficient spend");
  }

  if (stage === "MOF") {
    const cpc = eff.cpc(row);
    const lpvRate = eff.lpvRate(row);
    const costLpv = eff.costPerLpv(row);
    const atcRate = eff.atcRate(row);
    if (cpc != null && cpc <= b.MOF.targetCpc) codes.push("Efficient CPC");
    if (cpc != null && cpc > b.MOF.targetCpc * 2) codes.push("High CPC");
    if (lpvRate != null && lpvRate >= b.MOF.targetLpvRate) codes.push("Strong LPV rate");
    if (costLpv != null && costLpv > b.MOF.targetCostPerLpv * 2) codes.push("High cost per LPV");
    if (atcRate != null && atcRate >= b.MOF.targetAtcRate) codes.push("Strong ATC signal");
    if ((row.spend ?? 0) < b.MOF.minSpend) codes.push("Insufficient spend");
  }

  if (stage === "BOF" || stage === "Retargeting" || stage === "Retention") {
    const cpa = eff.cpa(row);
    const roas = eff.roas(row);
    const cvr = eff.cvr(row);
    const freq = row.frequency;
    const tgt = stage === "BOF" ? b.BOF : stage === "Retargeting" ? b.Retargeting : b.Retention;
    if (cpa != null && cpa <= (tgt as typeof b.BOF).targetCpa) codes.push("CPA on target");
    if (cpa != null && cpa > (tgt as typeof b.BOF).targetCpa * (b.BOF.killCpaMultiplier ?? 2.5)) codes.push("CPA above kill threshold");
    if (roas != null && roas >= (tgt as typeof b.BOF).targetRoas) codes.push("ROAS on target");
    if (roas != null && roas < (tgt as typeof b.BOF).targetRoas * 0.5) codes.push("ROAS below target");
    if (cvr != null && cvr > 0.05) codes.push("Strong CVR");
    if (freq != null && stage === "Retargeting" && freq > b.Retargeting.fatigueFrequencyThreshold) codes.push("Frequency fatigue risk");
    if ((row.spend ?? 0) < b.BOF.minSpend) codes.push("Insufficient spend");
  }

  if ((row as ScoredAd).funnelStage === "Unknown") codes.push("Missing funnel tag");

  return codes.length > 0 ? codes : ["Scored with available data"];
}

const ACTION_COPY: Record<FunnelStage, Record<Classification, string>> = {
  TOF: {
    Scale: "This ad is doing its job at the top of funnel: efficient reach, strong attention, and healthy engagement. Increase budget gradually or expand audiences.",
    Iterate: "This ad has some upper-funnel signal but needs improvement. Consider testing a stronger hook, clearer value proposition, or more native format.",
    Monitor: "This ad shows partial upper-funnel signals. Continue running and gather more data before making a decision.",
    Kill: "This ad is expensive for the attention it is generating. CPM, hook rate, hold rate, or engagement quality are below threshold with enough spend to judge.",
    "Insufficient Data": "Not enough spend or impressions to evaluate this ad. Let it run until it reaches the minimum spend threshold.",
  },
  MOF: {
    Scale: "This ad is creating qualified consideration efficiently. It is driving traffic or engagement quality at a healthy cost. Consider sending more spend or building BOF follow-up from this audience.",
    Iterate: "This ad is producing some consideration signal, but not enough quality depth yet. Improve the education angle, landing page alignment, or proof points.",
    Monitor: "This ad shows partial mid-funnel signal. Gather more data before scaling or cutting.",
    Kill: "This ad is not creating efficient qualified traffic or consideration. CPC, LPV rate, cost per LPV, or ATC signal are below benchmark with enough spend to judge.",
    "Insufficient Data": "Not enough spend or clicks to evaluate this ad. Let it run until it reaches the minimum threshold.",
  },
  BOF: {
    Scale: "This ad is converting efficiently against CPA/ROAS targets with enough spend and purchase volume. Increase budget carefully and monitor stability.",
    Iterate: "This ad is close to conversion targets but not a clean scale candidate. Test offer, CTA, product angle, or audience before cutting.",
    Monitor: "This ad shows some conversion activity but hasn't reached conclusive judgment. Monitor closely.",
    Kill: "This ad is above the kill threshold or materially below ROAS target with enough spend to judge. Pause unless there is a strategic reason to keep it live.",
    "Insufficient Data": "Not enough spend or purchase volume to evaluate this ad. Let it run until it reaches the minimum thresholds.",
  },
  Retargeting: {
    Scale: "This retargeting ad is converting efficiently without obvious fatigue. Keep active and consider controlled budget increases.",
    Iterate: "This retargeting ad is useful but may need freshness. Watch frequency, refresh creative, or segment the audience.",
    Monitor: "This retargeting ad shows activity but needs more data. Watch frequency and conversion trends.",
    Kill: "This ad is inefficient or showing fatigue risk. High frequency and weak conversion signal suggest it should be paused or refreshed.",
    "Insufficient Data": "Not enough data to evaluate this retargeting ad.",
  },
  Retention: {
    Scale: "This retention ad is driving repeat purchases efficiently. Maintain or modestly increase spend.",
    Iterate: "This retention ad shows some signal but CPA, ROAS, or AOV need improvement. Test offer or segmentation.",
    Monitor: "This retention ad is running but not yet fully conclusive. Watch repeat purchase metrics.",
    Kill: "This retention ad is underperforming on repeat CPA or ROAS with enough data to judge. Pause and re-evaluate.",
    "Insufficient Data": "Not enough data to evaluate this retention ad.",
  },
  Unknown: {
    Scale: "Funnel stage is unknown. Tag this ad before acting on this classification.",
    Iterate: "Funnel stage is unknown. Tag this ad before acting on this classification.",
    Monitor: "Funnel stage is unknown. Tag this ad before acting on this classification.",
    Kill: "Funnel stage is unknown. Tag this ad before acting on this classification.",
    "Insufficient Data": "Funnel stage is unknown and data is insufficient.",
  },
};

function scoreTOF(row: AdRow, config: AppConfig): KPIDetail[] {
  const b = config.benchmarks.TOF;
  const w = config.weights.TOF;
  const spend = row.spend ?? 0;
  const spendScore = spend >= b.minSpend ? Math.min(1, spend / (b.minSpend * 5)) : spend / b.minSpend;

  return [
    { name: "Spend Sufficiency", value: spend, target: b.minSpend, weight: w.spendSufficiency, score: spendScore, contribution: spendScore * w.spendSufficiency, status: spend >= b.minSpend ? "good" : "bad" },
    kpi("CPM Efficiency", eff.cpm(row), b.targetCpm, w.cpmEfficiency, "lower"),
    kpi("CTR", eff.ctr(row), b.targetCtr, w.ctr, "higher"),
    kpi("Hook Rate", eff.hookRate(row), b.targetHookRate, w.hookRate, "higher"),
    kpi("Hold Rate", eff.holdRate(row), b.targetHoldRate, w.holdRate, "higher"),
    kpi("Engagement Quality", eff.engagementRate(row), b.targetEngagementRate, w.engagementQuality, "higher"),
  ];
}

function scoreMOF(row: AdRow, config: AppConfig): KPIDetail[] {
  const b = config.benchmarks.MOF;
  const w = config.weights.MOF;
  const spend = row.spend ?? 0;
  const spendScore = spend >= b.minSpend ? Math.min(1, spend / (b.minSpend * 4)) : spend / b.minSpend;

  return [
    { name: "Spend Sufficiency", value: spend, target: b.minSpend, weight: w.spendSufficiency, score: spendScore, contribution: spendScore * w.spendSufficiency, status: spend >= b.minSpend ? "good" : "bad" },
    kpi("CPC Efficiency", eff.cpc(row), b.targetCpc, w.cpcEfficiency, "lower"),
    kpi("CTR", eff.ctr(row), b.targetCtr, w.ctr, "higher"),
    kpi("LPV Rate", eff.lpvRate(row), b.targetLpvRate, w.lpvRate, "higher"),
    kpi("Cost per LPV", eff.costPerLpv(row), b.targetCostPerLpv, w.costPerLpv, "lower"),
    kpi("Engagement Quality", eff.engagementRate(row), 0.02, w.engagementQuality, "higher"),
    kpi("ATC / Lead Signal", eff.atcRate(row), b.targetAtcRate, w.atcOrLeadSignal, "higher"),
  ];
}

function scoreBOF(row: AdRow, config: AppConfig): KPIDetail[] {
  const b = config.benchmarks.BOF;
  const w = config.weights.BOF;
  const spend = row.spend ?? 0;
  const purchases = row.purchases ?? 0;
  const spendScore = spend >= b.minSpend ? Math.min(1, spend / (b.minSpend * 3)) : spend / b.minSpend;
  const purchScore = purchases >= b.minPurchases ? Math.min(1, purchases / (b.minPurchases * 3)) : purchases / b.minPurchases;
  const aov = row.aov ?? (row.revenue != null && purchases > 0 ? row.revenue / purchases : undefined);

  return [
    { name: "Spend Sufficiency", value: spend, target: b.minSpend, weight: w.spendSufficiency, score: spendScore, contribution: spendScore * w.spendSufficiency, status: spend >= b.minSpend ? "good" : "bad" },
    kpi("CPA vs Target", eff.cpa(row), b.targetCpa, w.cpaVsTarget, "lower"),
    kpi("ROAS vs Target", eff.roas(row), b.targetRoas, w.roasVsTarget, "higher"),
    kpi("CVR", eff.cvr(row), 0.03, w.cvr, "higher"),
    { name: "Purchase Volume", value: purchases, target: b.minPurchases, weight: w.purchaseVolume, score: purchScore, contribution: purchScore * w.purchaseVolume, status: purchases >= b.minPurchases ? "good" : "warn" },
    kpi("AOV Quality", aov, 50, w.aovQuality, "higher"),
  ];
}

function scoreRetargeting(row: AdRow, config: AppConfig): KPIDetail[] {
  const b = config.benchmarks.Retargeting;
  const w = config.weights.Retargeting;
  const spend = row.spend ?? 0;
  const purchases = row.purchases ?? 0;
  const freq = row.frequency ?? 1;
  const freqScore = freq <= b.maxFrequency ? 1 : clamp(b.maxFrequency / freq);
  const fatigueScore = freq >= b.fatigueFrequencyThreshold ? 0 : clamp(1 - freq / b.fatigueFrequencyThreshold);
  const purchScore = purchases >= b.minPurchases ? Math.min(1, purchases / (b.minPurchases * 3)) : purchases / b.minPurchases;

  return [
    { name: "Frequency Control", value: freq, target: b.maxFrequency, weight: w.frequencyControl, score: freqScore, contribution: freqScore * w.frequencyControl, status: freq <= b.maxFrequency ? "good" : "bad" },
    kpi("CPA vs Target", eff.cpa(row), b.targetCpa, w.cpaVsTarget, "lower"),
    kpi("ROAS vs Target", eff.roas(row), b.targetRoas, w.roasVsTarget, "higher"),
    kpi("CVR", eff.cvr(row), 0.04, w.cvr, "higher"),
    { name: "Purchase Volume", value: purchases, target: b.minPurchases, weight: w.purchaseVolume, score: purchScore, contribution: purchScore * w.purchaseVolume, status: purchases >= b.minPurchases ? "good" : "warn" },
    { name: "Creative Fatigue Risk", value: freq, target: b.fatigueFrequencyThreshold, weight: w.creativeFatigue, score: fatigueScore, contribution: fatigueScore * w.creativeFatigue, status: freq < b.fatigueFrequencyThreshold * 0.7 ? "good" : freq < b.fatigueFrequencyThreshold ? "warn" : "bad" },
  ];
}

function scoreRetention(row: AdRow, config: AppConfig): KPIDetail[] {
  const b = config.benchmarks.Retention;
  const w = config.weights.Retention;
  const freq = row.frequency ?? 1;
  const freqScore = freq <= b.maxFrequency ? 1 : clamp(b.maxFrequency / freq);
  const purchases = row.purchases ?? 0;

  return [
    kpi("Repeat Purchase CPA", eff.cpa(row), b.targetCpa, w.repeatPurchaseCpa, "lower"),
    kpi("ROAS", eff.roas(row), b.targetRoas, w.roas, "higher"),
    kpi("AOV", row.aov, b.targetAov, w.aov, "higher"),
    { name: "Purchase Volume", value: purchases, target: 3, weight: w.purchaseVolume, score: Math.min(1, purchases / 9), contribution: Math.min(1, purchases / 9) * w.purchaseVolume, status: purchases >= 3 ? "good" : "warn" },
    { name: "Frequency/Fatigue", value: freq, target: b.maxFrequency, weight: w.frequencyFatigue, score: freqScore, contribution: freqScore * w.frequencyFatigue, status: freq <= b.maxFrequency ? "good" : "bad" },
    kpi("Engagement", eff.engagementRate(row), 0.02, w.engagement, "higher"),
  ];
}

export function scoreAd(
  row: AdRow,
  stage: FunnelStage,
  stageSource: "inferred" | "manual" | "objective",
  config: AppConfig
): ScoredAd {
  let kpiDetails: KPIDetail[];

  switch (stage) {
    case "TOF": kpiDetails = scoreTOF(row, config); break;
    case "MOF": kpiDetails = scoreMOF(row, config); break;
    case "BOF": kpiDetails = scoreBOF(row, config); break;
    case "Retargeting": kpiDetails = scoreRetargeting(row, config); break;
    case "Retention": kpiDetails = scoreRetention(row, config); break;
    default: kpiDetails = scoreBOF(row, config); break;
  }

  const rawScore = kpiDetails.reduce((sum, d) => sum + d.contribution, 0);
  const score = Math.round(clamp(rawScore) * 100);

  const confidence = computeConfidence(stage, row, config);
  const classification = classifyFromScore(score, confidence, stage, row, config);
  const reasons = reasonCodes(stage, { ...row, funnelStage: stage } as ScoredAd, config);
  const action = ACTION_COPY[stage]?.[classification] ?? "";

  return {
    ...row,
    funnelStage: stage,
    funnelStageSource: stageSource,
    score,
    confidence,
    classification,
    recommendedAction: action,
    reasonCodes: reasons,
    kpiDetails,
  };
}
