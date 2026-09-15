import { Card, ProportionBar, SectionHeading } from '@/components/ui/primitives'
import type { AllocationResult } from '@/domain/analytics/allocation'
import type { ConcentrationResult } from '@/domain/analytics/concentration'
import { formatNok, formatPercent } from '@/lib/format-nb'

/**
 * Asset-class colours.
 *
 * Categorical, not semantic: these say "different thing", not "good" or "bad".
 * Red and green are reserved for direction, so they never appear here.
 */
const TAG_STYLE: Record<string, { bar: string; dot: string; label: string }> = {
  CRYPTO: { bar: 'bg-accent', dot: 'bg-accent', label: 'Krypto' },
  EQUITY: { bar: 'bg-ink/70', dot: 'bg-ink/70', label: 'Aksjer' },
  ETF: { bar: 'bg-ink/45', dot: 'bg-ink/45', label: 'ETF' },
  FUND: { bar: 'bg-ink/45', dot: 'bg-ink/45', label: 'Fond' },
  BOND: { bar: 'bg-ink/30', dot: 'bg-ink/30', label: 'Renter' },
  CASH: { bar: 'bg-line-strong', dot: 'bg-line-strong', label: 'Kontanter' },
}

function styleFor(tag: string) {
  return TAG_STYLE[tag] ?? { bar: 'bg-ink/20', dot: 'bg-ink/20', label: tag }
}

export function AllocationCard({
  allocation,
  concentration,
}: {
  allocation: AllocationResult
  concentration: ConcentrationResult
}) {
  const hasSlices = allocation.slices.length > 0
  const total = allocation.totalBase

  const segments = allocation.slices.map((s) => ({
    label: styleFor(s.tag).label,
    fraction: total.isZero() ? 0 : Number(s.valueBase.div(total).toFixed(6)),
    className: styleFor(s.tag).bar,
  }))

  return (
    <Card className="px-4 py-4">
      <SectionHeading>Fordeling</SectionHeading>

      {hasSlices ? (
        <>
          <ProportionBar segments={segments} />

          <ul className="mt-3 space-y-2">
            {allocation.slices.map((s) => (
              <li key={s.tag} className="flex items-center gap-2.5 text-[0.875rem]">
                <span
                  aria-hidden
                  className={`size-2 shrink-0 rounded-full ${styleFor(s.tag).dot}`}
                />
                <span className="flex-1 text-ink">{styleFor(s.tag).label}</span>
                <span className="tnum text-ink-muted">{formatNok(s.valueBase)}</span>
                <span className="tnum w-14 text-right text-ink-faint">
                  {formatPercent(s.weight)}
                </span>
              </li>
            ))}
          </ul>

          {allocation.unclassifiedBase.greaterThan(0) && (
            <p className="mt-3 text-[0.8125rem] text-warn">
              {formatNok(allocation.unclassifiedBase)} er ikke kategorisert ennå.
            </p>
          )}
        </>
      ) : (
        <p className="text-[0.875rem] text-ink-muted">Ingen beholdning å fordele ennå.</p>
      )}

      {concentration.count > 1 && concentration.effectiveHoldings && (
        <p className="mt-4 border-line border-t pt-3 text-[0.8125rem] text-ink-muted leading-relaxed">
          {/*
            Effective holdings rather than a raw HHI: "you effectively own 1.2
            things" lands in a way that "HHI 0.81" does not.
          */}
          Du eier {concentration.count} posisjoner, men konsentrasjonen tilsvarer{' '}
          <span className="tnum font-medium text-ink">
            {concentration.effectiveHoldings.toDecimalPlaces(1).toString().replace('.', ',')}
          </span>{' '}
          likeverdige.
        </p>
      )}
    </Card>
  )
}
