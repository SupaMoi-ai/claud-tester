import { Check } from 'lucide-react';
import { CAPACITY_DESCRIPTION, CAPACITY_LABEL, CAPACITY_LEVELS } from '../domain/capacity';
import type { CapacityLevel } from '../domain/types';
import { cn } from '../lib/cn';

const TONE: Record<CapacityLevel, string> = {
  minimum: 'bg-sand/60',
  light: 'bg-dusty/40',
  normal: 'bg-sage/45',
  high: 'bg-sage/70',
};

/** The four levels, one obvious tap each. Used by check-in and the overwhelm sheet. */
export function CapacityPicker({
  value,
  onChange,
  compact = false,
}: {
  value: CapacityLevel | null;
  onChange: (capacity: CapacityLevel) => void;
  compact?: boolean;
}) {
  return (
    <div className="space-y-2" role="radiogroup" aria-label="Capacity">
      {CAPACITY_LEVELS.map((level) => {
        const selected = value === level;
        return (
          <button
            key={level}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(level)}
            className={cn(
              'tap flex w-full items-center gap-3 rounded-card border px-4 py-3 text-left transition-colors duration-200',
              TONE[level],
              selected ? 'border-ink/30' : 'border-transparent hover:border-line',
            )}
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-medium leading-snug text-ink">
                {CAPACITY_LABEL[level]}
              </span>
              {!compact ? (
                <span className="mt-0.5 block text-[13px] leading-snug text-ink/60">
                  {CAPACITY_DESCRIPTION[level]}
                </span>
              ) : null}
            </span>
            <span
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border',
                selected ? 'border-ink bg-ink text-bg' : 'border-ink/25',
              )}
              aria-hidden
            >
              {selected ? <Check size={14} strokeWidth={3} /> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
