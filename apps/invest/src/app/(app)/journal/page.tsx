import { EmptyState, Eyebrow } from '@/components/ui/primitives'
import { requireUser } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Journal' }

export default async function JournalPage() {
  await requireUser()

  return (
    <div className="space-y-5 py-8">
      <Eyebrow>Journal</Eyebrow>
      <EmptyState
        title="Ingen beslutninger registrert"
        body="Skriv ned hva du gjorde og hva du forventet — også når du bestemte deg for å la være. Det er den delen du ikke husker riktig et år senere."
      />
    </div>
  )
}
