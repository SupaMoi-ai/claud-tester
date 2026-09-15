import type { ReactNode } from 'react'
import type { Staleness } from '@/domain/valuation/pricebook'
import { formatShortDate, NO_VALUE } from '@/lib/format-nb'

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export function Card({
  children,
  className,
  as: Tag = 'section',
}: {
  children: ReactNode
  className?: string
  as?: 'section' | 'div' | 'article' | 'ul' | 'ol'
}) {
  return (
    <Tag
      className={cx(
        'rounded-card border border-line bg-surface',
        'shadow-[0_1px_2px_rgba(16,18,27,0.03)]',
        className,
      )}
    >
      {children}
    </Tag>
  )
}

/** Small uppercase label. Used sparingly -- one per card at most. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="font-medium text-[0.6875rem] text-ink-faint uppercase tracking-[0.08em]">
      {children}
    </p>
  )
}

export function SectionHeading({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="font-semibold text-[0.9375rem] text-ink">{children}</h2>
      {action}
    </div>
  )
}

/**
 * A number. Always tabular, so columns of kroner don't jitter as digits change.
 *
 * `tone` is deliberately restrained: direction colour is applied only where
 * direction is the point, never to every figure on the screen.
 */
export function Figure({
  children,
  size = 'md',
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  size?: 'hero' | 'lg' | 'md' | 'sm'
  tone?: 'neutral' | 'up' | 'down' | 'muted'
  className?: string
}) {
  const sizes = {
    hero: 'text-hero font-semibold',
    lg: 'text-figure font-semibold',
    md: 'text-[1.0625rem] font-medium',
    sm: 'text-[0.875rem] font-medium',
  } as const
  const tones = {
    neutral: 'text-ink',
    up: 'text-up',
    down: 'text-down',
    muted: 'text-ink-muted',
  } as const
  return <span className={cx('tnum', sizes[size], tones[tone], className)}>{children}</span>
}

/**
 * Renders an unavailable value.
 *
 * An em dash with a reason, never a zero and never a blank. If the app cannot
 * establish a number, it says so in the place the number would have been.
 */
export function Unavailable({ reason }: { reason?: string | undefined }) {
  return (
    <span className="tnum text-ink-faint" title={reason}>
      {NO_VALUE}
    </span>
  )
}

/**
 * Staleness marker shown beside a value.
 *
 * Fresh data carries no marker at all -- decoration on every number teaches
 * people to ignore it. Only degradation is worth saying out loud.
 */
export function StalenessNote({
  staleness,
  asOf,
  source,
}: {
  staleness: Staleness
  asOf: string
  source: string
}) {
  if (staleness === 'FRESH') return null

  const veryStale = staleness === 'VERY_STALE'
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 text-[0.75rem]',
        veryStale ? 'text-warn' : 'text-ink-faint',
      )}
      title={`Kilde: ${source}`}
    >
      {veryStale && <span aria-hidden className="size-1.5 rounded-full bg-warn" />}
      per {formatShortDate(asOf)}
      {veryStale && <span className="sr-only"> — kan være utdatert</span>}
    </span>
  )
}

/** Small status pill. Used for cost-basis confidence and data provenance. */
export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'warn' | 'accent'
}) {
  const tones = {
    neutral: 'bg-surface-sunken text-ink-muted',
    warn: 'bg-warn-soft text-warn',
    accent: 'bg-accent-soft text-accent',
  } as const
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-2 py-0.5 font-medium text-[0.6875rem]',
        tones[tone],
      )}
    >
      {children}
    </span>
  )
}

/**
 * Empty state.
 *
 * Always says what to do next. A screen that says only "no data" wastes the
 * one moment the person is looking at it.
 */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <Card className="px-5 py-8 text-center">
      <p className="font-semibold text-[0.9375rem] text-ink">{title}</p>
      <p className="mx-auto mt-1.5 max-w-[36ch] text-[0.875rem] text-ink-muted leading-relaxed">
        {body}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </Card>
  )
}

/** A thin proportional bar. Used for allocation, where a pie chart would be worse. */
export function ProportionBar({
  segments,
}: {
  segments: ReadonlyArray<{ label: string; fraction: number; className: string }>
}) {
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
      {segments.map((s) => (
        <div
          key={s.label}
          className={s.className}
          style={{ width: `${Math.max(s.fraction * 100, 0.5)}%` }}
          title={`${s.label}: ${(s.fraction * 100).toFixed(1)}%`}
        />
      ))}
    </div>
  )
}
