"use client";
import React, { useState } from "react";
import type { AdRow } from "@/types";
import { normalizeShadowAny } from "@/lib/shadowNormalizer";
import { buildShadowQueryParams } from "@/lib/shadowNormalizer";
import type { ShadowQuerySpec } from "@/lib/shadowNormalizer";

interface Props {
  onData: (rows: AdRow[], sourceLabel: string) => void;
}

type Mode = "direct" | "paste";

const PLATFORMS: { value: ShadowQuerySpec["platform"]; label: string }[] = [
  { value: "meta_ads", label: "Meta Ads" },
  { value: "tiktok_ads", label: "TikTok Ads" },
  { value: "google_ads", label: "Google Ads" },
];

const LEVELS: { value: ShadowQuerySpec["level"]; label: string }[] = [
  { value: "ads", label: "Ad level" },
  { value: "adsets", label: "Ad Set / Ad Group level" },
  { value: "campaigns", label: "Campaign level" },
];

const PLATFORM_DISPLAY: Record<ShadowQuerySpec["platform"], string> = {
  meta_ads: "Meta",
  tiktok_ads: "TikTok",
  google_ads: "Google",
};

function todayMinus(days: number): string {
  const d = new Date("2026-07-08");
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

export default function ShadowImport({ onData }: Props) {
  const [mode, setMode] = useState<Mode>("direct");
  const [platform, setPlatform] = useState<ShadowQuerySpec["platform"]>("meta_ads");
  const [level, setLevel] = useState<ShadowQuerySpec["level"]>("ads");
  const [startDate, setStartDate] = useState(todayMinus(30));
  const [endDate, setEndDate] = useState(todayMinus(1));
  const [clientName, setClientName] = useState("");

  // Direct sync state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manual paste state
  const [json, setJson] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);

  const spec: ShadowQuerySpec = {
    platform,
    level,
    startDate,
    endDate,
    clientName: clientName || undefined,
  };

  const sourceLabel = `Shadow · ${PLATFORMS.find((p) => p.value === platform)?.label} · ${startDate} – ${endDate}`;

  const handleDirectSync = async () => {
    setLoading(true);
    setError(null);

    const params = buildShadowQueryParams(spec);

    try {
      const res = await fetch("/api/shadow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const data = await res.json() as { rows?: unknown[]; error?: string; raw?: string };

      if (!res.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      if (!data.rows || data.rows.length === 0) {
        throw new Error("No rows returned. Check your date range or account connection.");
      }

      const rows = normalizeShadowAny(
        data.rows as Record<string, unknown>[],
        PLATFORM_DISPLAY[platform] as "Meta" | "TikTok" | "Google"
      );

      onData(rows, sourceLabel);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePasteLoad = () => {
    setPasteError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(json.trim());
    } catch {
      setPasteError("Invalid JSON — paste the raw array.");
      return;
    }

    const arr = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as Record<string, unknown>)?.data)
      ? (parsed as Record<string, unknown>).data as unknown[]
      : null;

    if (!arr || arr.length === 0) {
      setPasteError("No rows found. Paste a JSON array like [{...}, {...}].");
      return;
    }

    try {
      const rows = normalizeShadowAny(
        arr as Record<string, unknown>[],
        PLATFORM_DISPLAY[platform] as "Meta" | "TikTok" | "Google"
      );
      onData(rows, sourceLabel);
    } catch (e) {
      setPasteError(`Failed to normalize: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <div className="bg-gray-900/60 border border-violet-900/40 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800 bg-violet-950/20">
        <div className="w-7 h-7 rounded-lg bg-violet-800/60 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-violet-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <p className="text-violet-200 text-sm font-semibold leading-tight">Connect via Shadow</p>
          <p className="text-violet-400/70 text-xs">Pull live ad data from connected ad accounts</p>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setMode("direct")}
          className={`px-5 py-3 text-xs font-medium transition-colors border-b-2 ${
            mode === "direct"
              ? "text-violet-300 border-violet-500"
              : "text-gray-500 border-transparent hover:text-gray-300"
          }`}
        >
          Direct Sync
        </button>
        <button
          onClick={() => setMode("paste")}
          className={`px-5 py-3 text-xs font-medium transition-colors border-b-2 ${
            mode === "paste"
              ? "text-violet-300 border-violet-500"
              : "text-gray-500 border-transparent hover:text-gray-300"
          }`}
        >
          Paste JSON
        </button>
      </div>

      <div className="p-5">
        {/* Shared config fields */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-gray-400 text-xs mb-1.5">Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as ShadowQuerySpec["platform"])}
              className="w-full bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-violet-500"
            >
              {PLATFORMS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-gray-400 text-xs mb-1.5">Granularity</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as ShadowQuerySpec["level"])}
              className="w-full bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-violet-500"
            >
              {LEVELS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-gray-400 text-xs mb-1.5">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-violet-500"
            />
          </div>
          <div>
            <label className="block text-gray-400 text-xs mb-1.5">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-violet-500"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-gray-400 text-xs mb-1.5">
              Client / Account Name <span className="text-gray-600">(optional)</span>
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Acme Co"
              className="w-full bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-violet-500 placeholder-gray-600"
            />
          </div>
        </div>

        {/* Direct Sync */}
        {mode === "direct" && (
          <div className="space-y-3">
            {error && (
              <div className="bg-red-950/40 border border-red-800/50 rounded-lg px-4 py-3">
                <p className="text-red-300 text-xs font-medium mb-1">Sync failed</p>
                <p className="text-red-400 text-xs">{error}</p>
                {error.includes("SHADOW_API_TOKEN") || error.includes("ANTHROPIC_API_KEY") ? (
                  <p className="text-red-500 text-[11px] mt-1.5">
                    Add the missing env var to <code className="bg-red-950 px-1 rounded">.env.local</code> and restart the dev server.
                  </p>
                ) : null}
              </div>
            )}

            <button
              onClick={handleDirectSync}
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-violet-700 text-white text-sm font-semibold hover:bg-violet-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Pulling from Shadow…
                </>
              ) : (
                <>⚡ Sync from Shadow</>
              )}
            </button>

            <p className="text-gray-600 text-[11px] text-center leading-relaxed">
              Requires <code className="bg-gray-800 px-1 rounded text-gray-400">ANTHROPIC_API_KEY</code> and{" "}
              <code className="bg-gray-800 px-1 rounded text-gray-400">SHADOW_API_TOKEN</code> in{" "}
              <code className="bg-gray-800 px-1 rounded text-gray-400">.env.local</code>
            </p>
          </div>
        )}

        {/* Manual paste fallback */}
        {mode === "paste" && (
          <div className="space-y-3">
            <p className="text-gray-400 text-xs leading-relaxed">
              Ask Claude (with Shadow MCP connected) to run a data query and paste the returned JSON array here. Column mapping is{" "}
              <span className="text-green-400 font-medium">automatically skipped</span>.
            </p>
            <div>
              <label className="block text-gray-400 text-xs mb-1.5">JSON Array</label>
              <textarea
                value={json}
                onChange={(e) => { setJson(e.target.value); setPasteError(null); }}
                placeholder={'[\n  { "campaign_name": "...", "spend": 1234, ... },\n  ...\n]'}
                rows={9}
                className="w-full bg-gray-950/60 border border-gray-800 text-gray-300 text-[11px] font-mono rounded-lg px-3 py-2.5 focus:outline-none focus:border-violet-500 placeholder-gray-700 resize-y"
              />
            </div>
            {pasteError && (
              <div className="bg-red-950/40 border border-red-800/50 rounded-lg px-4 py-3">
                <p className="text-red-300 text-xs">{pasteError}</p>
              </div>
            )}
            <button
              onClick={handlePasteLoad}
              disabled={!json.trim()}
              className="w-full py-2.5 rounded-lg bg-violet-700 text-white text-sm font-semibold hover:bg-violet-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Load Data →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
