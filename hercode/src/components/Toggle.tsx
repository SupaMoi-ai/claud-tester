import { cn } from '../lib/cn';

/** A row with a switch. The whole row is the target, so it clears 48px easily. */
export function Toggle({
  label,
  hint,
  checked,
  onChange,
  tone = 'default',
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  tone?: 'default' | 'careful';
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'tap flex w-full items-center gap-3 rounded-card px-4 py-3 text-left transition-colors duration-200',
        tone === 'careful' ? 'bg-lavender/30' : 'bg-surface',
        'shadow-soft',
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] leading-snug text-ink">{label}</span>
        {hint ? (
          <span className="mt-0.5 block text-[13px] leading-snug text-muted">{hint}</span>
        ) : null}
      </span>

      <span
        className={cn(
          'relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200',
          checked ? 'bg-sage' : 'bg-line',
        )}
        aria-hidden
      >
        <span
          className={cn(
            'absolute top-1 h-5 w-5 rounded-full bg-surface shadow-soft transition-all duration-200',
            checked ? 'left-6' : 'left-1',
          )}
        />
      </span>
    </button>
  );
}
