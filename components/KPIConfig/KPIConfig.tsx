"use client";
import React, { useState } from "react";
import type { AppConfig, AllBenchmarks, AllWeights } from "@/types";

interface Props {
  config: AppConfig;
  onSave: (config: AppConfig) => void;
}

function WeightRow({
  label, value, onChange,
}: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-gray-300 text-sm w-48 shrink-0">{label}</span>
      <input
        type="range" min={0} max={100} value={Math.round(value * 100)}
        onChange={(e) => onChange(parseInt(e.target.value) / 100)}
        className="flex-1 accent-violet-500"
      />
      <span className="text-violet-300 text-sm w-10 text-right">{Math.round(value * 100)}%</span>
    </div>
  );
}

function BenchmarkInput({
  label, value, onChange, prefix = "", suffix = "",
}: { label: string; value: number; onChange: (v: number) => void; prefix?: string; suffix?: string }) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-gray-400 text-sm flex-1">{label}</label>
      <div className="flex items-center bg-gray-700 border border-gray-600 rounded">
        {prefix && <span className="px-2 text-gray-400 text-sm">{prefix}</span>}
        <input
          type="number" value={value} step="any"
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="bg-transparent text-white text-sm w-20 px-2 py-1 focus:outline-none"
        />
        {suffix && <span className="px-2 text-gray-400 text-sm">{suffix}</span>}
      </div>
    </div>
  );
}

type TabKey = "TOF" | "MOF" | "BOF" | "Retargeting" | "Retention";

export default function KPIConfig({ config, onSave }: Props) {
  const [cfg, setCfg] = useState<AppConfig>(config);
  const [tab, setTab] = useState<TabKey>("TOF");

  const setBenchmark = <S extends keyof AllBenchmarks>(
    stage: S, field: keyof AllBenchmarks[S], value: number
  ) => {
    setCfg((prev) => ({
      ...prev,
      benchmarks: {
        ...prev.benchmarks,
        [stage]: { ...prev.benchmarks[stage], [field]: value },
      },
    }));
  };

  const setWeight = <S extends keyof AllWeights>(
    stage: S, field: keyof AllWeights[S], value: number
  ) => {
    setCfg((prev) => ({
      ...prev,
      weights: {
        ...prev.weights,
        [stage]: { ...prev.weights[stage], [field]: value },
      },
    }));
  };

  const tabs: TabKey[] = ["TOF", "MOF", "BOF", "Retargeting", "Retention"];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-800 pb-0">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === t
                ? "bg-gray-800 text-white border-b-2 border-violet-500"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Benchmarks */}
        <div className="bg-gray-800/40 rounded-xl p-4 space-y-3">
          <h3 className="text-white font-medium text-sm">Benchmark Targets</h3>
          {tab === "TOF" && (
            <>
              <BenchmarkInput label="Target CPM" value={cfg.benchmarks.TOF.targetCpm} onChange={(v) => setBenchmark("TOF", "targetCpm", v)} prefix="$" />
              <BenchmarkInput label="Target CTR" value={cfg.benchmarks.TOF.targetCtr * 100} onChange={(v) => setBenchmark("TOF", "targetCtr", v / 100)} suffix="%" />
              <BenchmarkInput label="Target Hook Rate" value={cfg.benchmarks.TOF.targetHookRate * 100} onChange={(v) => setBenchmark("TOF", "targetHookRate", v / 100)} suffix="%" />
              <BenchmarkInput label="Target Hold Rate" value={cfg.benchmarks.TOF.targetHoldRate * 100} onChange={(v) => setBenchmark("TOF", "targetHoldRate", v / 100)} suffix="%" />
              <BenchmarkInput label="Target Engagement Rate" value={cfg.benchmarks.TOF.targetEngagementRate * 100} onChange={(v) => setBenchmark("TOF", "targetEngagementRate", v / 100)} suffix="%" />
              <BenchmarkInput label="Min Spend Threshold" value={cfg.benchmarks.TOF.minSpend} onChange={(v) => setBenchmark("TOF", "minSpend", v)} prefix="$" />
            </>
          )}
          {tab === "MOF" && (
            <>
              <BenchmarkInput label="Target CPC" value={cfg.benchmarks.MOF.targetCpc} onChange={(v) => setBenchmark("MOF", "targetCpc", v)} prefix="$" />
              <BenchmarkInput label="Target CTR" value={cfg.benchmarks.MOF.targetCtr * 100} onChange={(v) => setBenchmark("MOF", "targetCtr", v / 100)} suffix="%" />
              <BenchmarkInput label="Target LPV Rate" value={cfg.benchmarks.MOF.targetLpvRate * 100} onChange={(v) => setBenchmark("MOF", "targetLpvRate", v / 100)} suffix="%" />
              <BenchmarkInput label="Target Cost per LPV" value={cfg.benchmarks.MOF.targetCostPerLpv} onChange={(v) => setBenchmark("MOF", "targetCostPerLpv", v)} prefix="$" />
              <BenchmarkInput label="Target ATC Rate" value={cfg.benchmarks.MOF.targetAtcRate * 100} onChange={(v) => setBenchmark("MOF", "targetAtcRate", v / 100)} suffix="%" />
              <BenchmarkInput label="Min Spend Threshold" value={cfg.benchmarks.MOF.minSpend} onChange={(v) => setBenchmark("MOF", "minSpend", v)} prefix="$" />
            </>
          )}
          {tab === "BOF" && (
            <>
              <BenchmarkInput label="Target CPA" value={cfg.benchmarks.BOF.targetCpa} onChange={(v) => setBenchmark("BOF", "targetCpa", v)} prefix="$" />
              <BenchmarkInput label="Kill CPA Multiplier" value={cfg.benchmarks.BOF.killCpaMultiplier} onChange={(v) => setBenchmark("BOF", "killCpaMultiplier", v)} suffix="×" />
              <BenchmarkInput label="Target ROAS" value={cfg.benchmarks.BOF.targetRoas} onChange={(v) => setBenchmark("BOF", "targetRoas", v)} suffix="×" />
              <BenchmarkInput label="Min Purchase Volume" value={cfg.benchmarks.BOF.minPurchases} onChange={(v) => setBenchmark("BOF", "minPurchases", v)} />
              <BenchmarkInput label="Min Spend Threshold" value={cfg.benchmarks.BOF.minSpend} onChange={(v) => setBenchmark("BOF", "minSpend", v)} prefix="$" />
            </>
          )}
          {tab === "Retargeting" && (
            <>
              <BenchmarkInput label="Target CPA" value={cfg.benchmarks.Retargeting.targetCpa} onChange={(v) => setBenchmark("Retargeting", "targetCpa", v)} prefix="$" />
              <BenchmarkInput label="Target ROAS" value={cfg.benchmarks.Retargeting.targetRoas} onChange={(v) => setBenchmark("Retargeting", "targetRoas", v)} suffix="×" />
              <BenchmarkInput label="Max Frequency" value={cfg.benchmarks.Retargeting.maxFrequency} onChange={(v) => setBenchmark("Retargeting", "maxFrequency", v)} />
              <BenchmarkInput label="Min Purchases" value={cfg.benchmarks.Retargeting.minPurchases} onChange={(v) => setBenchmark("Retargeting", "minPurchases", v)} />
              <BenchmarkInput label="Fatigue Frequency Threshold" value={cfg.benchmarks.Retargeting.fatigueFrequencyThreshold} onChange={(v) => setBenchmark("Retargeting", "fatigueFrequencyThreshold", v)} />
            </>
          )}
          {tab === "Retention" && (
            <>
              <BenchmarkInput label="Target Repeat CPA" value={cfg.benchmarks.Retention.targetCpa} onChange={(v) => setBenchmark("Retention", "targetCpa", v)} prefix="$" />
              <BenchmarkInput label="Target ROAS" value={cfg.benchmarks.Retention.targetRoas} onChange={(v) => setBenchmark("Retention", "targetRoas", v)} suffix="×" />
              <BenchmarkInput label="Target AOV" value={cfg.benchmarks.Retention.targetAov} onChange={(v) => setBenchmark("Retention", "targetAov", v)} prefix="$" />
              <BenchmarkInput label="Max Frequency" value={cfg.benchmarks.Retention.maxFrequency} onChange={(v) => setBenchmark("Retention", "maxFrequency", v)} />
            </>
          )}
        </div>

        {/* Weights */}
        <div className="bg-gray-800/40 rounded-xl p-4 space-y-3">
          <h3 className="text-white font-medium text-sm">KPI Weights</h3>
          {tab === "TOF" && (
            <>
              <WeightRow label="Spend Sufficiency" value={cfg.weights.TOF.spendSufficiency} onChange={(v) => setWeight("TOF", "spendSufficiency", v)} />
              <WeightRow label="CPM Efficiency" value={cfg.weights.TOF.cpmEfficiency} onChange={(v) => setWeight("TOF", "cpmEfficiency", v)} />
              <WeightRow label="CTR" value={cfg.weights.TOF.ctr} onChange={(v) => setWeight("TOF", "ctr", v)} />
              <WeightRow label="Hook Rate" value={cfg.weights.TOF.hookRate} onChange={(v) => setWeight("TOF", "hookRate", v)} />
              <WeightRow label="Hold Rate" value={cfg.weights.TOF.holdRate} onChange={(v) => setWeight("TOF", "holdRate", v)} />
              <WeightRow label="Engagement Quality" value={cfg.weights.TOF.engagementQuality} onChange={(v) => setWeight("TOF", "engagementQuality", v)} />
            </>
          )}
          {tab === "MOF" && (
            <>
              <WeightRow label="Spend Sufficiency" value={cfg.weights.MOF.spendSufficiency} onChange={(v) => setWeight("MOF", "spendSufficiency", v)} />
              <WeightRow label="CPC Efficiency" value={cfg.weights.MOF.cpcEfficiency} onChange={(v) => setWeight("MOF", "cpcEfficiency", v)} />
              <WeightRow label="CTR" value={cfg.weights.MOF.ctr} onChange={(v) => setWeight("MOF", "ctr", v)} />
              <WeightRow label="LPV Rate" value={cfg.weights.MOF.lpvRate} onChange={(v) => setWeight("MOF", "lpvRate", v)} />
              <WeightRow label="Cost per LPV" value={cfg.weights.MOF.costPerLpv} onChange={(v) => setWeight("MOF", "costPerLpv", v)} />
              <WeightRow label="Engagement Quality" value={cfg.weights.MOF.engagementQuality} onChange={(v) => setWeight("MOF", "engagementQuality", v)} />
              <WeightRow label="ATC / Lead Signal" value={cfg.weights.MOF.atcOrLeadSignal} onChange={(v) => setWeight("MOF", "atcOrLeadSignal", v)} />
            </>
          )}
          {tab === "BOF" && (
            <>
              <WeightRow label="Spend Sufficiency" value={cfg.weights.BOF.spendSufficiency} onChange={(v) => setWeight("BOF", "spendSufficiency", v)} />
              <WeightRow label="CPA vs Target" value={cfg.weights.BOF.cpaVsTarget} onChange={(v) => setWeight("BOF", "cpaVsTarget", v)} />
              <WeightRow label="ROAS vs Target" value={cfg.weights.BOF.roasVsTarget} onChange={(v) => setWeight("BOF", "roasVsTarget", v)} />
              <WeightRow label="CVR" value={cfg.weights.BOF.cvr} onChange={(v) => setWeight("BOF", "cvr", v)} />
              <WeightRow label="Purchase Volume" value={cfg.weights.BOF.purchaseVolume} onChange={(v) => setWeight("BOF", "purchaseVolume", v)} />
              <WeightRow label="AOV Quality" value={cfg.weights.BOF.aovQuality} onChange={(v) => setWeight("BOF", "aovQuality", v)} />
            </>
          )}
          {tab === "Retargeting" && (
            <>
              <WeightRow label="Frequency Control" value={cfg.weights.Retargeting.frequencyControl} onChange={(v) => setWeight("Retargeting", "frequencyControl", v)} />
              <WeightRow label="CPA vs Target" value={cfg.weights.Retargeting.cpaVsTarget} onChange={(v) => setWeight("Retargeting", "cpaVsTarget", v)} />
              <WeightRow label="ROAS vs Target" value={cfg.weights.Retargeting.roasVsTarget} onChange={(v) => setWeight("Retargeting", "roasVsTarget", v)} />
              <WeightRow label="CVR" value={cfg.weights.Retargeting.cvr} onChange={(v) => setWeight("Retargeting", "cvr", v)} />
              <WeightRow label="Purchase Volume" value={cfg.weights.Retargeting.purchaseVolume} onChange={(v) => setWeight("Retargeting", "purchaseVolume", v)} />
              <WeightRow label="Creative Fatigue Risk" value={cfg.weights.Retargeting.creativeFatigue} onChange={(v) => setWeight("Retargeting", "creativeFatigue", v)} />
            </>
          )}
          {tab === "Retention" && (
            <>
              <WeightRow label="Repeat Purchase CPA" value={cfg.weights.Retention.repeatPurchaseCpa} onChange={(v) => setWeight("Retention", "repeatPurchaseCpa", v)} />
              <WeightRow label="ROAS" value={cfg.weights.Retention.roas} onChange={(v) => setWeight("Retention", "roas", v)} />
              <WeightRow label="AOV" value={cfg.weights.Retention.aov} onChange={(v) => setWeight("Retention", "aov", v)} />
              <WeightRow label="Purchase Volume" value={cfg.weights.Retention.purchaseVolume} onChange={(v) => setWeight("Retention", "purchaseVolume", v)} />
              <WeightRow label="Frequency/Fatigue" value={cfg.weights.Retention.frequencyFatigue} onChange={(v) => setWeight("Retention", "frequencyFatigue", v)} />
              <WeightRow label="Engagement" value={cfg.weights.Retention.engagement} onChange={(v) => setWeight("Retention", "engagement", v)} />
            </>
          )}
        </div>
      </div>

      {/* Guardrails */}
      <div className="bg-gray-800/40 rounded-xl p-4 space-y-3">
        <h3 className="text-white font-medium text-sm">Conversion Guardrails</h3>
        <p className="text-gray-400 text-xs">By default, upper-funnel ads are NOT penalized for having no purchases or low ROAS. Enable these guardrails only if you want conversion data to influence upper-funnel scoring.</p>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={cfg.enableConversionGuardrailsForTOF}
            onChange={(e) => setCfg((prev) => ({ ...prev, enableConversionGuardrailsForTOF: e.target.checked }))}
            className="rounded accent-violet-500"
          />
          <span className="text-gray-300 text-sm">Apply CPA/ROAS guardrails to TOF ads</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={cfg.enableConversionGuardrailsForMOF}
            onChange={(e) => setCfg((prev) => ({ ...prev, enableConversionGuardrailsForMOF: e.target.checked }))}
            className="rounded accent-violet-500"
          />
          <span className="text-gray-300 text-sm">Apply CPA/ROAS guardrails to MOF ads</span>
        </label>
      </div>

      <button
        onClick={() => onSave(cfg)}
        className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-medium transition-colors"
      >
        Save Config & Run Scoring →
      </button>
    </div>
  );
}
