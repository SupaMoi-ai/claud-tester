import Link from 'next/link'
import { TransactionForm } from '@/components/forms/transaction-form'
import { EmptyState, Eyebrow } from '@/components/ui/primitives'
import { withUser } from '@/data/db'
import { todayInOslo } from '@/data/portfolio-service'
import { listAccounts, listInstruments, listTransactions } from '@/data/repos/portfolio'
import { requireUser } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Ny transaksjon' }

export default async function NewTransactionPage({
  searchParams,
}: {
  searchParams: Promise<{ instrument?: string; korriger?: string }>
}) {
  const { instrument, korriger } = await searchParams
  const user = await requireUser()

  const { accounts, instruments, correcting } = await withUser(
    { userId: user.id, accessToken: user.accessToken },
    async (sql) => {
      const [accountRows, instrumentRows] = await Promise.all([
        listAccounts(sql),
        listInstruments(sql),
      ])
      let target = null
      if (korriger) {
        const all = await listTransactions(sql)
        target = all.find((t) => t.id === korriger) ?? null
      }
      return { accounts: accountRows, instruments: instrumentRows, correcting: target }
    },
  )

  if (accounts.length === 0 || instruments.length === 0) {
    return (
      <div className="space-y-5 py-8">
        <Link href="/" className="inline-block text-[0.875rem] text-accent">
          ← Portefølje
        </Link>
        <EmptyState
          title="Ingen kontoer eller investeringer ennå"
          body="Kjør seed-skriptet i Supabase, eller opprett en konto og en investering først. Se SETUP.md."
        />
      </div>
    )
  }

  return (
    <div className="space-y-5 py-8">
      <Link href="/" className="inline-block text-[0.875rem] text-accent">
        ← Portefølje
      </Link>

      <div>
        <Eyebrow>{correcting ? 'Korriger' : 'Ny transaksjon'}</Eyebrow>
        <h1 className="mt-1 font-semibold text-[1.25rem] text-ink tracking-tight">
          {correcting ? 'Bekreft beholdningen' : 'Legg til'}
        </h1>
        {correcting && (
          <p className="mt-2 text-[0.875rem] text-ink-muted leading-relaxed">
            Den opprinnelige oppføringen blir stående i historikken. Denne erstatter den, så du kan
            alltid se hva som ble endret og når.
          </p>
        )}
      </div>

      <TransactionForm
        accounts={accounts.map((a) => ({ id: a.id, name: a.name, currency: a.currency }))}
        instruments={instruments.map((i) => ({
          id: i.id,
          label: `${i.name} (${i.symbol})`,
          currency: i.currency,
        }))}
        defaultDate={todayInOslo()}
        defaultInstrumentId={instrument ?? correcting?.instrumentId}
        correcting={
          correcting
            ? {
                id: correcting.id,
                accountId: correcting.accountId,
                instrumentId: correcting.instrumentId,
                type: correcting.type,
                tradeDate: correcting.tradeDate,
                quantity: correcting.quantity?.toString() ?? '',
                price: correcting.price?.toString() ?? '',
                note: correcting.note ?? '',
              }
            : undefined
        }
      />
    </div>
  )
}
