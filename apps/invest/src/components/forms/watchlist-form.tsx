'use client'

import { useActionState, useState } from 'react'
import { type ActionState, addToWatchlist } from '@/app/(app)/journal/actions'
import { Card } from '@/components/ui/primitives'
import { Field, FormMessage, NumberInput, Select, SubmitButton, TextArea } from './fields'

export function WatchlistForm({
  instruments,
}: {
  instruments: ReadonlyArray<{ id: string; label: string }>
}) {
  const [state, action] = useActionState<ActionState, FormData>(addToWatchlist, { status: 'idle' })
  const [open, setOpen] = useState(false)

  if (instruments.length === 0) return null

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-12 w-full rounded-xl border border-line bg-surface font-medium text-[0.9375rem] text-ink"
      >
        Legg til på vurderingslisten
      </button>
    )
  }

  return (
    <Card className="px-4 py-4">
      <form action={action} className="space-y-4">
        <Field label="Investering" htmlFor="instrumentId">
          <Select
            name="instrumentId"
            options={instruments.map((i) => ({ value: i.id, label: i.label }))}
          />
        </Field>

        <Field label="Målkurs (valgfritt)" htmlFor="targetBuyPrice">
          <NumberInput name="targetBuyPrice" placeholder="95,00" />
        </Field>

        <Field
          label="Hva må skje før du kjøper?"
          htmlFor="whatWouldMakeMeBuy"
          hint="Å skrive det ned nå er det som gjør det mulig å se senere om du faktisk fulgte det."
        >
          <TextArea name="whatWouldMakeMeBuy" rows={3} />
        </Field>

        <SubmitButton>Lagre</SubmitButton>
        <FormMessage state={state} />

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="h-10 w-full rounded-xl text-[0.875rem] text-ink-muted"
        >
          Avbryt
        </button>
      </form>
    </Card>
  )
}
