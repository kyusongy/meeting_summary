"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { exportSummaryAsDocx, exportTranscriptAsDocx } from "@/lib/exportDocx";

interface SummaryViewProps {
  summary: string;
  transcript: string;
}

export function SummaryView({ summary, transcript }: SummaryViewProps) {
  const [showTranscript, setShowTranscript] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingTranscript, setExportingTranscript] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const date = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const blob = await exportSummaryAsDocx(summary, date);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `meeting-summary-${new Date().toISOString().split("T")[0]}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  async function handleTranscriptExport() {
    setExportingTranscript(true);
    try {
      const date = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const blob = await exportTranscriptAsDocx(transcript, date);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `meeting-transcript-${new Date().toISOString().split("T")[0]}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportingTranscript(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Summary</h2>
        <div className="prose prose-sm max-w-none text-[var(--color-text)] leading-relaxed">
          <ReactMarkdown>{summary}</ReactMarkdown>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-primary-hover)] hover:shadow-md disabled:opacity-50 active:scale-[0.98]"
        >
          {exporting ? "Exporting..." : "Download Summary"}
        </button>
        <button
          onClick={handleTranscriptExport}
          disabled={exportingTranscript}
          className="rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-primary-hover)] hover:shadow-md disabled:opacity-50 active:scale-[0.98]"
        >
          {exportingTranscript ? "Exporting..." : "Download Transcript"}
        </button>
        <button
          onClick={() => setShowTranscript(!showTranscript)}
          className="rounded-xl border border-[var(--color-border)] px-5 py-2.5 text-sm font-medium transition hover:bg-[var(--color-border)]/50"
        >
          {showTranscript ? "Hide Transcript" : "Show Transcript"}
        </button>
      </div>

      {showTranscript && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-muted)]">Full Transcript</h3>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{transcript}</p>
        </div>
      )}
    </div>
  );
}
