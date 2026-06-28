"use client";
import React, { useState } from "react";
import type { AdRow, FunnelStage } from "@/types";
import { inferFunnelStage } from "@/lib/inference";
import { FUNNEL_STAGE_LABELS } from "@/lib/constants";

interface StageAssignment {
  stage: FunnelStage;
  source: "inferred" | "manual" | "objective";
}

interface Props {
  rows: AdRow[];
  onAssign: (assignments: StageAssignment[]) => void;
}

const STAGE_COLORS: Record<FunnelStage, string> = {
  TOF: "bg-blue-900/40 text-blue-300 border-blue-700",
  MOF: "bg-purple-900/40 text-purple-300 border-purple-700",
  BOF: "bg-green-900/40 text-green-300 border-green-700",
  Retargeting: "bg-orange-900/40 text-orange-300 border-orange-700",
  Retention: "bg-teal-900/40 text-teal-300 border-teal-700",
  Unknown: "bg-gray-800/40 text-gray-400 border-gray-700",
};

const ALL_STAGES: FunnelStage[] = ["TOF", "MOF", "BOF", "Retargeting", "Retention", "Unknown"];

export default function FunnelAssignment({ rows, onAssign }: Props) {
  const [assignments, setAssignments] = useState<StageAssignment[]>(() =>
    rows.map((row) => {
      const { stage, source } = inferFunnelStage(row);
      return { stage, source };
    })
  );
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkStage, setBulkStage] = useState<FunnelStage>("TOF");

  const toggleSelect = (i: number) => {
    const next = new Set(selected);
    if (next.has(i)) next.delete(i); else next.add(i);
    setSelected(next);
  };

  const selectAll = () => setSelected(new Set(rows.map((_, i) => i)));
  const clearSelection = () => setSelected(new Set());

  const applyBulk = () => {
    setAssignments((prev) =>
      prev.map((a, i) => selected.has(i) ? { stage: bulkStage, source: "manual" as const } : a)
    );
    setSelected(new Set());
  };

  const updateOne = (i: number, stage: FunnelStage) => {
    setAssignments((prev) =>
      prev.map((a, idx) => idx === i ? { stage, source: "manual" as const } : a)
    );
  };

  // Summary counts
  const counts: Record<FunnelStage, number> = {} as Record<FunnelStage, number>;
  ALL_STAGES.forEach((s) => (counts[s] = 0));
  assignments.forEach((a) => counts[a.stage]++);

  return (
    <div className="space-y-6">
      {/* Stage summary */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {ALL_STAGES.map((stage) => (
          <div key={stage} className={`rounded-lg border px-3 py-2 text-center ${STAGE_COLORS[stage]}`}>
            <div className="text-xl font-bold">{counts[stage]}</div>
            <div className="text-xs mt-0.5 opacity-80">{stage}</div>
          </div>
        ))}
      </div>

      {/* Bulk assign */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-gray-400 text-sm">{selected.size} selected</span>
        <button onClick={selectAll} className="text-xs text-violet-400 hover:text-violet-300 underline">Select all</button>
        <button onClick={clearSelection} className="text-xs text-gray-400 hover:text-gray-300 underline">Clear</button>
        <select
          value={bulkStage}
          onChange={(e) => setBulkStage(e.target.value as FunnelStage)}
          className="bg-gray-700 border border-gray-600 text-white text-sm rounded px-2 py-1"
        >
          {ALL_STAGES.map((s) => <option key={s} value={s}>{FUNNEL_STAGE_LABELS[s]}</option>)}
        </select>
        <button
          onClick={applyBulk}
          disabled={selected.size === 0}
          className="px-3 py-1 bg-violet-700 hover:bg-violet-600 disabled:opacity-40 text-white rounded text-sm"
        >
          Apply to {selected.size || "selected"}
        </button>
      </div>

      {/* Row table */}
      <div className="overflow-x-auto rounded-lg border border-gray-800 max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-900 z-10">
            <tr className="text-gray-500 border-b border-gray-800">
              <th className="px-3 py-2 text-left w-8">
                <input type="checkbox" checked={selected.size === rows.length} onChange={(e) => e.target.checked ? selectAll() : clearSelection()} className="rounded" />
              </th>
              <th className="px-3 py-2 text-left">Ad / Campaign</th>
              <th className="px-3 py-2 text-left">Funnel Stage</th>
              <th className="px-3 py-2 text-left">Source</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id} className={`border-b border-gray-800/50 hover:bg-gray-800/30 ${selected.has(i) ? "bg-violet-900/10" : ""}`}>
                <td className="px-3 py-2">
                  <input type="checkbox" checked={selected.has(i)} onChange={() => toggleSelect(i)} className="rounded" />
                </td>
                <td className="px-3 py-2">
                  <div className="font-medium text-white truncate max-w-xs">{row.adName ?? row.campaignName ?? `Row ${i + 1}`}</div>
                  <div className="text-gray-500 text-xs truncate max-w-xs">{row.campaignName}</div>
                </td>
                <td className="px-3 py-2">
                  <select
                    value={assignments[i].stage}
                    onChange={(e) => updateOne(i, e.target.value as FunnelStage)}
                    className={`border rounded px-2 py-0.5 text-xs ${STAGE_COLORS[assignments[i].stage]} bg-transparent`}
                  >
                    {ALL_STAGES.map((s) => <option key={s} value={s} className="bg-gray-900 text-white">{FUNNEL_STAGE_LABELS[s]}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <span className="text-xs text-gray-500">{assignments[i].source}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={() => onAssign(assignments)}
        className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-medium transition-colors"
      >
        Confirm Stage Assignments →
      </button>
    </div>
  );
}
