"use client";

const FILTERS: { key: string; label: string }[] = [
  { key: "free", label: "Free now" },
  { key: "ev", label: "EV charge" },
  { key: "covered", label: "Covered" },
  { key: "disabled", label: "Disabled" },
];

export default function FilterBar({
  value,
  onChange,
}: {
  value: Set<string>;
  onChange: (s: Set<string>) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
      {FILTERS.map((f) => {
        const on = value.has(f.key);
        return (
          <button
            key={f.key}
            type="button"
            onClick={() => {
              const next = new Set(value);
              if (on) next.delete(f.key);
              else next.add(f.key);
              onChange(next);
            }}
            className={
              "shrink-0 rounded-full px-3 py-1.5 text-xs border transition-colors " +
              (on
                ? "bg-ink text-paper border-ink"
                : "bg-paper/95 text-ink border-ink/15")
            }
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}
