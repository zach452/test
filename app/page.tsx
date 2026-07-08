"use client";
import React, { useState, useCallback } from "react";
import type {
  RawRow, AdRow, ColumnMapping, FunnelStage, ScoredAd,
  WorkflowStep, AppConfig,
} from "@/types";
import { DEFAULT_CONFIG } from "@/lib/constants";
import { mapRow } from "@/lib/metrics";
import { scoreAd } from "@/lib/scoring";
import CSVUpload from "@/components/Upload/CSVUpload";
import ShadowImport from "@/components/Upload/ShadowImport";
import ColumnMapper from "@/components/ColumnMapping/ColumnMapper";
import FunnelAssignment from "@/components/FunnelStage/FunnelAssignment";
import KPIConfig from "@/components/KPIConfig/KPIConfig";
import SummaryCards from "@/components/Results/SummaryCards";
import AdTable from "@/components/Results/AdTable";
import ExportButton from "@/components/Results/ExportButton";
import DecisionMatrix from "@/components/Charts/DecisionMatrix";
import FunnelSummaryChart from "@/components/Charts/FunnelSummaryChart";
import SpendAllocation from "@/components/Charts/SpendAllocation";
import ConcentrationChart from "@/components/Charts/ConcentrationChart";
import KPIHealthTable from "@/components/Charts/KPIHealthTable";

const STEPS: { key: WorkflowStep; label: string; icon: string }[] = [
  { key: "upload", label: "Upload CSV", icon: "01" },
  { key: "mapping", label: "Map Columns", icon: "02" },
  { key: "funnel", label: "Assign Funnel", icon: "03" },
  { key: "kpi-config", label: "Configure KPIs", icon: "04" },
  { key: "results", label: "Results", icon: "05" },
];

interface StageAssignment {
  stage: FunnelStage;
  source: "inferred" | "manual" | "objective";
}

export default function Home() {
  const [step, setStep] = useState<WorkflowStep>("upload");
  const [rawRows, setRawRows] = useState<RawRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [adRows, setAdRows] = useState<AdRow[]>([]);
  const [assignments, setAssignments] = useState<StageAssignment[]>([]);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [scoredAds, setScoredAds] = useState<ScoredAd[]>([]);
  const [activeChart, setActiveChart] = useState<string>("matrix");
  const [shadowSource, setShadowSource] = useState<string | null>(null);
  const [uploadMode, setUploadMode] = useState<"csv" | "shadow">("csv");

  const onCSVData = useCallback((rows: RawRow[], hdrs: string[]) => {
    setShadowSource(null);
    setRawRows(rows);
    setHeaders(hdrs);
    setStep("mapping");
  }, []);

  // Shadow path: AdRow[] already normalized, skip mapping step
  const onShadowData = useCallback((rows: AdRow[], sourceLabel: string) => {
    setShadowSource(sourceLabel);
    setAdRows(rows);
    setStep("funnel");
  }, []);

  const onMapping = useCallback((m: ColumnMapping) => {
    const mapped = rawRows.map((r, i) => mapRow(r, m, String(i)));
    setAdRows(mapped);
    setStep("funnel");
  }, [rawRows]);

  const onAssign = useCallback((asns: StageAssignment[]) => {
    setAssignments(asns);
    setStep("kpi-config");
  }, []);

  const onConfigSave = useCallback((cfg: AppConfig) => {
    setConfig(cfg);
    const scored = adRows.map((row, i) =>
      scoreAd(row, assignments[i]?.stage ?? "Unknown", assignments[i]?.source ?? "inferred", cfg)
    );
    setScoredAds(scored);
    setStep("results");
  }, [adRows, assignments]);

  const loadSample = useCallback(() => {
    import("papaparse").then(({ default: Papa }) => {
      fetch("/sample.csv")
        .then((r) => r.text())
        .then((text) => {
          const result = Papa.parse<RawRow>(text, { header: true, skipEmptyLines: true });
          onCSVData(result.data, result.meta.fields ?? []);
        });
    });
  }, [onCSVData]);

  const currentStepIdx = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="flex min-h-screen bg-[#080810]">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-gray-800 bg-gray-900/40 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-white text-xs font-semibold leading-tight">Full-Funnel</p>
              <p className="text-gray-500 text-[10px]">Ad Decision Matrix</p>
            </div>
          </div>
        </div>

        <nav className="p-3 space-y-1 flex-1">
          {STEPS.map((s, idx) => {
            // When Shadow data is loaded, mapping step (idx=1) is auto-skipped
            const shadowSkipped = shadowSource != null && s.key === "mapping";
            const done = idx < currentStepIdx;
            const active = s.key === step;
            const locked = idx > currentStepIdx && !shadowSkipped;
            return (
              <button
                key={s.key}
                onClick={() => !locked && !shadowSkipped && setStep(s.key)}
                disabled={locked || shadowSkipped}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  shadowSkipped
                    ? "text-gray-600 cursor-default"
                    : active
                    ? "bg-violet-700/30 border border-violet-700/50 text-violet-200"
                    : done
                    ? "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
                    : "text-gray-600 cursor-not-allowed"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    shadowSkipped
                      ? "bg-violet-900/60 text-violet-500"
                      : done
                      ? "bg-green-600 text-white"
                      : active
                      ? "bg-violet-600 text-white"
                      : "bg-gray-800 text-gray-600"
                  }`}
                >
                  {shadowSkipped ? "⚡" : done ? "✓" : s.icon}
                </span>
                <span className="text-xs font-medium">
                  {s.label}
                  {shadowSkipped && <span className="block text-[10px] text-violet-600 font-normal">auto-mapped</span>}
                </span>
              </button>
            );
          })}
        </nav>

        {step === "results" && scoredAds.length > 0 && (
          <div className="p-3 border-t border-gray-800">
            <p className="text-gray-500 text-[10px] uppercase font-semibold mb-2 px-2">Charts</p>
            {[
              { key: "matrix", label: "Decision Matrix" },
              { key: "funnel", label: "Funnel Summary" },
              { key: "spend", label: "Spend Allocation" },
              { key: "concentration", label: "Concentration" },
              { key: "kpitable", label: "KPI Health" },
            ].map((c) => (
              <button
                key={c.key}
                onClick={() => setActiveChart(c.key)}
                className={`w-full text-left px-3 py-1.5 rounded text-xs transition-colors ${
                  activeChart === c.key
                    ? "text-violet-300 bg-violet-900/20"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <header className="border-b border-gray-800 px-8 py-4 flex items-center justify-between sticky top-0 bg-[#080810]/90 backdrop-blur z-20">
          <div>
            <h1 className="text-white font-semibold text-lg flex items-center gap-2">
              {STEPS.find((s) => s.key === step)?.label}
              {shadowSource && step !== "upload" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-900/50 border border-violet-700/40 text-violet-300 text-[11px] font-normal">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                  {shadowSource}
                </span>
              )}
            </h1>
            <p className="text-gray-500 text-xs mt-0.5">
              {step === "upload" && "Upload a CSV export or pull live data via Shadow"}
              {step === "mapping" && `${headers.length} columns detected — map them to standardized KPI fields`}
              {step === "funnel" && `${adRows.length} ads — assign each to a funnel stage`}
              {step === "kpi-config" && "Set benchmark targets and KPI weights per funnel stage"}
              {step === "results" && `${scoredAds.length} ads scored and classified`}
            </p>
          </div>
          {step === "results" && <ExportButton ads={scoredAds} />}
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          {step === "upload" && (
            <div className="max-w-xl mx-auto mt-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Full-Funnel Ad Decision Matrix</h2>
                <p className="text-gray-400 leading-relaxed">
                  Score every ad by its{" "}
                  <span className="text-violet-400 font-medium">funnel role</span>, not just CPA.
                  <br />
                  TOF on attention. MOF on consideration. BOF on conversion.
                </p>
              </div>

              {/* Mode toggle */}
              <div className="flex rounded-lg overflow-hidden border border-gray-800 mb-5">
                <button
                  onClick={() => setUploadMode("csv")}
                  className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                    uploadMode === "csv"
                      ? "bg-gray-800 text-white"
                      : "bg-transparent text-gray-500 hover:text-gray-300"
                  }`}
                >
                  Upload CSV
                </button>
                <button
                  onClick={() => setUploadMode("shadow")}
                  className={`flex-1 py-2.5 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    uploadMode === "shadow"
                      ? "bg-violet-900/60 text-violet-200"
                      : "bg-transparent text-gray-500 hover:text-gray-300"
                  }`}
                >
                  <span className="text-[10px]">⚡</span>
                  Connect via Shadow
                </button>
              </div>

              {uploadMode === "csv" ? (
                <>
                  <CSVUpload onData={onCSVData} />
                  <div className="mt-6 text-center">
                    <button
                      onClick={loadSample}
                      className="text-violet-400 hover:text-violet-300 text-sm underline"
                    >
                      Load sample data →
                    </button>
                  </div>
                </>
              ) : (
                <ShadowImport onData={onShadowData} />
              )}

              <div className="mt-6 grid grid-cols-3 gap-3">
                {[
                  { label: "Upload or Connect", desc: "CSV or Shadow live data" },
                  { label: "Map & Score", desc: "By funnel stage" },
                  { label: "Scale or Kill", desc: "Actionable decisions" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="bg-gray-800/30 border border-gray-800 rounded-lg p-3 text-center"
                  >
                    <p className="text-white text-sm font-medium">{item.label}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === "mapping" && (
            <ColumnMapper headers={headers} onMapping={onMapping} />
          )}

          {step === "funnel" && (
            <FunnelAssignment rows={adRows} onAssign={onAssign} />
          )}

          {step === "kpi-config" && (
            <KPIConfig config={config} onSave={onConfigSave} />
          )}

          {step === "results" && scoredAds.length > 0 && (
            <div className="space-y-8">
              <SummaryCards ads={scoredAds} />

              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-white font-medium text-base">
                    {activeChart === "matrix" && "Full-Funnel Decision Matrix"}
                    {activeChart === "funnel" && "Ad Count by Funnel Stage & Classification"}
                    {activeChart === "spend" && "Spend Allocation by Classification"}
                    {activeChart === "concentration" && "Creative Spend Concentration"}
                    {activeChart === "kpitable" && "KPI Health by Funnel Stage"}
                  </h2>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {[
                      { key: "matrix", label: "Matrix" },
                      { key: "funnel", label: "Funnel" },
                      { key: "spend", label: "Spend" },
                      { key: "concentration", label: "Concentration" },
                      { key: "kpitable", label: "KPI Health" },
                    ].map((c) => (
                      <button
                        key={c.key}
                        onClick={() => setActiveChart(c.key)}
                        className={`px-3 py-1 rounded text-xs transition-colors ${
                          activeChart === c.key
                            ? "bg-violet-700 text-white"
                            : "bg-gray-800 text-gray-400 hover:text-gray-200"
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
                {activeChart === "matrix" && <DecisionMatrix ads={scoredAds} />}
                {activeChart === "funnel" && <FunnelSummaryChart ads={scoredAds} />}
                {activeChart === "spend" && <SpendAllocation ads={scoredAds} />}
                {activeChart === "concentration" && <ConcentrationChart ads={scoredAds} />}
                {activeChart === "kpitable" && <KPIHealthTable ads={scoredAds} config={config} />}
              </div>

              <div>
                <h2 className="text-white font-medium text-base mb-4">Ad-Level Decisions</h2>
                <AdTable ads={scoredAds} />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
