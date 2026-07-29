"use client";

import { useElapsed } from "@/hooks/useElapsed";

interface ProcessingViewProps {
  label: string;
  /** Shown once the wait gets long enough to look broken. */
  reassurance?: string;
}

function formatElapsed(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function ProcessingView({ label, reassurance }: ProcessingViewProps) {
  const elapsed = useElapsed();

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-6 py-14 shadow-sm">
      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[var(--color-primary)]/25 border-t-[var(--color-primary)]" />
      <div className="text-center">
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-1 font-mono text-xs text-[var(--color-text-muted)]">
          {formatElapsed(elapsed)}
        </p>
      </div>
      {reassurance && elapsed >= 20 && (
        <p className="max-w-xs text-center text-xs leading-relaxed text-[var(--color-text-muted)]">
          {reassurance}
        </p>
      )}
    </div>
  );
}
