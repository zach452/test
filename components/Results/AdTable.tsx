"use client";
import React, { useState, useMemo } from "react";
import type { ScoredAd, FunnelStage, Classification, Confidence } from "@/types";
import { CLASSIFICATION_COLORS, FUNNEL_STAGE_LABELS } from "@/lib/constants";
import { eff } from "@/lib/metrics";

interface Props { ads: ScoredAd[] }

type SortKey = "score" | "spend" | "classification" | "funnelStage" | "confidence";
type SortDir = "asc" | "desc";

const STAGE_OPTIONS: (FunnelStage | "All")[] = ["All", "TOF", "MOF", "BOF", "Retargeting", "Retention", "Unknown"];
const CLASS_OPTIONS: (Classification | "All")[] = ["All", "Scale", "Iterate", "Monitor", "Kill", "Insufficient Data"];

const CONF_COLORS: Record<Confidence, string> = {
  High: "text-green-400",
  Medium: "text-yellow-400",
  Low: "text-orange-400",
  Insufficient: "text-gray-500",
};

const CLASS_BADGE: Record<Classification, string> = {
  Scale: "bg-green-900/50 text-green-300 border border-green-700",
  Iterate: "bg-yellow-900/50 text-yellow-300 border border-yellow-700",
  Monitor: "bg-blue-900/50 text-blue-300 border border-blue-700",
  Kill: "bg-red-900/50 text-red-300 border border-red-700",
  "Insufficient Data": "bg-gray-800 text-gray-400 border border-gray-700",
};

function ScoreBar({ score, cls }: { score: number; cls: Classification }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 bg-gray-800 rounded-full h-1.5">
        <div
          className="h-1.5 rounded-full"
          style={{ width: `${score}%`, backgroundColor: CLASSIFICATION_COLORS[cls] }}
        />
      </div>
      <span className="text-white text-xs w-7">{score}</span>
    </div>
  );
}

export default function AdTable({ ads }: Props) {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<FunnelStage | "All">("All");
  const [classFilter, setClassFilter] = useState<Classification | "All">("All");
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  const filtered = useMemo(() => {
    let result = ads;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          (a.adName ?? "").toLowerCase().includes(q) ||
          (a.campaignName ?? "").toLowerCase().includes(q) ||
          (a.adSetName ?? "").toLowerCase().includes(q)
      );
    }
    if (stageFilter !== "All") result = result.filter((a) => a.funnelStage === stageFilter);
    if (classFilter !== "All") result = result.filter((a) => a.classification === classFilter);

    const sortedResult = [...result].sort((a, b) => {
      let av: number | string = 0, bv: number | string = 0;
      if (sortKey === "score") { av = a.score; bv = b.score; }
      else if (sortKey === "spend") { av = a.spend ?? 0; bv = b.spend ?? 0; }
      else if (sortKey === "classification") { av = a.classification; bv = b.classification; }
      else if (sortKey === "funnelStage") { av = a.funnelStage; bv = b.funnelStage; }
      else if (sortKey === "confidence") { av = a.confidence; bv = b.confidence; }
      if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return sortedResult;
  }, [ads, search, stageFilter, classFilter, sortKey, sortDir]);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("desc"); }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (sortDir === "asc" ? <span>↑</span> : <span>↓</span>) : <span className="text-gray-700">↕</span>;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search campaign / ad set / ad name…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="flex-1 min-w-48 bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-violet-500"
        />
        <select
          value={stageFilter}
          onChange={(e) => { setStageFilter(e.target.value as FunnelStage | "All"); setPage(0); }}
          className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2"
        >
          {STAGE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={classFilter}
          onChange={(e) => { setClassFilter(e.target.value as Classification | "All"); setPage(0); }}
          className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2"
        >
          {CLASS_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="text-gray-500 text-sm">{filtered.length} ads</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-gray-800/60 border-b border-gray-800">
            <tr className="text-gray-400 text-xs">
              <th className="px-4 py-3 text-left">Ad / Campaign</th>
              <th className="px-4 py-3 text-left cursor-pointer select-none" onClick={() => toggleSort("funnelStage")}>Stage <SortIcon k="funnelStage" /></th>
              <th className="px-4 py-3 text-left cursor-pointer select-none" onClick={() => toggleSort("classification")}>Classification <SortIcon k="classification" /></th>
              <th className="px-4 py-3 text-left cursor-pointer select-none" onClick={() => toggleSort("score")}>Score <SortIcon k="score" /></th>
              <th className="px-4 py-3 text-left cursor-pointer select-none" onClick={() => toggleSort("confidence")}>Confidence <SortIcon k="confidence" /></th>
              <th className="px-4 py-3 text-right cursor-pointer select-none" onClick={() => toggleSort("spend")}>Spend <SortIcon k="spend" /></th>
              <th className="px-4 py-3 text-right">CPA</th>
              <th className="px-4 py-3 text-right">ROAS</th>
              <th className="px-4 py-3 text-left">Reason Codes</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((ad) => (
              <React.Fragment key={ad.id}>
                <tr
                  className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer"
                  onClick={() => setExpanded(expanded === ad.id ? null : ad.id)}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-white truncate max-w-[220px]">{ad.adName ?? ad.campaignName ?? "—"}</div>
                    <div className="text-gray-500 text-xs truncate max-w-[220px]">{ad.campaignName}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded">{ad.funnelStage}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${CLASS_BADGE[ad.classification]}`}>{ad.classification}</span>
                  </td>
                  <td className="px-4 py-3">
                    <ScoreBar score={ad.score} cls={ad.classification} />
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs ${CONF_COLORS[ad.confidence]}`}>{ad.confidence}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-white">${(ad.spend ?? 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{eff.cpa(ad) != null ? `$${eff.cpa(ad)!.toFixed(2)}` : "—"}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{eff.roas(ad) != null ? `${eff.roas(ad)!.toFixed(2)}×` : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap max-w-[180px]">
                      {ad.reasonCodes.slice(0, 2).map((r) => (
                        <span key={r} className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">{r}</span>
                      ))}
                    </div>
                  </td>
                </tr>
                {expanded === ad.id && (
                  <tr className="border-b border-gray-700 bg-gray-900/60">
                    <td colSpan={9} className="px-4 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-gray-400 text-xs font-semibold mb-2">Recommended Action</p>
                          <p className="text-gray-200 text-sm">{ad.recommendedAction}</p>
                          <p className="text-gray-400 text-xs font-semibold mt-3 mb-1">All Reason Codes</p>
                          <div className="flex gap-1 flex-wrap">
                            {ad.reasonCodes.map((r) => (
                              <span key={r} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full">{r}</span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs font-semibold mb-2">KPI Breakdown</p>
                          <div className="space-y-1.5">
                            {ad.kpiDetails.map((kpi) => (
                              <div key={kpi.name} className="flex items-center gap-2 text-xs">
                                <span className="text-gray-400 w-36 shrink-0">{kpi.name}</span>
                                <div className="flex-1 bg-gray-800 rounded-full h-1.5">
                                  <div
                                    className="h-1.5 rounded-full"
                                    style={{
                                      width: `${kpi.score * 100}%`,
                                      backgroundColor: kpi.status === "good" ? "#22c55e" : kpi.status === "warn" ? "#f59e0b" : kpi.status === "bad" ? "#ef4444" : "#4b5563",
                                    }}
                                  />
                                </div>
                                <span className="text-gray-300 w-14 text-right">
                                  {kpi.value != null ? kpi.value.toFixed(kpi.value < 1 ? 3 : 1) : "—"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1 bg-gray-800 text-gray-300 rounded disabled:opacity-40 text-sm">←</button>
          <span className="text-gray-400 text-sm">Page {page + 1} of {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} className="px-3 py-1 bg-gray-800 text-gray-300 rounded disabled:opacity-40 text-sm">→</button>
        </div>
      )}
    </div>
  );
}
