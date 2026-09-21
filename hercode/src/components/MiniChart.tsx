import { copy } from '../copy';
import type { ChartSpec } from '../domain/insights';
import { cn } from '../lib/cn';

/**
 * Small charts for Patterns.
 *
 * Each one shows a single measure, so colour carries magnitude rather than
 * identity: one hue, the compared value darker. Every mark is directly
 * labelled, so nothing depends on colour alone, and the binary dots differ in
 * shape as well as fill.
 *
 * There is no hover layer on purpose. "Why am I seeing this?" opens the rows
 * the chart was drawn from, which is the thing a tooltip would be standing in
 * for and works on a phone.
 */
export function MiniChart({ spec, label }: { spec: ChartSpec; label: string }) {
  switch (spec.kind) {
    case 'bar':
      return <BarChart spec={spec} label={label} />;
    case 'dots':
      return <DotsChart spec={spec} label={label} />;
  }
}

function BarChart({
  spec,
  label,
}: {
  spec: Extract<ChartSpec, { kind: 'bar' }>;
  label: string;
}) {
  const max = Math.max(...spec.bars.map((b) => b.value), 1);

  return (
    <div className="space-y-2" role="img" aria-label={label}>
      {spec.bars.map((bar) => (
        <div key={bar.label}>
          <div className="flex items-baseline justify-between gap-2">
            <span className="min-w-0 truncate text-[13px] text-ink/75">{bar.label}</span>
            <span className="shrink-0 text-[13px] font-medium tabular-nums text-ink">
              {bar.display ?? bar.value}
            </span>
          </div>
          {/* Bars start at zero and share one scale. */}
          <div className="mt-1 h-2.5 w-full overflow-hidden rounded-[4px] bg-bg">
            <div
              className={cn('h-full rounded-[4px]', bar.highlight ? 'bg-sage' : 'bg-sage/40')}
              style={{ width: `${Math.max((bar.value / max) * 100, 2)}%` }}
            />
          </div>
        </div>
      ))}
      <p className="pt-0.5 text-[12px] text-muted">{spec.unit}</p>
    </div>
  );
}

function DotsChart({
  spec,
  label,
}: {
  spec: Extract<ChartSpec, { kind: 'dots' }>;
  label: string;
}) {
  return (
    <div role="img" aria-label={label}>
      <div className="flex items-center gap-2">
        {spec.dots.map((dot) => (
          <span
            key={dot.label}
            className={cn(
              'h-4 w-4 shrink-0 rounded-full border-2',
              // Fill as well as colour, so the two states never rely on hue.
              dot.on ? 'border-apricot bg-apricot' : 'border-line bg-surface',
            )}
          />
        ))}
      </div>

      {/* Two states, so they are named rather than left to the colour. */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        <LegendItem on label={copy.patterns.evidence.lowCapacity} />
        <LegendItem label={copy.patterns.evidence.normalOrBetter} />
      </div>
    </div>
  );
}

function LegendItem({ on = false, label }: { on?: boolean; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[12px] text-muted">
      <span
        className={cn(
          'h-2.5 w-2.5 rounded-full border-2',
          on ? 'border-apricot bg-apricot' : 'border-line bg-surface',
        )}
        aria-hidden
      />
      {label}
    </span>
  );
}
