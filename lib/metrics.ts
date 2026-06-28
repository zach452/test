import type { AdRow, RawRow, ColumnMapping } from "@/types";

const safeNum = (v: string | undefined): number | undefined => {
  if (v === undefined || v === null || v.trim() === "" || v === "-") return undefined;
  const n = parseFloat(v.replace(/[,$%]/g, ""));
  return isNaN(n) ? undefined : n;
};

const pct = (v: string | undefined): number | undefined => {
  if (v === undefined || v === null || v.trim() === "" || v === "-") return undefined;
  const cleaned = v.replace(/[,$]/g, "").trim();
  if (cleaned.endsWith("%")) {
    const n = parseFloat(cleaned);
    return isNaN(n) ? undefined : n / 100;
  }
  const n = parseFloat(cleaned);
  return isNaN(n) ? undefined : n > 1 ? n / 100 : n;
};

export function mapRow(raw: RawRow, mapping: ColumnMapping, id: string): AdRow {
  const g = (field: keyof ColumnMapping) => {
    const col = mapping[field];
    return col ? raw[col] : undefined;
  };

  const row: AdRow = {
    id,
    campaignName: g("campaignName"),
    adSetName: g("adSetName"),
    adName: g("adName"),
    objective: g("objective"),
    spend: safeNum(g("spend")),
    impressions: safeNum(g("impressions")),
    reach: safeNum(g("reach")),
    frequency: safeNum(g("frequency")),
    cpm: safeNum(g("cpm")),
    clicks: safeNum(g("clicks")),
    linkClicks: safeNum(g("linkClicks")),
    cpc: safeNum(g("cpc")),
    ctr: pct(g("ctr")),
    landingPageViews: safeNum(g("landingPageViews")),
    costPerLpv: safeNum(g("costPerLpv")),
    videoPlays: safeNum(g("videoPlays")),
    threeSecViews: safeNum(g("threeSecViews")),
    thruPlays: safeNum(g("thruPlays")),
    videoViews25: safeNum(g("videoViews25")),
    videoViews50: safeNum(g("videoViews50")),
    videoViews75: safeNum(g("videoViews75")),
    videoViews95: safeNum(g("videoViews95")),
    engagements: safeNum(g("engagements")),
    saves: safeNum(g("saves")),
    shares: safeNum(g("shares")),
    comments: safeNum(g("comments")),
    addToCarts: safeNum(g("addToCarts")),
    initiateCheckouts: safeNum(g("initiateCheckouts")),
    purchases: safeNum(g("purchases")),
    cpa: safeNum(g("cpa")),
    revenue: safeNum(g("revenue")),
    roas: safeNum(g("roas")),
    newCustomers: safeNum(g("newCustomers")),
    ncac: safeNum(g("ncac")),
    aov: safeNum(g("aov")),
  };

  return deriveMetrics(row);
}

export function deriveMetrics(row: AdRow): AdRow {
  const { spend, impressions, clicks, linkClicks, landingPageViews, purchases,
          revenue, threeSecViews, videoPlays, videoViews50, videoViews95,
          engagements, addToCarts, newCustomers } = row;

  const c = clicks ?? linkClicks;

  row.derivedCtr = (c != null && impressions) ? c / impressions : undefined;
  row.derivedCpc = (spend != null && c) ? spend / c : undefined;
  row.derivedCpm = (spend != null && impressions) ? (spend / impressions) * 1000 : undefined;
  row.derivedLpvRate = (landingPageViews != null && c) ? landingPageViews / c : undefined;
  row.derivedCostPerLpv = (spend != null && landingPageViews) ? spend / landingPageViews : undefined;
  row.derivedEngagementRate = (engagements != null && impressions) ? engagements / impressions : undefined;
  row.derivedHookRate = (threeSecViews != null && impressions) ? threeSecViews / impressions : undefined;
  row.derivedHoldRate = (videoViews50 != null && threeSecViews) ? videoViews50 / threeSecViews : undefined;
  row.derivedCompletionRate = (videoViews95 != null && videoPlays) ? videoViews95 / videoPlays : undefined;
  row.derivedAtcRate = (addToCarts != null && landingPageViews) ? addToCarts / landingPageViews : undefined;
  row.derivedCvr = (purchases != null && (landingPageViews ?? c)) ? purchases / (landingPageViews ?? c!) : undefined;
  row.derivedCpa = (spend != null && purchases) ? spend / purchases : undefined;
  row.derivedRoas = (revenue != null && spend) ? revenue / spend : undefined;
  row.derivedNcac = (spend != null && newCustomers) ? spend / newCustomers : undefined;

  return row;
}

// Best available value: prefer reported, fall back to derived
export const eff = {
  ctr: (r: AdRow) => r.ctr ?? r.derivedCtr,
  cpc: (r: AdRow) => r.cpc ?? r.derivedCpc,
  cpm: (r: AdRow) => r.cpm ?? r.derivedCpm,
  lpvRate: (r: AdRow) => r.derivedLpvRate,
  costPerLpv: (r: AdRow) => r.costPerLpv ?? r.derivedCostPerLpv,
  hookRate: (r: AdRow) => r.derivedHookRate,
  holdRate: (r: AdRow) => r.derivedHoldRate,
  completionRate: (r: AdRow) => r.derivedCompletionRate,
  engagementRate: (r: AdRow) => r.derivedEngagementRate,
  atcRate: (r: AdRow) => r.derivedAtcRate,
  cvr: (r: AdRow) => r.derivedCvr,
  cpa: (r: AdRow) => r.cpa ?? r.derivedCpa,
  roas: (r: AdRow) => r.roas ?? r.derivedRoas,
  ncac: (r: AdRow) => r.ncac ?? r.derivedNcac,
};
