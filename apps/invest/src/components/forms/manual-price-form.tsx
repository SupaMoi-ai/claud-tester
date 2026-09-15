'use client'

import { useActionState } from 'react'
import { type ActionState, setManualPrice } from '@/app/(app)/beholdning/actions'
import { Card } from '@/components/ui/primitives'
import { DateInput, Field, FormMessage, NumberInput, SubmitButton } from './fields'

/**
 * Manual price entry.
 *
 * This is what makes the app usable before any market-data provider exists:
 * you type the number you can see, and it is recorded with source 'manual' and
 * its own date, so the app can tell you later that it has gone stale.
 */
export function ManualPriceForm({
  instrumentId,
  currency,
  defaultDate,
  currentPrice,
}: {
  instrumentId: string
  currency: string
  defaultDate: string
  currentPrice: string
}) {
  const [state, action] = useActionState<ActionState, FormData>(setManualPrice, { status: 'idle' })

  return (
    <Card className="px-4 py-4">
      <form action={action} className="space-y-3">
        <input type="hidden" name="instrumentId" value={instrumentId} />
        <input type="hidden" name="currency" value={currency} />

        <div className="grid grid-cols-2 gap-3">
          <Field label={`Kurs (${currency})`} htmlFor="close">
            <NumberInput name="close" defaultValue={currentPrice} placeholder="11,15" required />
          </Field>
          <Field label="Dato" htmlFor="asOf">
            <DateInput name="asOf" defaultValue={defaultDate} required />
          </Field>
        </div>

        <SubmitButton variant="secondary">Lagre kurs</SubmitButton>
        <FormMessage state={state} />

        <p className="text-[0.75rem] text-ink-faint leading-relaxed">
          Registreres som manuelt satt. Appen merker kursen som utdatert etter hvert, i stedet for å
          late som den er fersk.
        </p>
      </form>
    </Card>
  )
}
