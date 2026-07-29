const STEPS = [
  "Open your Teams or Zoom meeting in another Chrome tab.",
  "Press Start Recording below — Chrome will ask what to share.",
  "Choose the Chrome Tab option, then click your meeting tab.",
  "Turn on “Also share tab audio” at the bottom left, then click Share.",
];

export function ShareInstructions() {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold">Before you start</h2>
      <ol className="space-y-3">
        {STEPS.map((step, i) => (
          <li key={i} className="flex gap-3 text-sm leading-relaxed">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-xs font-semibold text-[var(--color-primary)]">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <p className="mt-4 rounded-xl bg-[var(--color-bg)] px-4 py-3 text-xs leading-relaxed text-[var(--color-text-muted)]">
        The “Also share tab audio” switch is the important one — without it the
        recording comes out silent. Your own voice is picked up by the microphone
        separately.
      </p>
    </div>
  );
}
