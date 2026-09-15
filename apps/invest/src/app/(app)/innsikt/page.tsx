import { AttentionStrip } from '@/components/portfolio/attention-strip'
import { Card, EmptyState, Eyebrow, SectionHeading } from '@/components/ui/primitives'
import { loadPortfolio } from '@/data/portfolio-service'
import { runDetectors } from '@/domain/detectors/run'
import { formatNok, formatPercent } from '@/lib/format-nb'
import { requireUser } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Innsikt' }

export default async function InsightsPage() {
  const user = await requireUser()
  const view = await loadPortfolio(user)

  if (view.isEmpty) {
    return (
      <div className="py-8">
        <Eyebrow>Innsikt</Eyebrow>
        <div className="mt-5">
          <EmptyState
            title="Ingenting å analysere ennå"
            body="Legg inn beholdningen din først, så finner appen konsentrasjon, overlapp og skjevheter."
          />
        </div>
      </div>
    )
  }

  const unconfirmed = new Map(
    view.transactions
      .filter((t) => t.costBasisConfidence === 'ESTIMATED')
      .map((t) => [t.instrumentId, t.note ?? 'Bekreft antall og kjøpspris.']),
  )

  const hits = runDetectors({
    valued: view.valuation.valued,
    unpriced: view.valuation.unpriced,
    weights: view.weights,
    concentration: view.concentration,
    byAssetClass: view.byAssetClass,
    totalBase: view.valuation.totalBase,
    asOf: view.asOf,
    ledgerWarnings: view.warnings,
    names: new Map([...view.instruments].map(([id, i]) => [id, i.name])),
    unconfirmed,
  })

  return (
    <div className="space-y-5 py-8">
      <Eyebrow>Innsikt</Eyebrow>

      <section>
        <SectionHeading>Funn</SectionHeading>
        {hits.length > 0 ? (
          <AttentionStrip hits={hits.slice(0, 20)} />
        ) : (
          <Card className="px-4 py-4">
            <p className="text-[0.875rem] text-ink-muted">
              Ingen funn akkurat nå. Porteføljen ser balansert ut på de målene appen kan vurdere.
            </p>
          </Card>
        )}
      </section>

      <section>
        <SectionHeading>Konsentrasjon</SectionHeading>
        <Card className="divide-y divide-line">
          <Row label="Antall posisjoner" value={String(view.concentration.count)} />
          <Row
            label="Effektivt antall"
            value={
              view.concentration.effectiveHoldings
                ?.toDecimalPlaces(2)
                .toString()
                .replace('.', ',') ?? '—'
            }
            hint="Hvor mange like store posisjoner som ville gitt samme konsentrasjon."
          />
          <Row label="Største posisjon" value={formatPercent(view.concentration.top1)} />
          <Row label="Tre største" value={formatPercent(view.concentration.top3)} />
          <Row label="Samlet verdi" value={formatNok(view.valuation.totalBase)} />
        </Card>
      </section>

      {/*
        Scenario analysis needs price history to estimate how assets move
        together, so it arrives with live market data rather than being faked
        with assumed correlations now.
      */}
      <Card className="px-4 py-4">
        <p className="font-medium text-[0.875rem] text-ink">Hva om?</p>
        <p className="mt-1.5 text-[0.8125rem] text-ink-muted leading-relaxed">
          Scenarioanalyse kommer når kurshistorikk er på plass. Å anslå hvordan posisjonene beveger
          seg sammen krever faktiske data, ikke antakelser.
        </p>
      </Card>
    </div>
  )
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="text-[0.875rem] text-ink">{label}</p>
        {hint && <p className="mt-0.5 text-[0.75rem] text-ink-faint leading-snug">{hint}</p>}
      </div>
      <span className="tnum shrink-0 font-medium text-[0.9375rem] text-ink">{value}</span>
    </div>
  )
}
