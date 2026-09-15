'use client'

import { useActionState, useState } from 'react'
import {
  type ActionState,
  addTransaction,
  correctTransaction,
} from '@/app/(app)/beholdning/actions'
import { Card } from '@/components/ui/primitives'
import {
  DateInput,
  Field,
  FormMessage,
  NumberInput,
  Select,
  SubmitButton,
  TextInput,
} from './fields'

const TYPES = [
  { value: 'BUY', label: 'Kjøp' },
  { value: 'SELL', label: 'Salg' },
  { value: 'OPENING_BALANCE', label: 'Inngående beholdning' },
  { value: 'TRANSFER_IN', label: 'Overført inn' },
  { value: 'TRANSFER_OUT', label: 'Overført ut' },
  { value: 'STAKING_REWARD', label: 'Belønning / staking' },
  { value: 'AIRDROP', label: 'Airdrop' },
] as const

const CONFIDENCE = [
  { value: 'KNOWN', label: 'Kjent — jeg har sluttseddelen' },
  { value: 'ESTIMATED', label: 'Anslått — utledet fra noe annet' },
  { value: 'UNKNOWN', label: 'Ukjent — jeg vet ikke hva jeg betalte' },
] as const

export type Correcting = {
  id: string
  accountId: string
  instrumentId: string
  type: string
  tradeDate: string
  quantity: string
  price: string
  note: string
}

export function TransactionForm({
  accounts,
  instruments,
  defaultDate,
  defaultInstrumentId,
  correcting,
}: {
  accounts: ReadonlyArray<{ id: string; name: string; currency: string }>
  instruments: ReadonlyArray<{ id: string; label: string; currency: string }>
  defaultDate: string
  defaultInstrumentId?: string | undefined
  correcting?: Correcting | undefined
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    correcting ? correctTransaction : addTransaction,
    { status: 'idle' },
  )

  const [instrumentId, setInstrumentId] = useState(
    correcting?.instrumentId ?? defaultInstrumentId ?? instruments[0]?.id ?? '',
  )
  const [confidence, setConfidence] = useState<string>(correcting ? 'KNOWN' : 'KNOWN')

  const currency = instruments.find((i) => i.id === instrumentId)?.currency ?? 'NOK'
  const foreign = currency !== 'NOK'

  return (
    <Card className="px-4 py-4">
      <form action={action} className="space-y-4">
        {correcting && <input type="hidden" name="reversesTransactionId" value={correcting.id} />}
        <input type="hidden" name="currency" value={currency} />

        <Field label="Investering" htmlFor="instrumentId">
          <select
            name="instrumentId"
            value={instrumentId}
            onChange={(e) => setInstrumentId(e.target.value)}
            className="h-12 w-full appearance-none rounded-xl border border-line bg-surface px-3.5 pr-9 text-[1rem] text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-soft"
          >
            {instruments.map((i) => (
              <option key={i.id} value={i.id}>
                {i.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Konto" htmlFor="accountId">
          <Select
            name="accountId"
            defaultValue={correcting?.accountId ?? accounts[0]?.id}
            options={accounts.map((a) => ({ value: a.id, label: a.name }))}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Type" htmlFor="type">
            <Select
              name="type"
              defaultValue={correcting?.type ?? 'BUY'}
              options={TYPES.map((t) => ({ value: t.value, label: t.label }))}
            />
          </Field>
          <Field label="Dato" htmlFor="tradeDate">
            <DateInput
              name="tradeDate"
              defaultValue={correcting?.tradeDate ?? defaultDate}
              required
            />
          </Field>
        </div>

        <Field
          label="Antall"
          hint="Skriv tallet som det står. Komma som desimalskille, mellomrom i tusenskille — begge deler forstås."
          htmlFor="quantity"
        >
          <NumberInput
            name="quantity"
            defaultValue={correcting?.quantity ?? ''}
            placeholder="0,01022079"
            required
          />
        </Field>

        <Field label="Kjøpspris" htmlFor="costBasisConfidence">
          <Select
            name="costBasisConfidence"
            defaultValue={confidence}
            options={CONFIDENCE.map((c) => ({ value: c.value, label: c.label }))}
          />
        </Field>
        {/*
          Kept in sync via a change handler on a second, hidden control rather
          than controlling the select above, so the form still works without JS.
        */}
        <select
          aria-hidden
          tabIndex={-1}
          value={confidence}
          onChange={(e) => setConfidence(e.target.value)}
          className="sr-only"
        >
          {CONFIDENCE.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>

        <div className="grid grid-cols-2 gap-3">
          <Field label={`Kurs (${currency})`} htmlFor="price">
            <NumberInput name="price" defaultValue={correcting?.price ?? ''} placeholder="11,15" />
          </Field>
          <Field label="Gebyr" htmlFor="fee">
            <NumberInput name="fee" placeholder="0" />
          </Field>
        </div>

        {foreign && (
          <Field
            label="Valutakurs til NOK"
            hint="Kursen som gjaldt da handelen ble gjort. Uten den kan ikke valutaeffekten skilles fra avkastningen."
            htmlFor="fxRateToNok"
          >
            <NumberInput name="fxRateToNok" placeholder="10,42" />
          </Field>
        )}

        <Field label="Notat" htmlFor="note">
          <TextInput name="note" defaultValue={correcting?.note ?? ''} maxLength={500} />
        </Field>

        <SubmitButton>{correcting ? 'Bekreft og erstatt' : 'Legg til'}</SubmitButton>
        <FormMessage state={state} />
      </form>
    </Card>
  )
}
