import Link from 'next/link'
import { AllocationCard } from '@/components/portfolio/allocation-card'
import { AttentionStrip } from '@/components/portfolio/attention-strip'
import { HoldingsList } from '@/components/portfolio/holdings-list'
import { Card, EmptyState, Eyebrow, Figure, SectionHeading } from '@/components/ui/primitives'
import { loadPortfolio } from '@/data/portfolio-service'
import { runDetectors } from '@/domain/detectors/run'
import { dec } from '@/domain/money'
import { formatNok, formatPercent, formatShortDate } from '@/lib/format-nb'
import { requireUser } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Portefølje' }

export default async function PortfolioPage() {
  const user = await requireUser()
  const view = await loadPortfolio(user)

  if (view.isEmpty) {
    return (
      <div className="py-8">
        <Header asOf={view.asOf} />
        <EmptyState
          title="Ingen beholdning ennå"
          body="Legg inn det du eier, så regner appen ut verdi, fordeling og konsentrasjon i norske kroner."
          action={
            <Link
              href="/beholdning/ny"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-accent px-5 font-medium text-[0.9375rem] text-white"
            >
              Legg til beholdning
            </Link>
          }
        />
      </div>
    )
  }

  const { valuation, concentration, byAssetClass } = view

  const unconfirmed = new Map(
    view.transactions
      .filter((t) => t.costBasisConfidence === 'ESTIMATED')
      .map((t) => [
        t.instrumentId,
        t.note ?? 'Utledet fra importerte data. Bekreft antall og kjøpspris.',
      ]),
  )

  const hits = runDetectors({
    valued: valuation.valued,
    unpriced: valuation.unpriced,
    weights: view.weights,
    concentration,
    byAssetClass,
    totalBase: valuation.totalBase,
    asOf: view.asOf,
    ledgerWarnings: view.warnings,
    names: new Map([...view.instruments].map(([id, i]) => [id, i.name])),
    unconfirmed,
  })

  const totalCost = valuation.valued.reduce(
    (acc, v) =>
      v.position.costBasis.status === 'KNOWN' && v.position.costBasis.totalCostNok
        ? acc.plus(v.position.costBasis.totalCostNok)
        : acc,
    dec(0),
  )
  const knownCostValue = valuation.valued.reduce(
    (acc, v) =>
      v.position.costBasis.status === 'KNOWN' && v.position.costBasis.totalCostNok
        ? acc.plus(v.valueBase)
        : acc,
    dec(0),
  )
  const unrealised = knownCostValue.minus(totalCost)
  const hasReturn = !totalCost.isZero()
  const returnPct = hasReturn ? unrealised.div(totalCost) : null
  const partialReturn = hasReturn && !knownCostValue.equals(valuation.totalBase)

  return (
    <div className="space-y-5 py-8">
      <Header asOf={view.asOf} />

      {/* The 10-second answer: one number, then what it means. */}
      <div>
        <Figure size="hero">{formatNok(valuation.totalBase)}</Figure>

        {!valuation.complete && (
          <p className="mt-1.5 text-[0.8125rem] text-warn">
            {valuation.coverage.priced} av {valuation.coverage.total} posisjoner er priset — totalen
            er ufullstendig.
          </p>
        )}

        {hasReturn && returnPct && (
          <p className="mt-2 flex flex-wrap items-baseline gap-x-2 text-[0.9375rem]">
            <Figure size="sm" tone={unrealised.isNegative() ? 'down' : 'up'}>
              {unrealised.isNegative() ? '−' : '+'}
              {formatNok(unrealised.abs())}
            </Figure>
            <span className="tnum text-ink-muted">
              {formatPercent(returnPct, { signed: true })}
            </span>
            <span className="text-ink-faint text-sm">urealisert</span>
          </p>
        )}

        {partialReturn && (
          <p className="mt-1 text-[0.8125rem] text-ink-faint">
            Gjelder bare posisjonene med kjent kjøpspris.
          </p>
        )}
      </div>

      <AttentionStrip hits={hits} />

      <AllocationCard allocation={byAssetClass} concentration={concentration} />

      <section>
        <SectionHeading
          action={
            <Link href="/beholdning/ny" className="text-[0.8125rem] text-accent">
              Legg til
            </Link>
          }
        >
          Beholdning
        </SectionHeading>
        <HoldingsList
          valued={valuation.valued}
          unpriced={valuation.unpriced}
          instruments={view.instruments}
          totalBase={valuation.totalBase}
        />
      </section>

      {/*
        Daily change is deliberately absent until price history exists. An
        invented or zero "today" figure would be worse than none, and crypto's
        24/7 day is not the same day as an Oslo Børs session anyway.
      */}
      <Card className="px-4 py-3">
        <p className="text-[0.8125rem] text-ink-muted leading-relaxed">
          Dagsendring kommer når kurshistorikk er på plass. Verdiene over bygger på siste
          registrerte kurs.
        </p>
      </Card>
    </div>
  )
}

function Header({ asOf }: { asOf: string }) {
  return (
    <div className="mb-5 flex items-baseline justify-between">
      <Eyebrow>Portefølje</Eyebrow>
      <span className="text-[0.75rem] text-ink-faint">{formatShortDate(asOf)}</span>
    </div>
  )
}
