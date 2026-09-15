import Link from 'next/link'
import { JournalForm } from '@/components/forms/journal-form'
import { Badge, Card, EmptyState, Eyebrow, SectionHeading } from '@/components/ui/primitives'
import { withUser } from '@/data/db'
import { todayInOslo } from '@/data/portfolio-service'
import { type JournalKind, listJournal } from '@/data/repos/journal'
import { listInstruments } from '@/data/repos/portfolio'
import { formatShortDate } from '@/lib/format-nb'
import { requireUser } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Journal' }

const KIND_LABEL: Record<JournalKind, string> = {
  BOUGHT: 'Kjøpte',
  ADDED: 'Økte',
  REDUCED: 'Reduserte',
  SOLD: 'Solgte',
  DECIDED_NOT_TO_BUY: 'Valgte å ikke kjøpe',
  THESIS_REVIEW: 'Gjennomgang',
  NOTE: 'Notat',
}

export default async function JournalPage() {
  const user = await requireUser()

  const { entries, instruments } = await withUser(
    { userId: user.id, accessToken: user.accessToken },
    async (sql) => ({
      entries: await listJournal(sql),
      instruments: await listInstruments(sql),
    }),
  )

  return (
    <div className="space-y-5 py-8">
      <Eyebrow>Journal</Eyebrow>

      <JournalForm
        instruments={instruments.map((i) => ({ id: i.id, label: `${i.name} (${i.symbol})` }))}
        defaultDate={todayInOslo()}
      />

      {entries.length === 0 ? (
        <EmptyState
          title="Ingen beslutninger registrert"
          body="Skriv ned hva du gjorde og hva du forventet — også når du bestemte deg for å la være. Det er den delen du ikke husker riktig et år senere."
        />
      ) : (
        <section>
          <SectionHeading>Historikk</SectionHeading>
          <ol className="space-y-3">
            {entries.map((entry) => (
              <li key={entry.id}>
                <Card className="px-4 py-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={entry.kind === 'DECIDED_NOT_TO_BUY' ? 'accent' : 'neutral'}>
                      {KIND_LABEL[entry.kind]}
                    </Badge>
                    {entry.instrumentId && entry.instrumentName && (
                      <Link
                        href={`/beholdning/${entry.instrumentId}`}
                        className="text-[0.8125rem] text-accent"
                      >
                        {entry.instrumentName}
                      </Link>
                    )}
                    <span className="ml-auto text-[0.75rem] text-ink-faint">
                      {formatShortDate(entry.occurredAt.slice(0, 10))}
                    </span>
                  </div>

                  {entry.title && (
                    <p className="mt-2 font-medium text-[0.9375rem] text-ink">{entry.title}</p>
                  )}
                  <p className="mt-1.5 whitespace-pre-wrap text-[0.875rem] text-ink leading-relaxed">
                    {entry.body}
                  </p>

                  {entry.whatIExpected && (
                    <div className="mt-3 border-line border-t pt-2.5">
                      <p className="font-medium text-[0.6875rem] text-ink-faint uppercase tracking-[0.06em]">
                        Forventet
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-[0.8125rem] text-ink-muted leading-relaxed">
                        {entry.whatIExpected}
                      </p>
                    </div>
                  )}

                  {entry.conviction && (
                    <p className="mt-2 text-[0.75rem] text-ink-faint">
                      Overbevisning {entry.conviction}/5
                    </p>
                  )}
                </Card>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  )
}
