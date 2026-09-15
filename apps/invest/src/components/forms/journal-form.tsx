'use client'

import { useActionState, useState } from 'react'
import { type ActionState, addJournalEntry } from '@/app/(app)/journal/actions'
import { Card } from '@/components/ui/primitives'
import {
  DateInput,
  Field,
  FormMessage,
  NumberInput,
  Select,
  SubmitButton,
  TextArea,
  TextInput,
} from './fields'

const KINDS = [
  { value: 'BOUGHT', label: 'Kjøpte' },
  { value: 'ADDED', label: 'Økte posisjon' },
  { value: 'REDUCED', label: 'Reduserte' },
  { value: 'SOLD', label: 'Solgte' },
  { value: 'DECIDED_NOT_TO_BUY', label: 'Valgte å ikke kjøpe' },
  { value: 'THESIS_REVIEW', label: 'Gjennomgikk tesen' },
  { value: 'NOTE', label: 'Notat' },
] as const

export function JournalForm({
  instruments,
  defaultDate,
}: {
  instruments: ReadonlyArray<{ id: string; label: string }>
  defaultDate: string
}) {
  const [state, action] = useActionState<ActionState, FormData>(addJournalEntry, {
    status: 'idle',
  })
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-12 w-full rounded-xl bg-accent font-medium text-[0.9375rem] text-white"
      >
        Registrer en beslutning
      </button>
    )
  }

  return (
    <Card className="px-4 py-4">
      <form action={action} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Hva gjorde du?" htmlFor="kind">
            <Select
              name="kind"
              defaultValue="NOTE"
              options={KINDS.map((k) => ({ value: k.value, label: k.label }))}
            />
          </Field>
          <Field label="Dato" htmlFor="occurredAt">
            <DateInput name="occurredAt" defaultValue={defaultDate} required />
          </Field>
        </div>

        <Field label="Investering (valgfritt)" htmlFor="instrumentId">
          <Select
            name="instrumentId"
            defaultValue=""
            options={[
              { value: '', label: 'Ingen spesifikk' },
              ...instruments.map((i) => ({ value: i.id, label: i.label })),
            ]}
          />
        </Field>

        <Field label="Tittel" htmlFor="title">
          <TextInput name="title" maxLength={200} placeholder="Kort oppsummering" />
        </Field>

        <Field
          label="Hvorfor?"
          htmlFor="body"
          hint="Skriv det du tenker nå, ikke det som høres fornuftig ut i ettertid."
        >
          <TextArea name="body" rows={4} required />
        </Field>

        <Field
          label="Hva forventet du skulle skje?"
          htmlFor="whatIExpected"
          hint="Dette er det appen senere kan holde opp mot det som faktisk skjedde."
        >
          <TextArea name="whatIExpected" rows={3} />
        </Field>

        <Field label="Overbevisning 1–5" htmlFor="conviction">
          <NumberInput name="conviction" placeholder="3" />
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
