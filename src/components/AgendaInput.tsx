"use client";

interface AgendaInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function AgendaInput({ value, onChange, disabled }: AgendaInputProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-[var(--color-text-muted)]">
        Meeting Agenda <span className="font-normal">(optional)</span>
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Paste your meeting agenda here... The summary will be organized around these topics."
        rows={4}
        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-sm leading-relaxed placeholder:text-[var(--color-text-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]/40 disabled:opacity-50 transition-shadow"
      />
    </div>
  );
}
