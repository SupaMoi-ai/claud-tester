import { cn } from '../lib/cn';

/**
 * A 1-5 visual scale. Shared by the morning check-in and the daily review, so
 * "how much" always looks and behaves the same way.
 */
export function ScalePicker({
  value,
  onChange,
  labels,
  ariaLabel,
}: {
  value: number;
  onChange: (value: number) => void;
  /** Five words, lowest first. The selected one is shown under the scale. */
  labels: readonly string[];
  ariaLabel: string;
}) {
  return (
    <div>
      <div className="flex gap-2" role="radiogroup" aria-label={ariaLabel}>
        {[1, 2, 3, 4, 5].map((step) => (
          <button
            key={step}
            type="button"
            role="radio"
            aria-checked={value === step}
            aria-label={labels[step - 1]}
            onClick={() => onChange(step)}
            className={cn(
              'tap flex flex-1 flex-col items-center justify-end gap-1.5 rounded-card border py-2 transition-colors duration-200',
              value === step ? 'border-ink/30 bg-sage/60' : 'border-line bg-surface',
            )}
          >
            <span
              className="w-2.5 rounded-full bg-ink/70"
              style={{ height: `${8 + step * 6}px` }}
              aria-hidden
            />
            <span className="text-[11px] leading-none text-muted">{step}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-[13px] text-muted">{labels[value - 1]}</p>
    </div>
  );
}
