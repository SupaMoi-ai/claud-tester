import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export function Card({
  children,
  className,
  tone = 'surface',
}: {
  children: ReactNode;
  className?: string;
  tone?: 'surface' | 'sand' | 'sage' | 'dusty' | 'apricot' | 'lavender';
}) {
  const tones: Record<string, string> = {
    surface: 'bg-surface',
    sand: 'bg-sand/50',
    sage: 'bg-sage/35',
    dusty: 'bg-dusty/35',
    apricot: 'bg-apricot/40',
    lavender: 'bg-lavender/40',
  };

  return (
    <div className={cn('rounded-card p-4 shadow-soft', tones[tone], className)}>{children}</div>
  );
}

export function SectionTitle({
  children,
  right,
}: {
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
      <h2 className="font-display text-[19px] leading-tight text-ink">{children}</h2>
      {right ? <span className="text-[13px] text-muted">{right}</span> : null}
    </div>
  );
}
