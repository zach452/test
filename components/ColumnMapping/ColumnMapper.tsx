"use client";
import React, { useEffect, useState } from "react";
import type { ColumnMapping } from "@/types";
import { KPI_LABELS } from "@/lib/constants";

// Normalized field -> display label
const FIELDS: { key: keyof ColumnMapping; label: string; group: string }[] = [
  { key: "campaignName", label: "Campaign Name", group: "Identifiers" },
  { key: "adSetName", label: "Ad Set Name", group: "Identifiers" },
  { key: "adName", label: "Ad Name", group: "Identifiers" },
  { key: "objective", label: "Objective", group: "Identifiers" },
  { key: "spend", label: "Spend", group: "Spend & Reach" },
  { key: "impressions", label: "Impressions", group: "Spend & Reach" },
  { key: "reach", label: "Reach", group: "Spend & Reach" },
  { key: "frequency", label: "Frequency", group: "Spend & Reach" },
  { key: "cpm", label: "CPM", group: "Spend & Reach" },
  { key: "clicks", label: "Clicks", group: "Clicks" },
  { key: "linkClicks", label: "Link Clicks", group: "Clicks" },
  { key: "cpc", label: "CPC", group: "Clicks" },
  { key: "ctr", label: "CTR", group: "Clicks" },
  { key: "landingPageViews", label: "Landing Page Views", group: "LPV" },
  { key: "costPerLpv", label: "Cost per LPV", group: "LPV" },
  { key: "videoPlays", label: "Video Plays", group: "Video" },
  { key: "threeSecViews", label: "3-Sec Views", group: "Video" },
  { key: "thruPlays", label: "ThruPlays", group: "Video" },
  { key: "videoViews25", label: "25% Views", group: "Video" },
  { key: "videoViews50", label: "50% Views", group: "Video" },
  { key: "videoViews75", label: "75% Views", group: "Video" },
  { key: "videoViews95", label: "95% Views", group: "Video" },
  { key: "engagements", label: "Engagements", group: "Engagement" },
  { key: "saves", label: "Saves", group: "Engagement" },
  { key: "shares", label: "Shares", group: "Engagement" },
  { key: "comments", label: "Comments", group: "Engagement" },
  { key: "addToCarts", label: "Add to Carts", group: "Conversion" },
  { key: "initiateCheckouts", label: "Initiate Checkouts", group: "Conversion" },
  { key: "purchases", label: "Purchases", group: "Conversion" },
  { key: "cpa", label: "CPA", group: "Conversion" },
  { key: "revenue", label: "Revenue", group: "Conversion" },
  { key: "roas", label: "ROAS", group: "Conversion" },
  { key: "newCustomers", label: "New Customers", group: "Conversion" },
  { key: "ncac", label: "NCAC", group: "Conversion" },
  { key: "aov", label: "AOV", group: "Conversion" },
];

// Fuzzy auto-match CSV header to normalized field
const AUTO_MATCH_PATTERNS: Partial<Record<keyof ColumnMapping, RegExp[]>> = {
  campaignName: [/campaign.name/i, /campaign$/i],
  adSetName: [/ad.?set.name/i, /adset/i, /ad group/i],
  adName: [/^ad.name/i, /ad$/i, /creative.name/i],
  objective: [/objective/i],
  spend: [/^spend$/i, /amount.spent/i, /cost$/i, /total.spend/i],
  impressions: [/^impressions$/i],
  reach: [/^reach$/i],
  frequency: [/^frequency$/i],
  cpm: [/^cpm$/i, /cost.per.*thousand/i, /cost.per.1000/i],
  clicks: [/^clicks$/i, /^all.clicks$/i],
  linkClicks: [/link.click/i, /outbound.click/i],
  cpc: [/^cpc$/i, /cost.per.click/i],
  ctr: [/^ctr$/i, /click.through.rate/i],
  landingPageViews: [/landing.page.view/i, /lpv/i],
  costPerLpv: [/cost.per.landing.page/i, /cost.per.lpv/i],
  videoPlays: [/video.play/i, /^plays$/i],
  threeSecViews: [/3.sec/i, /3s.view/i, /three.sec/i],
  thruPlays: [/thruplay/i, /thru.play/i],
  videoViews25: [/video.*25/i, /25%.*/i],
  videoViews50: [/video.*50/i, /50%.*/i],
  videoViews75: [/video.*75/i, /75%.*/i],
  videoViews95: [/video.*95/i, /95%.*/i, /video.*100/i],
  engagements: [/^engagements?$/i, /post.engagement/i],
  saves: [/^saves?$/i],
  shares: [/^shares?$/i],
  comments: [/^comments?$/i],
  addToCarts: [/add.to.cart/i, /atc/i],
  initiateCheckouts: [/initiate.checkout/i, /begin.checkout/i],
  purchases: [/^purchases?$/i, /^conversions?$/i, /^orders?$/i],
  cpa: [/cost.per.purchase/i, /cost.per.conversion/i, /^cpa$/i],
  revenue: [/revenue/i, /purchase.value/i, /conversion.value/i],
  roas: [/^roas$/i, /return.on.ad/i],
  newCustomers: [/new.customer/i],
  ncac: [/ncac/i, /new.customer.cost/i],
  aov: [/^aov$/i, /average.order/i],
};

function autoMap(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  for (const { key } of FIELDS) {
    const patterns = AUTO_MATCH_PATTERNS[key] ?? [];
    const match = headers.find((h) => patterns.some((p) => p.test(h)));
    if (match) mapping[key] = match;
  }
  return mapping;
}

interface Props {
  headers: string[];
  onMapping: (m: ColumnMapping) => void;
}

export default function ColumnMapper({ headers, onMapping }: Props) {
  const [mapping, setMapping] = useState<ColumnMapping>(() => autoMap(headers));

  useEffect(() => {
    setMapping(autoMap(headers));
  }, [headers]);

  const update = (key: keyof ColumnMapping, value: string) => {
    const next = { ...mapping, [key]: value || undefined };
    setMapping(next);
  };

  const groups = [...new Set(FIELDS.map((f) => f.group))];

  const mappedCount = Object.values(mapping).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-gray-400 text-sm">
          Auto-matched <span className="text-violet-400 font-semibold">{mappedCount}</span> of {FIELDS.length} fields.
          Adjust as needed.
        </p>
        <button
          onClick={() => onMapping(mapping)}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Confirm Mapping →
        </button>
      </div>

      {groups.map((group) => (
        <div key={group}>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{group}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {FIELDS.filter((f) => f.group === group).map(({ key, label }) => (
              <div key={key as string} className="flex items-center gap-3 bg-gray-800/50 rounded-lg px-3 py-2">
                <span className="text-gray-300 text-sm w-36 shrink-0">{label}</span>
                <select
                  value={mapping[key] ?? ""}
                  onChange={(e) => update(key, e.target.value)}
                  className="flex-1 bg-gray-700 border border-gray-600 text-white text-sm rounded px-2 py-1 focus:outline-none focus:border-violet-500"
                >
                  <option value="">— not mapped —</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                {mapping[key] && (
                  <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
