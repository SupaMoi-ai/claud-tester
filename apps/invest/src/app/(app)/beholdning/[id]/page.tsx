import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ManualPriceForm } from '@/components/forms/manual-price-form'
import { ThesisEditor } from '@/components/forms/thesis-editor'
import {
  Badge,
  Card,
  Figure,
  SectionHeading,
  StalenessNote,
  Unavailable,
} from '@/components/ui/primitives'
import { withUser } from '@/data/db'
import { loadPortfolio } from '@/data/portfolio-service'
import { getThesis } from '@/data/repos/thesis'
import { dec } from '@/domain/money'
import { formatNok, formatPercent, formatQuantity, formatShortDate } from '@/lib/format-nb'
import { requireUser } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function HoldingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireUser()
  const view = await loadPortfolio(user)

  const instrument = view.instruments.get(id)
  if (!instrument) notFound()

  const valued = view.valuation.valued.find((v) => v.position.instrumentId === id)
  const unpriced = view.valuation.unpriced.find((u) => u.position.instrumentId === id)
  const position = valued?.position ?? unpriced?.position
  const transactions = view.transactions.filter((t) => t.instrumentId === id)

  const thesis = await withUser({ userId: user.id, accessToken: user.accessToken }, async (sql) =>
    getThesis(sql, id),
  )

  const estimated = transactions.find((t) => t.costBasisConfidence === 'ESTIMATED')
  const costBasis = position?.costBasis

  return (
    <div className="space-y-5 py-8">
      <Link href="/" className="inline-block text-[0.875rem] text-accent">
        ← Portefølje
      </Link>

      <header>
        <div className="flex items-center gap-2">
          <h1 className="font-semibold text-[1.25rem] text-ink tracking-tight">
            {instrument.name}
          </h1>
          <Badge>{instrument.symbol}</Badge>
        </div>

        {valued ? (
          <>
            <div className="mt-3">
              <Figure size="lg">{formatNok(valued.valueBase)}</Figure>
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[0.875rem] text-ink-muted">
              <span className="tnum">{formatQuantity(position?.quantity ?? dec(0))}</span>
              <span aria-hidden>×</span>
              <span className="tnum">{formatNok(valued.price.price, { decimals: 2 })}</span>
              <StalenessNote
                staleness={valued.staleness}
                asOf={valued.price.asOf}
                source={valued.price.source}
              />
            </p>
            <p className="mt-1 text-[0.75rem] text-ink-faint">
              Kurs fra {valued.price.source}, {formatShortDate(valued.price.asOf)}
            </p>
          </>
        ) : (
          <div className="mt-3">
            <Unavailable reason={unpriced?.reason} />
            <p className="mt-1 text-[0.875rem] text-warn">
              Ingen kurs registrert, så verdien kan ikke beregnes.
            </p>
          </div>
        )}
      </header>

      {estimated && (
        <Card className="border-warn/30 bg-warn-soft px-4 py-3.5">
          <p className="font-medium text-[0.875rem] text-ink">Ikke bekreftet</p>
          <p className="mt-1 text-[0.8125rem] text-ink-muted leading-relaxed">
            {estimated.note ??
              'Antall og kjøpspris er utledet, ikke registrert fra en sluttseddel.'}
          </p>
          <Link
            href={{ pathname: '/beholdning/ny', query: { instrument: id, korriger: estimated.id } }}
            className="mt-3 inline-flex h-10 items-center rounded-lg bg-ink px-4 font-medium text-[0.875rem] text-white"
          >
            Bekreft eller korriger
          </Link>
        </Card>
      )}

      <section>
        <SectionHeading>Nøkkeltall</SectionHeading>
        <Card className="divide-y divide-line">
          {costBasis?.status === 'KNOWN' ? (
            <>
              <Row
                label="Kjøpspris per enhet"
                value={formatNok(costBasis.costPerUnit, { decimals: 2 })}
              />
              <Row label="Samlet kjøpspris" value={formatNok(costBasis.totalCost)} />
              {valued && costBasis.totalCostNok && (
                <Row
                  label="Urealisert"
                  value={`${valued.valueBase.minus(costBasis.totalCostNok).isNegative() ? '−' : '+'}${formatNok(
                    valued.valueBase.minus(costBasis.totalCostNok).abs(),
                  )}`}
                  secondary={
                    costBasis.totalCostNok.isZero()
                      ? undefined
                      : formatPercent(
                          valued.valueBase
                            .minus(costBasis.totalCostNok)
                            .div(costBasis.totalCostNok),
                          { signed: true },
                        )
                  }
                />
              )}
            </>
          ) : (
            <div className="px-4 py-3.5">
              <p className="text-[0.875rem] text-ink">Kjøpspris ukjent</p>
              <p className="mt-1 text-[0.8125rem] text-ink-muted leading-relaxed">
                {costBasis?.reason ??
                  'Uten kjøpspris kan avkastningen på denne posisjonen ikke beregnes.'}
              </p>
            </div>
          )}
          {position?.hasZeroCostUnits && (
            <div className="px-4 py-3">
              <p className="text-[0.8125rem] text-ink-muted">
                Noen enheter kom inn uten kostnad (belønning eller airdrop), som trekker
                gjennomsnittlig kjøpspris ned.
              </p>
            </div>
          )}
        </Card>
      </section>

      <section>
        <SectionHeading>Investeringstese</SectionHeading>
        <ThesisEditor instrumentId={id} instrumentName={instrument.name} thesis={thesis} />
      </section>

      <section>
        <SectionHeading>Kurs</SectionHeading>
        <ManualPriceForm
          instrumentId={id}
          currency={instrument.currency}
          defaultDate={view.asOf}
          currentPrice={valued?.price.price.toFixed(4) ?? ''}
        />
      </section>

      <section>
        <SectionHeading>Historikk</SectionHeading>
        <Card as="ul" className="divide-y divide-line">
          {transactions.length === 0 && (
            <li className="px-4 py-3.5 text-[0.875rem] text-ink-muted">
              Ingen transaksjoner registrert.
            </li>
          )}
          {transactions.map((t) => (
            <li key={t.id} className="flex items-baseline justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[0.875rem] text-ink">{TXN_LABEL[t.type] ?? t.type}</p>
                <p className="mt-0.5 text-[0.75rem] text-ink-faint">
                  {formatShortDate(t.tradeDate)}
                  {t.costBasisConfidence !== 'KNOWN' && ` · ${CONFIDENCE[t.costBasisConfidence]}`}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span className="tnum text-[0.875rem] text-ink">
                  {t.quantity ? formatQuantity(t.quantity) : '—'}
                </span>
                {t.price && (
                  <p className="tnum mt-0.5 text-[0.75rem] text-ink-faint">
                    @ {formatNok(t.price, { decimals: 2 })}
                  </p>
                )}
              </div>
            </li>
          ))}
        </Card>
      </section>
    </div>
  )
}

const TXN_LABEL: Record<string, string> = {
  OPENING_BALANCE: 'Inngående beholdning',
  BUY: 'Kjøp',
  SELL: 'Salg',
  TRANSFER_IN: 'Overført inn',
  TRANSFER_OUT: 'Overført ut',
  STAKING_REWARD: 'Belønning',
  AIRDROP: 'Airdrop',
  DIVIDEND: 'Utbytte',
  CORRECTION: 'Korrigering',
}

const CONFIDENCE: Record<string, string> = {
  ESTIMATED: 'anslått kjøpspris',
  UNKNOWN: 'ukjent kjøpspris',
  KNOWN: '',
}

function Row({
  label,
  value,
  secondary,
}: {
  label: string
  value: string
  secondary?: string | undefined
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-4 py-3">
      <span className="text-[0.875rem] text-ink">{label}</span>
      <span className="shrink-0 text-right">
        <span className="tnum font-medium text-[0.9375rem] text-ink">{value}</span>
        {secondary && (
          <span className="tnum ml-2 text-[0.8125rem] text-ink-faint">{secondary}</span>
        )}
      </span>
    </div>
  )
}
