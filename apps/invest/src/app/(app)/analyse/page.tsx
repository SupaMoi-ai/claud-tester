import Link from 'next/link'
import { WatchlistForm } from '@/components/forms/watchlist-form'
import { Card, EmptyState, Eyebrow, SectionHeading } from '@/components/ui/primitives'
import { withUser } from '@/data/db'
import { listWatchlist } from '@/data/repos/journal'
import { listInstruments } from '@/data/repos/portfolio'
import { formatNok, formatShortDate } from '@/lib/format-nb'
import { requireUser } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Analyse' }

export default async function ResearchPage() {
  const user = await requireUser()

  const { watchlist, instruments } = await withUser(
    { userId: user.id, accessToken: user.accessToken },
    async (sql) => ({
      watchlist: await listWatchlist(sql),
      instruments: await listInstruments(sql),
    }),
  )

  return (
    <div className="space-y-5 py-8">
      <Eyebrow>Analyse</Eyebrow>

      <section>
        <SectionHeading>Vurderingsliste</SectionHeading>

        {watchlist.length === 0 ? (
          <EmptyState
            title="Ingen på vurderingslisten"
            body="Her samler du det du vurderer å kjøpe, sammen med hva som må skje før du gjør det."
          />
        ) : (
          <Card as="ul" className="divide-y divide-line">
            {watchlist.map((item) => (
              <li key={item.id} className="px-4 py-3.5">
                <div className="flex items-baseline justify-between gap-3">
                  <Link
                    href={`/beholdning/${item.instrumentId}`}
                    className="font-medium text-[0.9375rem] text-ink"
                  >
                    {item.instrumentName}
                  </Link>
                  {item.targetBuyPrice && (
                    <span className="tnum shrink-0 text-[0.875rem] text-ink-muted">
                      mål {formatNok(item.targetBuyPrice, { decimals: 2 })}
                    </span>
                  )}
                </div>
                {item.whatWouldMakeMeBuy && (
                  <p className="mt-1.5 text-[0.8125rem] text-ink-muted leading-relaxed">
                    {item.whatWouldMakeMeBuy}
                  </p>
                )}
                <p className="mt-1.5 text-[0.75rem] text-ink-faint">
                  Lagt til {formatShortDate(item.addedAt.slice(0, 10))}
                </p>
              </li>
            ))}
          </Card>
        )}
      </section>

      <WatchlistForm
        instruments={instruments.map((i) => ({ id: i.id, label: `${i.name} (${i.symbol})` }))}
      />

      {/*
        No "hot stocks" feed, ever. Research needs real market data, and
        Discover is only meaningful once the app knows what you already own
        well enough to say what would genuinely complement it.
      */}
      <Card className="px-4 py-4">
        <p className="font-medium text-[0.875rem] text-ink">Research og forslag</p>
        <p className="mt-1.5 text-[0.8125rem] text-ink-muted leading-relaxed">
          Søk, nøkkeltall og forslag som utfyller det du allerede eier kommer når markedsdata og
          AI-laget er koblet på. Appen viser ikke tall den ikke har.
        </p>
      </Card>
    </div>
  )
}
