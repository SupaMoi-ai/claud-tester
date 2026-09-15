import Link from 'next/link'
import { Card } from '@/components/ui/primitives'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Innlogging feilet' }

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ grunn?: string }>
}) {
  const { grunn } = await searchParams

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5">
      <Card className="px-5 py-6">
        <h1 className="font-semibold text-[1.0625rem] text-ink">Innloggingen gikk ikke gjennom</h1>
        <p className="mt-1.5 text-[0.875rem] text-ink-muted leading-relaxed">
          Lenken kan ha utløpt eller allerede vært brukt. Be om en ny.
        </p>
        {grunn && (
          <p className="mt-3 rounded-lg bg-surface-sunken px-3 py-2 font-mono text-[0.75rem] text-ink-faint">
            {grunn}
          </p>
        )}
        <Link
          href="/logg-inn"
          className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl bg-accent font-medium text-[0.9375rem] text-white"
        >
          Prøv igjen
        </Link>
      </Card>
    </main>
  )
}
