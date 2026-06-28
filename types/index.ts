export type FunnelStage =
  | "TOF"
  | "MOF"
  | "BOF"
  | "Retargeting"
  | "Retention"
  | "Unknown";

export type Classification =
  | "Scale"
  | "Iterate"
  | "Monitor"
  | "Kill"
  | "Insufficient Data";

export type Confidence = "High" | "Medium" | "Low" | "Insufficient";

export type Platform = "Meta" | "TikTok" | "Google" | "Pinterest" | "Unknown";

// Raw row from CSV after parsing
export interface RawRow {
  [key: string]: string;
}

// Normalized ad data after column mapping
export interface AdRow {
  id: string;
  campaignName?: string;
  adSetName?: string;
  adName?: string;
  objective?: string;
  platform?: Platform;
  // Spend & reach
  spend?: number;
  impressions?: number;
  reach?: number;
  frequency?: number;
  cpm?: number;
  // Clicks
  clicks?: number;
  linkClicks?: number;
  cpc?: number;
  ctr?: number;
  // LPV
  landingPageViews?: number;
  costPerLpv?: number;
  // Video
  videoPlays?: number;
  threeSecViews?: number;
  thruPlays?: number;
  videoViews25?: number;
  videoViews50?: number;
  videoViews75?: number;
  videoViews95?: number;
  // Engagement
  engagements?: number;
  saves?: number;
  shares?: number;
  comments?: number;
  // Conversion
  addToCarts?: number;
  initiateCheckouts?: number;
  purchases?: number;
  cpa?: number;
  revenue?: number;
  roas?: number;
  newCustomers?: number;
  ncac?: number;
  aov?: number;
  // Derived (calculated)
  derivedCtr?: number;
  derivedCpc?: number;
  derivedCpm?: number;
  derivedLpvRate?: number;
  derivedCostPerLpv?: number;
  derivedEngagementRate?: number;
  derivedHookRate?: number;
  derivedHoldRate?: number;
  derivedCompletionRate?: number;
  derivedAtcRate?: number;
  derivedCvr?: number;
  derivedCpa?: number;
  derivedRoas?: number;
  derivedNcac?: number;
}

// Column mapping: normalized field name -> CSV column header
export type ColumnMapping = Partial<Record<keyof AdRow, string>>;

export interface ScoredAd extends AdRow {
  funnelStage: FunnelStage;
  funnelStageSource: "inferred" | "manual" | "objective";
  score: number; // 0–100
  confidence: Confidence;
  classification: Classification;
  recommendedAction: string;
  reasonCodes: string[];
  kpiDetails: KPIDetail[];
}

export interface KPIDetail {
  name: string;
  value: number | undefined;
  target: number | undefined;
  weight: number;
  score: number; // 0–1
  contribution: number; // score * weight
  status: "good" | "warn" | "bad" | "missing";
}

// Benchmark targets per funnel stage
export interface TOFBenchmarks {
  targetCpm: number;
  targetCtr: number;
  targetHookRate: number;
  targetHoldRate: number;
  targetEngagementRate: number;
  minSpend: number;
}

export interface MOFBenchmarks {
  targetCpc: number;
  targetCtr: number;
  targetLpvRate: number;
  targetCostPerLpv: number;
  targetAtcRate: number;
  minSpend: number;
}

export interface BOFBenchmarks {
  targetCpa: number;
  killCpaMultiplier: number;
  targetRoas: number;
  minPurchases: number;
  minSpend: number;
}

export interface RetargetingBenchmarks {
  targetCpa: number;
  targetRoas: number;
  maxFrequency: number;
  minPurchases: number;
  fatigueFrequencyThreshold: number;
}

export interface RetentionBenchmarks {
  targetCpa: number;
  targetRoas: number;
  targetAov: number;
  maxFrequency: number;
}

export interface AllBenchmarks {
  TOF: TOFBenchmarks;
  MOF: MOFBenchmarks;
  BOF: BOFBenchmarks;
  Retargeting: RetargetingBenchmarks;
  Retention: RetentionBenchmarks;
}

// KPI weight definitions per funnel stage (weights must sum to 1)
export interface TOFWeights {
  spendSufficiency: number;
  cpmEfficiency: number;
  ctr: number;
  hookRate: number;
  holdRate: number;
  engagementQuality: number;
}

export interface MOFWeights {
  spendSufficiency: number;
  cpcEfficiency: number;
  ctr: number;
  lpvRate: number;
  costPerLpv: number;
  engagementQuality: number;
  atcOrLeadSignal: number;
}

export interface BOFWeights {
  spendSufficiency: number;
  cpaVsTarget: number;
  roasVsTarget: number;
  cvr: number;
  purchaseVolume: number;
  aovQuality: number;
}

export interface RetargetingWeights {
  frequencyControl: number;
  cpaVsTarget: number;
  roasVsTarget: number;
  cvr: number;
  purchaseVolume: number;
  creativeFatigue: number;
}

export interface RetentionWeights {
  repeatPurchaseCpa: number;
  roas: number;
  aov: number;
  purchaseVolume: number;
  frequencyFatigue: number;
  engagement: number;
}

export interface AllWeights {
  TOF: TOFWeights;
  MOF: MOFWeights;
  BOF: BOFWeights;
  Retargeting: RetargetingWeights;
  Retention: RetentionWeights;
}

export interface AppConfig {
  benchmarks: AllBenchmarks;
  weights: AllWeights;
  enableConversionGuardrailsForTOF: boolean;
  enableConversionGuardrailsForMOF: boolean;
}

export type WorkflowStep =
  | "upload"
  | "mapping"
  | "funnel"
  | "kpi-config"
  | "results";
