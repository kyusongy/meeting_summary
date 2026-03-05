"use client";

import { useState } from "react";

interface SpeakerMapProps {
  speakers: number[];
  onConfirm: (mapping: Record<number, string>) => void;
}

export function SpeakerMap({ speakers, onConfirm }: SpeakerMapProps) {
  const [names, setNames] = useState<Record<number, string>>(
    () => Object.fromEntries(speakers.map((s) => [s, ""]))
  );

  function updateName(speaker: number, name: string) {
    setNames((prev) => ({ ...prev, [speaker]: name }));
  }

  function handleConfirm() {
    onConfirm(names);
  }

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-sm space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Identify Speakers</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          We detected {speakers.length} speaker{speakers.length !== 1 ? "s" : ""}. Add names to make the summary more useful, or skip to continue.
        </p>
      </div>

      <div className="space-y-3">
        {speakers.map((speaker) => (
          <div key={speaker} className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-sm font-medium text-[var(--color-text-muted)]">
              Speaker {speaker}
            </span>
            <input
              type="text"
              value={names[speaker]}
              onChange={(e) => updateName(speaker, e.target.value)}
              placeholder="Enter name..."
              className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm placeholder:text-[var(--color-text-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]/40 transition-shadow"
            />
          </div>
        ))}
      </div>

      <button
        onClick={handleConfirm}
        className="w-full rounded-2xl bg-[var(--color-primary)] py-3.5 text-base font-semibold text-white shadow-md transition-all hover:bg-[var(--color-primary-hover)] hover:shadow-lg active:scale-[0.98]"
      >
        Continue to Summary
      </button>
    </div>
  );
}
