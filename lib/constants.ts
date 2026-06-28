import type {
  AllBenchmarks,
  AllWeights,
  AppConfig,
} from "@/types";

export const DEFAULT_BENCHMARKS: AllBenchmarks = {
  TOF: {
    targetCpm: 10,
    targetCtr: 0.01,
    targetHookRate: 0.25,
    targetHoldRate: 0.4,
    targetEngagementRate: 0.03,
    minSpend: 50,
  },
  MOF: {
    targetCpc: 1.5,
    targetCtr: 0.015,
    targetLpvRate: 0.7,
    targetCostPerLpv: 2.5,
    targetAtcRate: 0.05,
    minSpend: 50,
  },
  BOF: {
    targetCpa: 40,
    killCpaMultiplier: 2.5,
    targetRoas: 2.0,
    minPurchases: 5,
    minSpend: 100,
  },
  Retargeting: {
    targetCpa: 35,
    targetRoas: 3.0,
    maxFrequency: 8,
    minPurchases: 3,
    fatigueFrequencyThreshold: 10,
  },
  Retention: {
    targetCpa: 30,
    targetRoas: 4.0,
    targetAov: 80,
    maxFrequency: 6,
  },
};

export const DEFAULT_WEIGHTS: AllWeights = {
  TOF: {
    spendSufficiency: 0.15,
    cpmEfficiency: 0.15,
    ctr: 0.15,
    hookRate: 0.20,
    holdRate: 0.20,
    engagementQuality: 0.15,
  },
  MOF: {
    spendSufficiency: 0.10,
    cpcEfficiency: 0.15,
    ctr: 0.15,
    lpvRate: 0.15,
    costPerLpv: 0.15,
    engagementQuality: 0.10,
    atcOrLeadSignal: 0.20,
  },
  BOF: {
    spendSufficiency: 0.10,
    cpaVsTarget: 0.30,
    roasVsTarget: 0.25,
    cvr: 0.15,
    purchaseVolume: 0.10,
    aovQuality: 0.10,
  },
  Retargeting: {
    frequencyControl: 0.15,
    cpaVsTarget: 0.25,
    roasVsTarget: 0.25,
    cvr: 0.15,
    purchaseVolume: 0.10,
    creativeFatigue: 0.10,
  },
  Retention: {
    repeatPurchaseCpa: 0.25,
    roas: 0.25,
    aov: 0.15,
    purchaseVolume: 0.15,
    frequencyFatigue: 0.10,
    engagement: 0.10,
  },
};

export const DEFAULT_CONFIG: AppConfig = {
  benchmarks: DEFAULT_BENCHMARKS,
  weights: DEFAULT_WEIGHTS,
  enableConversionGuardrailsForTOF: false,
  enableConversionGuardrailsForMOF: false,
};

export const FUNNEL_KEYWORDS: Record<string, string[]> = {
  TOF: [
    "awareness", "reach", "traffic", "video view", "videoview",
    "prospecting", "broad", "cold", "tof", "upper funnel", "upperfunnel",
    "top of funnel", "topofunnel", "top_funnel", "brand awareness",
  ],
  MOF: [
    "consideration", "landing page", "lpv", "engagement", "quiz",
    "learn", "education", "comparison", "problem aware", "mof",
    "middle funnel", "mid funnel", "midfunnel", "consideration",
  ],
  BOF: [
    "conversion", "purchase", "sales", "catalog", "advantage shopping",
    "asc", "shopping", "bof", "bottom funnel", "bottomfunnel",
    "bottom_funnel", "buy", "checkout",
  ],
  Retargeting: [
    "retargeting", "remarketing", "website visitor", "atc", "cart",
    "checkout", "view content", "warm", "remarket", "retarget",
    "site visitor", "custom audience",
  ],
  Retention: [
    "existing customer", "ltv", "repeat", "loyalty", "crm",
    "email list", "purchaser", "past customer", "retention",
    "returning", "winback", "win back",
  ],
};

// KPI labels for display
export const KPI_LABELS: Record<string, string> = {
  spend: "Spend",
  impressions: "Impressions",
  reach: "Reach",
  frequency: "Frequency",
  cpm: "CPM",
  clicks: "Clicks",
  linkClicks: "Link Clicks",
  cpc: "CPC",
  ctr: "CTR",
  landingPageViews: "Landing Page Views",
  costPerLpv: "Cost per LPV",
  videoPlays: "Video Plays",
  threeSecViews: "3-Sec Views",
  thruPlays: "ThruPlays",
  videoViews25: "25% Views",
  videoViews50: "50% Views",
  videoViews75: "75% Views",
  videoViews95: "95% Views",
  engagements: "Engagements",
  saves: "Saves",
  shares: "Shares",
  comments: "Comments",
  addToCarts: "Add to Carts",
  initiateCheckouts: "Initiate Checkouts",
  purchases: "Purchases",
  cpa: "CPA",
  revenue: "Revenue",
  roas: "ROAS",
  newCustomers: "New Customers",
  ncac: "NCAC",
  aov: "AOV",
};

export const CLASSIFICATION_COLORS: Record<string, string> = {
  Scale: "#22c55e",
  Iterate: "#f59e0b",
  Monitor: "#3b82f6",
  Kill: "#ef4444",
  "Insufficient Data": "#6b7280",
};

export const FUNNEL_STAGE_LABELS: Record<string, string> = {
  TOF: "TOF / Awareness",
  MOF: "MOF / Consideration",
  BOF: "BOF / Conversion",
  Retargeting: "Retargeting",
  Retention: "Retention / Existing",
  Unknown: "Unknown / Needs Tagging",
};
