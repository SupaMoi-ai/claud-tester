import Link from 'next/link'
import { Card, cx, Figure, StalenessNote, Unavailable } from '@/components/ui/primitives'
import type { Instrument } from '@/domain/types'
import type { UnpricedPosition, ValuedPosition } from '@/domain/valuation/value'
import { formatNok, formatPercent, formatQuantity } from '@/lib/format-nb'

export function HoldingsList({
  valued,
  unpriced,
  instruments,
  totalBase,
}: {
  valued: readonly ValuedPosition[]
  unpriced: readonly UnpricedPosition[]
  instruments: ReadonlyMap<string, Instrument>
  totalBase: import('@/domain/money').Decimal
}) {
  return (
    <Card as="ul" className="divide-y divide-line overflow-hidden">
      {valued.map((v) => {
        const instrument = instruments.get(v.position.instrumentId)
        const share = totalBase.isZero() ? null : v.valueBase.div(totalBase)
        return (
          <li key={`${v.position.accountId}-${v.position.instrumentId}`}>
            <Link
              href={`/beholdning/${v.position.instrumentId}`}
              className="flex items-center gap-3 px-4 py-3.5 active:bg-surface-sunken"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-[0.9375rem] text-ink">
                  {instrument?.name ?? v.position.instrumentId}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[0.8125rem] text-ink-muted">
                  <span className="tnum">{formatQuantity(v.position.quantity)}</span>
                  <span aria-hidden>·</span>
                  <StalenessNote
                    staleness={v.staleness}
                    asOf={v.price.asOf}
                    source={v.price.source}
                  />
                  {v.staleness === 'FRESH' && <span>{instrument?.symbol}</span>}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <Figure size="md">{formatNok(v.valueBase)}</Figure>
                {share && (
                  <p className="tnum mt-0.5 text-[0.8125rem] text-ink-faint">
                    {formatPercent(share)}
                  </p>
                )}
              </div>
            </Link>
          </li>
        )
      })}

      {/*
        Positions with no price are listed, not hidden. Dropping them would make
        the holdings list disagree with the position count, and the person would
        have no way to discover that something is missing.
      */}
      {unpriced.map((u) => {
        const instrument = instruments.get(u.position.instrumentId)
        return (
          <li key={`${u.position.accountId}-${u.position.instrumentId}-unpriced`}>
            <Link
              href={`/beholdning/${u.position.instrumentId}`}
              className={cx(
                'flex items-center gap-3 px-4 py-3.5 active:bg-surface-sunken',
                'bg-warn-soft/40',
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-[0.9375rem] text-ink">
                  {instrument?.name ?? u.position.instrumentId}
                </p>
                <p className="mt-0.5 text-[0.8125rem] text-ink-muted">
                  <span className="tnum">{formatQuantity(u.position.quantity)}</span>
                  <span aria-hidden> · </span>
                  <span className="text-warn">mangler kurs</span>
                </p>
              </div>
              <div className="shrink-0 text-right">
                <Unavailable reason={u.reason} />
              </div>
            </Link>
          </li>
        )
      })}
    </Card>
  )
}
