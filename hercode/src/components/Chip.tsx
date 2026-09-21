import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

/** Round, at least 48px tall, and obvious when selected without using colour alone. */
export function Chip({
  children,
  selected = false,
  onClick,
  className,
  ariaLabel,
}: {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={onClick ? selected : undefined}
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        'tap inline-flex items-center justify-center rounded-chip border px-4 py-2 text-[15px] transition-colors duration-200',
        selected
          ? 'border-ink/25 bg-sage/70 font-medium text-ink'
          : 'border-line bg-surface text-ink/80 hover:bg-sand/40',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Tag({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'sage' | 'dusty' | 'sand' | 'apricot';
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-bg text-muted',
    sage: 'bg-sage/50 text-ink',
    dusty: 'bg-dusty/50 text-ink',
    sand: 'bg-sand/70 text-ink',
    apricot: 'bg-apricot/60 text-ink',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-chip px-2.5 py-1 text-[12px] leading-none',
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
