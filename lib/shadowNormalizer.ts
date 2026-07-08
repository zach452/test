import type { AdRow, Platform } from "@/types";
import { deriveMetrics } from "./metrics";

type ShadowRow = Record<string, unknown>;

// ── helpers ──────────────────────────────────────────────────────────────────

const num = (v: unknown): number | undefined => {
  if (v == null || v === "" || v === "-" || v === "N/A") return undefined;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[,$%]/g, ""));
  return isNaN(n) ? undefined : Math.max(0, n);
};

// Handles both "1.24%" (percent sign) and "1.24" (whole-number %) and "0.0124" (decimal)
const pct = (v: unknown): number | undefined => {
  if (v == null || v === "" || v === "-") return undefined;
  const s = String(v).trim();
  if (s.endsWith("%")) {
    const n = parseFloat(s);
    return isNaN(n) ? undefined : n / 100;
  }
  const n = parseFloat(s.replace(/[,$]/g, ""));
  if (isNaN(n)) return undefined;
  return n > 1 ? n / 100 : n;
};

// Shadow sometimes returns ROAS as an array: [{ action_type, value }]
const roasFromValue = (v: unknown): number | undefined => {
  if (v == null) return undefined;
  if (typeof v === "number") return v;
  if (Array.isArray(v)) {
    const entry = (v as { action_type?: string; value?: string }[]).find(
      (e) => e.action_type === "omni_purchase" || e.action_type === "purchase"
    );
    return entry?.value != null ? parseFloat(entry.value) : undefined;
  }
  return num(v);
};

// Shadow sometimes returns action arrays: [{ action_type, value }]
const actionValue = (
  v: unknown,
  types: string[]
): number | undefined => {
  if (v == null) return undefined;
  if (typeof v === "number") return v;
  if (typeof v === "string") return num(v);
  if (Array.isArray(v)) {
    const entry = (v as { action_type?: string; value?: string }[]).find((e) =>
      types.includes(e.action_type ?? "")
    );
    return entry?.value != null ? parseFloat(entry.value) : undefined;
  }
  return undefined;
};

const str = (v: unknown): string | undefined =>
  v != null && v !== "" ? String(v) : undefined;

// ── Meta Ads ─────────────────────────────────────────────────────────────────
// Handles both Shadow-normalized field names and raw Meta Graph API names.

export function normalizeShadowMeta(rows: ShadowRow[]): AdRow[] {
  return rows.map((r, i) => {
    const purchases =
      actionValue(r.actions, ["purchase", "omni_purchase"]) ??
      num(r.purchase) ??
      num(r.purchases);

    const addToCarts =
      actionValue(r.actions, ["add_to_cart", "omni_add_to_cart"]) ??
      num(r.add_to_cart) ??
      num(r.add_to_cart_events);

    const initiateCheckouts =
      actionValue(r.actions, ["initiate_checkout", "omni_initiated_checkout"]) ??
      num(r.initiate_checkout) ??
      num(r.initiate_checkout_events);

    const revenue =
      actionValue(r.action_values, ["purchase", "omni_purchase"]) ??
      num(r.purchase_value) ??
      num(r.purchase_conversion_value) ??
      num(r.conversion_value);

    const row: AdRow = {
      id: String(r.ad_id ?? r.id ?? `shadow-meta-${i}`),
      campaignName:   str(r.campaign_name),
      adSetName:      str(r.adset_name) ?? str(r.ad_set_name),
      adName:         str(r.ad_name),
      objective:      str(r.objective) ?? str(r.campaign_objective),
      spend:          num(r.spend),
      impressions:    num(r.impressions),
      reach:          num(r.reach),
      frequency:      num(r.frequency),
      cpm:            num(r.cpm),
      clicks:         num(r.clicks),
      linkClicks:     num(r.link_clicks) ?? num(r.outbound_clicks) ?? num(r.inline_link_clicks),
      cpc:            num(r.cpc) ?? num(r.cost_per_inline_link_click),
      ctr:            pct(r.ctr) ?? pct(r.inline_link_click_ctr) ?? pct(r.outbound_clicks_ctr),
      landingPageViews:  num(r.landing_page_views),
      costPerLpv:        num(r.cost_per_landing_page_view),
      videoPlays:        num(r.video_plays) ?? num(r.video_play_actions),
      threeSecViews:
        num(r.video_3_sec_watched_actions) ??
        num(r.video_p3_sec_watched_actions) ??
        actionValue(r.video_30_sec_watched_actions, []) ??
        num(r["video_3_sec_watched_actions"]),
      thruPlays:     num(r.video_thruplay_watched_actions),
      videoViews25:  num(r.video_p25_watched_actions),
      videoViews50:  num(r.video_p50_watched_actions),
      videoViews75:  num(r.video_p75_watched_actions),
      videoViews95:  num(r.video_p95_watched_actions) ?? num(r.video_p100_watched_actions),
      engagements:   num(r.post_engagement) ?? num(r.engagements),
      saves:         num(r.post_saves) ?? num(r.saved),
      shares:        num(r.post_shares) ?? num(r.shares),
      comments:      num(r.comment) ?? num(r.comments) ?? num(r.post_comments),
      addToCarts,
      initiateCheckouts,
      purchases,
      cpa:    num(r.cost_per_purchase) ?? num(r.cost_per_conversion),
      revenue,
      roas:          roasFromValue(r.purchase_roas) ?? roasFromValue(r.roas) ?? num(r.purchase_roas_value),
      newCustomers:  num(r.new_customer_count) ?? num(r.new_customers),
      ncac:          num(r.new_customer_acquisition_cost),
      aov:           undefined,
    };

    // Derive AOV if possible
    if (row.revenue != null && (row.purchases ?? 0) > 0) {
      row.aov = row.revenue / row.purchases!;
    }

    return deriveMetrics(row);
  });
}

// ── TikTok Ads ───────────────────────────────────────────────────────────────

export function normalizeShadowTikTok(rows: ShadowRow[]): AdRow[] {
  return rows.map((r, i) => {
    const row: AdRow = {
      id: String(r.ad_id ?? `shadow-tiktok-${i}`),
      campaignName:  str(r.campaign_name),
      adSetName:     str(r.adgroup_name) ?? str(r.ad_group_name),
      adName:        str(r.ad_name),
      objective:     str(r.objective_type) ?? str(r.campaign_type),
      spend:         num(r.spend),
      impressions:   num(r.impressions),
      reach:         num(r.reach),
      frequency:     num(r.frequency),
      cpm:           num(r.cpm),
      clicks:        num(r.clicks),
      linkClicks:    num(r.clicks),
      cpc:           num(r.cpc),
      ctr:           pct(r.ctr),
      landingPageViews: num(r.landing_page_view) ?? num(r.landing_page_views),
      videoPlays:    num(r.video_play_actions) ?? num(r.plays),
      // TikTok uses 2-second views as the closest equivalent to Meta's 3-sec
      threeSecViews: num(r.video_watched_2s) ?? num(r["2s_video_views"]),
      // TikTok's 6-second views are closest to ThruPlays
      thruPlays:     num(r.video_watched_6s) ?? num(r["6s_video_views"]),
      videoViews25:  num(r.video_views_p25),
      videoViews50:  num(r.video_views_p50),
      videoViews75:  num(r.video_views_p75),
      videoViews95:  num(r.video_views_p100) ?? num(r.video_views_p95) ?? num(r.complete_video_watched_rate) != null ? undefined : num(r.video_views_p100),
      engagements:   num(r.total_engagement) ?? num(r.engagements),
      shares:        num(r.shares),
      comments:      num(r.comments),
      addToCarts:    num(r.add_to_cart) ?? num(r.add_to_cart_events) ?? num(r.total_add_to_cart),
      initiateCheckouts: num(r.initiate_checkout) ?? num(r.initiate_checkout_events),
      purchases:     num(r.purchases) ?? num(r.purchase_events) ?? num(r.checkout_events) ?? num(r.complete_payment),
      cpa:           num(r.cost_per_purchase) ?? num(r.cost_per_conversion) ?? num(r.cost_per_complete_payment),
      revenue:       num(r.total_purchase_value) ?? num(r.purchase_value) ?? num(r.value),
      roas:          num(r.purchase_roas) ?? num(r.roas),
      aov:           undefined,
    };

    if (row.revenue != null && (row.purchases ?? 0) > 0) {
      row.aov = row.revenue / row.purchases!;
    }

    return deriveMetrics(row);
  });
}

// ── Google Ads ───────────────────────────────────────────────────────────────

export function normalizeShadowGoogle(rows: ShadowRow[]): AdRow[] {
  return rows.map((r, i) => {
    const spend = num(r.cost) ?? num(r.spend) ?? num(r.cost_micros) != null
      ? (num(r.cost_micros) ?? 0) / 1_000_000
      : undefined;

    const purchases =
      num(r.conversions) ??
      num(r.all_conversions) ??
      num(r.purchases);

    const revenue =
      num(r.conversions_value) ??
      num(r.all_conversions_value) ??
      num(r.conversion_value) ??
      num(r.revenue);

    const row: AdRow = {
      id: String(r.ad_id ?? r.resource_name ?? `shadow-google-${i}`),
      campaignName:  str(r.campaign_name),
      adSetName:     str(r.ad_group_name) ?? str(r.adgroup_name),
      adName:        str(r.ad_name) ?? str(r.headline_1) ?? str(r.description),
      objective:     str(r.campaign_type) ?? str(r.advertising_channel_type),
      spend,
      impressions:   num(r.impressions),
      clicks:        num(r.clicks),
      linkClicks:    num(r.clicks),
      cpc:           num(r.average_cpc) ?? num(r.cpc) ?? (num(r.cost_micros) != null && num(r.clicks) ? (num(r.cost_micros)! / 1_000_000) / num(r.clicks)! : undefined),
      ctr:           pct(r.ctr),
      cpm:           num(r.average_cpm) ?? num(r.cpm),
      purchases,
      revenue,
      cpa:           num(r.cost_per_conversion) ?? num(r.cost_per_purchase),
      roas:          num(r.roas) ?? (revenue != null && spend ? revenue / spend : undefined),
      aov:           undefined,
    };

    if (row.revenue != null && (row.purchases ?? 0) > 0) {
      row.aov = row.revenue / row.purchases!;
    }

    return deriveMetrics(row);
  });
}

// ── Pinterest Ads ────────────────────────────────────────────────────────────

export function normalizeShadowPinterest(rows: ShadowRow[]): AdRow[] {
  return rows.map((r, i) => {
    const row: AdRow = {
      id: String(r.ad_id ?? `shadow-pinterest-${i}`),
      campaignName:  str(r.campaign_name),
      adSetName:     str(r.ad_group_name),
      adName:        str(r.ad_name) ?? str(r.pin_id),
      objective:     str(r.objective_type),
      spend:         num(r.spend_in_dollar) ?? num(r.spend) ?? num(r.cost),
      impressions:   num(r.impression),
      clicks:        num(r.click) ?? num(r.clicks),
      linkClicks:    num(r.outbound_click) ?? num(r.click),
      ctr:           pct(r.ctr),
      cpc:           num(r.cpc),
      cpm:           num(r.cpm),
      engagements:   num(r.engagement) ?? num(r.total_engagement),
      saves:         num(r.save) ?? num(r.repin),
      videoPlays:    num(r.video_mrc_view) ?? num(r.video_start),
      threeSecViews: num(r.video_3sec_view),
      videoViews25:  num(r.video_avg_watch_time) != null ? undefined : num(r.quartile_95_percent_view),
      videoViews50:  undefined,
      videoViews75:  undefined,
      videoViews95:  num(r.quartile_95_percent_view),
      addToCarts:    num(r.add_to_cart),
      purchases:     num(r.checkout) ?? num(r.purchases),
      cpa:           num(r.cost_per_checkout) ?? num(r.cpa),
      revenue:       num(r.checkout_value) ?? num(r.revenue),
      roas:          num(r.roas),
      aov:           undefined,
    };

    if (row.revenue != null && (row.purchases ?? 0) > 0) {
      row.aov = row.revenue / row.purchases!;
    }

    return deriveMetrics(row);
  });
}

// ── Auto-detect + normalise ───────────────────────────────────────────────────

export function normalizeShadowAny(rows: ShadowRow[], platform?: Platform): AdRow[] {
  if (!rows.length) return [];

  const keys = Object.keys(rows[0]).join(" ").toLowerCase();

  const detected: Platform =
    platform ??
    (keys.includes("adset_name") || keys.includes("video_p3_sec") || keys.includes("thruplay")
      ? "Meta"
      : keys.includes("adgroup_name") || keys.includes("video_watched_2s") || keys.includes("total_engagement")
      ? "TikTok"
      : keys.includes("average_cpc") || keys.includes("cost_micros") || keys.includes("advertising_channel")
      ? "Google"
      : keys.includes("save") || keys.includes("repin") || keys.includes("checkout_value")
      ? "Pinterest"
      : "Meta");

  switch (detected) {
    case "Meta":      return normalizeShadowMeta(rows);
    case "TikTok":    return normalizeShadowTikTok(rows);
    case "Google":    return normalizeShadowGoogle(rows);
    case "Pinterest": return normalizeShadowPinterest(rows);
    default:          return normalizeShadowMeta(rows);
  }
}

// ── Query spec builders ───────────────────────────────────────────────────────

export interface ShadowQuerySpec {
  platform: "meta_ads" | "tiktok_ads" | "google_ads";
  level: "ads" | "adsets" | "campaigns";
  startDate: string;
  endDate: string;
  clientName?: string;
}

// Returns the params object to pass to Shadow's query_data tool
export function buildShadowQueryParams(spec: ShadowQuerySpec): Record<string, unknown> {
  const tableMap: Record<string, Record<string, string>> = {
    meta_ads:    { ads: "ads", adsets: "adsets", campaigns: "campaigns" },
    tiktok_ads:  { ads: "ads", adsets: "adgroups", campaigns: "campaigns" },
    google_ads:  { ads: "ads", adsets: "campaigns", campaigns: "campaigns" },
  };

  const groupByMap: Record<string, Record<string, string[]>> = {
    meta_ads: {
      ads:       ["campaign_name", "adset_name", "ad_name"],
      adsets:    ["campaign_name", "adset_name"],
      campaigns: ["campaign_name"],
    },
    tiktok_ads: {
      ads:       ["campaign_name", "adgroup_name", "ad_name"],
      adsets:    ["campaign_name", "adgroup_name"],
      campaigns: ["campaign_name"],
    },
    google_ads: {
      ads:       ["campaign_name", "ad_group_name"],
      adsets:    ["campaign_name", "ad_group_name"],
      campaigns: ["campaign_name"],
    },
  };

  const metaAggregations = {
    spend: ["sum"], impressions: ["sum"], reach: ["sum"], frequency: ["avg"],
    clicks: ["sum"], link_clicks: ["sum"], cpm: ["avg"], ctr: ["avg"],
    landing_page_views: ["sum"], video_plays: ["sum"],
    video_p3_sec_watched_actions: ["sum"], video_thruplay_watched_actions: ["sum"],
    video_p25_watched_actions: ["sum"], video_p50_watched_actions: ["sum"],
    video_p75_watched_actions: ["sum"], video_p95_watched_actions: ["sum"],
    post_engagement: ["sum"], post_saves: ["sum"], post_shares: ["sum"],
    comment: ["sum"], add_to_cart: ["sum"], initiate_checkout: ["sum"],
    purchase: ["sum"], purchase_value: ["sum"],
  };

  const tiktokAggregations = {
    spend: ["sum"], impressions: ["sum"], reach: ["sum"], frequency: ["avg"],
    clicks: ["sum"], cpm: ["avg"], ctr: ["avg"],
    video_play_actions: ["sum"], video_watched_2s: ["sum"],
    video_watched_6s: ["sum"], video_views_p25: ["sum"],
    video_views_p50: ["sum"], video_views_p75: ["sum"], video_views_p100: ["sum"],
    total_engagement: ["sum"], shares: ["sum"], comments: ["sum"],
    add_to_cart: ["sum"], initiate_checkout: ["sum"],
    purchases: ["sum"], total_purchase_value: ["sum"],
  };

  const googleAggregations = {
    cost: ["sum"], impressions: ["sum"], clicks: ["sum"],
    average_cpc: ["avg"], ctr: ["avg"], average_cpm: ["avg"],
    conversions: ["sum"], conversions_value: ["sum"],
  };

  const aggMap: Record<string, Record<string, string[]>> = {
    meta_ads:   metaAggregations,
    tiktok_ads: tiktokAggregations,
    google_ads: googleAggregations,
  };

  return {
    platform: spec.platform,
    table: tableMap[spec.platform]?.[spec.level] ?? "ads",
    start_date: spec.startDate,
    end_date: spec.endDate,
    group_by: groupByMap[spec.platform]?.[spec.level] ?? ["campaign_name"],
    aggregations: aggMap[spec.platform] ?? metaAggregations,
    limit: 500,
  };
}

// Returns a natural-language prompt for the user to paste into Claude
export function buildClaudePrompt(spec: ShadowQuerySpec): string {
  const platformLabels: Record<string, string> = {
    meta_ads:   "Meta Ads",
    tiktok_ads: "TikTok Ads",
    google_ads:  "Google Ads",
  };
  const levelLabels: Record<string, string> = {
    ads:       "ad-level",
    adsets:    "ad set–level",
    campaigns: "campaign-level",
  };

  const clientStr = spec.clientName ? ` for the "${spec.clientName}" account` : "";

  return `Please pull ${platformLabels[spec.platform]} ${levelLabels[spec.level]} performance data from Shadow${clientStr}, from ${spec.startDate} to ${spec.endDate}.

Return the result as a raw JSON array — no markdown, no code fences, just the array — formatted for the Full-Funnel Ad Decision Matrix. Use the Shadow query_data tool with platform "${spec.platform}", level "${spec.level}".

Include all available metrics: spend, impressions, reach, frequency, CPM, clicks, CTR, CPC, landing page views, video plays, 3-second views, ThruPlays, 25/50/75/95% video views, engagements, saves, shares, comments, add-to-carts, initiate checkouts, purchases, CPA, revenue/purchase value, ROAS, and new customers if available.`;
}
