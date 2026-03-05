"use client";

export function RecordingIndicator({ duration }: { duration: number }) {
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;
  const time = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

  return (
    <div className="flex items-center gap-3 text-[var(--color-recording)]">
      <span className="relative flex h-3 w-3">
        <span
          className="absolute inline-flex h-full w-full rounded-full bg-[var(--color-recording)] opacity-75"
          style={{ animation: "pulse-ring 1.5s ease-out infinite" }}
        />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--color-recording)]" />
      </span>
      <span className="font-mono text-lg font-semibold tracking-wide">{time}</span>
      <span className="text-sm font-medium">Recording</span>
    </div>
  );
}
