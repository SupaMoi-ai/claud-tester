import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { MiniChart } from '../../components/MiniChart';
import { copy } from '../../copy';
import type { InsightResult } from '../../domain/insights';
import { cn } from '../../lib/cn';

const MOTION = { duration: 0.22, ease: [0.4, 0, 0.2, 1] as const };

/**
 * One possible pattern. "Why am I seeing this?" opens the rows the sentence
 * was computed from — there is no hardcoded explanation anywhere.
 */
export function InsightCard({ insight }: { insight: InsightResult }) {
  const [open, setOpen] = useState(false);

  if (insight.status === 'insufficient') {
    return (
      <section className="rounded-card bg-surface/70 p-4">
        <h3 className="font-display text-[17px] text-ink">{copy.patterns.notEnoughTitle}</h3>
        <p className="mt-1 text-[14px] leading-snug text-muted">{copy.patterns.notEnoughBody}</p>
      </section>
    );
  }

  return (
    <section className="rounded-card bg-surface p-4 shadow-soft">
      <p className="text-[13px] text-muted">{copy.patterns.noticed}</p>
      <h3 className="mt-1 font-display text-[19px] leading-snug text-ink">{insight.text}</h3>

      <div className="mt-4">
        <MiniChart spec={insight.chart} label={insight.text} />
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="tap mt-3 flex w-full items-center justify-between gap-2 border-t border-line pt-2 text-left"
      >
        <span className="text-[14px] text-ink/75">
          {open ? copy.patterns.hideWhy : copy.patterns.why}
        </span>
        <ChevronDown
          size={16}
          aria-hidden
          className={cn(
            'shrink-0 text-muted transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={MOTION}
            className="overflow-hidden"
          >
            <dl className="mt-2 space-y-1.5">
              {insight.evidenceRows.map((row, i) => (
                <div
                  key={`${row.label}-${i}`}
                  className="flex items-baseline justify-between gap-3 rounded-card bg-bg px-3 py-2"
                >
                  <dt className="min-w-0 text-[14px] leading-snug text-ink/80">
                    {row.label}
                    {row.detail ? (
                      <span className="mt-0.5 block text-[12px] text-muted">{row.detail}</span>
                    ) : null}
                  </dt>
                  <dd className="shrink-0 text-[14px] tabular-nums text-ink">{row.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-[12px] text-muted">
              {copy.patterns.sampleSize(insight.sampleSize)}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
