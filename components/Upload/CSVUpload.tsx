"use client";
import React, { useCallback, useState } from "react";
import Papa from "papaparse";
import type { RawRow } from "@/types";

interface Props {
  onData: (rows: RawRow[], headers: string[]) => void;
}

export default function CSVUpload({ onData }: Props) {
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const process = useCallback(
    (file: File) => {
      if (!file.name.endsWith(".csv")) {
        setError("Please upload a CSV file.");
        return;
      }
      setFileName(file.name);
      setError(null);
      Papa.parse<RawRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          const headers = result.meta.fields ?? [];
          onData(result.data as RawRow[], headers);
        },
        error: (err) => setError(err.message),
      });
    },
    [onData]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) process(file);
    },
    [process]
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) process(file);
    },
    [process]
  );

  return (
    <div className="space-y-6">
      <div
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
          dragging ? "border-violet-400 bg-violet-950/30" : "border-gray-700 hover:border-gray-500"
        }`}
        onClick={() => document.getElementById("csv-input")?.click()}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-violet-900/40 flex items-center justify-center">
            <svg className="w-7 h-7 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div>
            <p className="text-white font-medium">Drop your CSV here or click to browse</p>
            <p className="text-gray-400 text-sm mt-1">Meta, TikTok, Google, or Pinterest ad-level export</p>
          </div>
          {fileName && (
            <div className="mt-2 px-3 py-1 bg-violet-900/50 rounded-full text-violet-300 text-sm">
              {fileName}
            </div>
          )}
        </div>
        <input id="csv-input" type="file" accept=".csv" className="hidden" onChange={onFileChange} />
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-3">
        <div className="flex items-start gap-2">
          <svg className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <p className="text-gray-500 text-xs">
            Your data is processed locally in your browser and never uploaded.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-gray-400 text-sm font-medium">Supported platforms</p>
        <div className="flex gap-2 flex-wrap">
          {["Meta", "TikTok", "Google", "Pinterest"].map((p) => (
            <span key={p} className="px-3 py-1 bg-gray-800 rounded-full text-gray-300 text-xs">{p}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
