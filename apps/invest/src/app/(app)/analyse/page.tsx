import { Card, EmptyState, Eyebrow, SectionHeading } from '@/components/ui/primitives'
import { requireUser } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Analyse' }

export default async function ResearchPage() {
  await requireUser()

  return (
    <div className="space-y-5 py-8">
      <Eyebrow>Analyse</Eyebrow>

      <section>
        <SectionHeading>Vurderingsliste</SectionHeading>
        <EmptyState
          title="Ingen på vurderingslisten"
          body="Her samler du det du vurderer å kjøpe, sammen med hva som må skje før du gjør det."
        />
      </section>

      {/*
        No "hot stocks" feed, ever. Research needs real market data, and
        Discover is only meaningful once the app knows what you already own
        well enough to say what would complement it.
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
