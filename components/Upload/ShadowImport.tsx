"use client";
import React, { useState } from "react";
import type { AdRow } from "@/types";
import { normalizeShadowAny } from "@/lib/shadowNormalizer";
import { buildClaudePrompt } from "@/lib/shadowNormalizer";
import type { ShadowQuerySpec } from "@/lib/shadowNormalizer";

interface Props {
  onData: (rows: AdRow[], sourceLabel: string) => void;
}

type Tab = "prompt" | "paste";

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

function todayMinus(days: number): string {
  const d = new Date("2026-07-08");
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

export default function ShadowImport({ onData }: Props) {
  const [tab, setTab] = useState<Tab>("prompt");
  const [platform, setPlatform] = useState<ShadowQuerySpec["platform"]>("meta_ads");
  const [level, setLevel] = useState<ShadowQuerySpec["level"]>("ads");
  const [startDate, setStartDate] = useState(todayMinus(30));
  const [endDate, setEndDate] = useState(todayMinus(1));
  const [clientName, setClientName] = useState("");
  const [copied, setCopied] = useState(false);
  const [json, setJson] = useState("");
  const [error, setError] = useState<string | null>(null);

  const spec: ShadowQuerySpec = { platform, level, startDate, endDate, clientName: clientName || undefined };
  const prompt = buildClaudePrompt(spec);

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleLoad = () => {
    setError(null);
    let parsed: unknown;
    try {
      const trimmed = json.trim();
      // Accept bare arrays or objects with a data key
      parsed = JSON.parse(trimmed.startsWith("{") ? trimmed : trimmed);
    } catch {
      setError("Invalid JSON — paste the raw array Claude returned.");
      return;
    }

    const arr = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as Record<string, unknown>)?.data)
      ? (parsed as Record<string, unknown>).data as unknown[]
      : null;

    if (!arr || arr.length === 0) {
      setError("No rows found. Paste a JSON array like [{...}, {...}].");
      return;
    }

    const platformMap: Record<ShadowQuerySpec["platform"], string> = {
      meta_ads: "Meta",
      tiktok_ads: "TikTok",
      google_ads: "Google",
    };

    try {
      const rows = normalizeShadowAny(
        arr as Record<string, unknown>[],
        platformMap[platform] as "Meta" | "TikTok" | "Google" | "Pinterest"
      );
      const sourceLabel = `Shadow · ${PLATFORMS.find((p) => p.value === platform)?.label} · ${startDate} – ${endDate}`;
      onData(rows, sourceLabel);
    } catch (e) {
      setError(`Failed to normalize data: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <div className="bg-gray-900/60 border border-violet-900/40 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800 bg-violet-950/20">
        <div className="w-7 h-7 rounded-lg bg-violet-800/60 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-violet-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <p className="text-violet-200 text-sm font-semibold leading-tight">Connect via Shadow</p>
          <p className="text-violet-400/70 text-xs">Pull live ad data from connected ad accounts</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        {(["prompt", "paste"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-3 text-xs font-medium transition-colors border-b-2 ${
              tab === t
                ? "text-violet-300 border-violet-500"
                : "text-gray-500 border-transparent hover:text-gray-300"
            }`}
          >
            {t === "prompt" ? "1 · Generate Claude Prompt" : "2 · Paste JSON Response"}
          </button>
        ))}
      </div>

      <div className="p-5">
        {tab === "prompt" && (
          <div className="space-y-4">
            <p className="text-gray-400 text-xs leading-relaxed">
              Configure the query below, copy the generated prompt, then paste it into a{" "}
              <span className="text-violet-300 font-medium">Claude conversation</span> that has the Shadow MCP connected. Claude will run the query and return a JSON array you can paste in step 2.
            </p>

            <div className="grid grid-cols-2 gap-3">
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
                <label className="block text-gray-400 text-xs mb-1.5">Client / Account Name <span className="text-gray-600">(optional)</span></label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Acme Co"
                  className="w-full bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-violet-500 placeholder-gray-600"
                />
              </div>
            </div>

            {/* Generated prompt */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-gray-400 text-xs">Prompt to paste into Claude</label>
                <button
                  onClick={handleCopy}
                  className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors ${
                    copied
                      ? "bg-green-700/40 text-green-300"
                      : "bg-violet-700/40 text-violet-300 hover:bg-violet-700/60"
                  }`}
                >
                  {copied ? "✓ Copied" : "Copy"}
                </button>
              </div>
              <pre className="bg-gray-950/60 border border-gray-800 rounded-lg p-3 text-gray-300 text-[11px] leading-relaxed whitespace-pre-wrap select-all font-mono">
                {prompt}
              </pre>
            </div>

            <button
              onClick={() => setTab("paste")}
              className="w-full py-2 rounded-lg bg-violet-900/30 text-violet-300 text-xs font-medium hover:bg-violet-900/50 transition-colors border border-violet-800/40"
            >
              Got the JSON? Paste it in step 2 →
            </button>
          </div>
        )}

        {tab === "paste" && (
          <div className="space-y-4">
            <p className="text-gray-400 text-xs leading-relaxed">
              After Claude runs the Shadow query, copy the JSON array from the response and paste it below. Column mapping is{" "}
              <span className="text-green-400 font-medium">automatically skipped</span> — fields are pre-mapped for the selected platform.
            </p>

            <div>
              <label className="block text-gray-400 text-xs mb-1.5">Platform (to interpret field names)</label>
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
              <label className="block text-gray-400 text-xs mb-1.5">JSON Array from Claude</label>
              <textarea
                value={json}
                onChange={(e) => { setJson(e.target.value); setError(null); }}
                placeholder={'[\n  { "campaign_name": "TOF|Prospecting", "spend": 1234.56, ... },\n  ...\n]'}
                rows={9}
                className="w-full bg-gray-950/60 border border-gray-800 text-gray-300 text-[11px] font-mono rounded-lg px-3 py-2.5 focus:outline-none focus:border-violet-500 placeholder-gray-700 resize-y"
              />
            </div>

            {error && (
              <div className="bg-red-950/40 border border-red-800/50 rounded-lg px-4 py-3">
                <p className="text-red-300 text-xs">{error}</p>
              </div>
            )}

            <button
              onClick={handleLoad}
              disabled={!json.trim()}
              className="w-full py-2.5 rounded-lg bg-violet-700 text-white text-sm font-semibold hover:bg-violet-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Load Data →
            </button>

            <button
              onClick={() => setTab("prompt")}
              className="w-full text-center text-gray-600 text-xs hover:text-gray-400 transition-colors"
            >
              ← Back to prompt generator
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
