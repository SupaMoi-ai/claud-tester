'use client'

import { useActionState, useState } from 'react'
import { type ActionState, saveThesisAction } from '@/app/(app)/beholdning/actions'
import { Badge, Card, cx } from '@/components/ui/primitives'
import type { Thesis } from '@/data/repos/thesis'
import { Field, FormMessage, NumberInput, SubmitButton, TextArea, TextInput } from './fields'

type DraftCondition = {
  /** Client-side only, so a row keeps its identity while being edited. */
  id: string
  kind: 'PRICE_LEVEL' | 'METRIC' | 'DATE' | 'DRAWDOWN' | 'WEIGHT' | 'MANUAL'
  subject: string
  operator: '<' | '<=' | '>' | '>=' | '=' | '!='
  threshold: string
  unit: string
  note: string
}

const KIND_OPTIONS = [
  { value: 'METRIC', label: 'Nøkkeltall' },
  { value: 'PRICE_LEVEL', label: 'Kursnivå' },
  { value: 'DRAWDOWN', label: 'Fall fra topp' },
  { value: 'WEIGHT', label: 'Andel av portefølje' },
  { value: 'DATE', label: 'Frist' },
  { value: 'MANUAL', label: 'Vurderes manuelt' },
] as const

const OPERATORS = [
  { value: '<', label: 'under' },
  { value: '<=', label: 'under eller lik' },
  { value: '>', label: 'over' },
  { value: '>=', label: 'over eller lik' },
  { value: '=', label: 'lik' },
] as const

export function ThesisEditor({
  instrumentId,
  instrumentName,
  thesis,
}: {
  instrumentId: string
  instrumentName: string
  thesis: Thesis | null
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveThesisAction, {
    status: 'idle',
  })
  const [editing, setEditing] = useState(thesis === null)
  const [conditions, setConditions] = useState<DraftCondition[]>(
    thesis?.conditions.map((c) => ({
      id: c.id,
      kind: c.kind,
      subject: c.subject,
      operator: c.operator as DraftCondition['operator'],
      threshold: c.threshold?.toString() ?? '',
      unit: c.unit ?? '',
      note: c.note ?? '',
    })) ?? [],
  )

  if (!editing && thesis) {
    return <ThesisView thesis={thesis} onEdit={() => setEditing(true)} />
  }

  return (
    <Card className="px-4 py-4">
      <form action={action} className="space-y-4">
        <input type="hidden" name="instrumentId" value={instrumentId} />
        <input
          type="hidden"
          name="conditions"
          value={JSON.stringify(
            conditions
              .filter((c) => c.subject.trim() !== '')
              .map((c) => ({
                kind: c.kind,
                subject: c.subject.trim(),
                operator: c.operator,
                threshold: c.threshold.trim() === '' ? null : c.threshold.trim(),
                unit: c.unit.trim() === '' ? null : c.unit.trim(),
                note: c.note.trim() === '' ? null : c.note.trim(),
              })),
          )}
        />

        <Field label="Tittel" htmlFor="title">
          <TextInput
            name="title"
            defaultValue={thesis?.title ?? instrumentName}
            required
            maxLength={200}
          />
        </Field>

        <Field label="Hvorfor eier jeg den?" htmlFor="whyIOwnIt">
          <TextArea
            name="whyIOwnIt"
            defaultValue={thesis?.whyIOwnIt ?? ''}
            placeholder="Hva er det du tror markedet ikke har tatt inn over seg?"
            rows={4}
            required
          />
        </Field>

        <Field label="Hva forventer jeg skal skje?" htmlFor="whatIExpect">
          <TextArea name="whatIExpect" defaultValue={thesis?.whatIExpect ?? ''} rows={3} />
        </Field>

        <Field label="Største risiko" htmlFor="mainRisks">
          <TextArea name="mainRisks" defaultValue={thesis?.mainRisks ?? ''} rows={3} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Tidshorisont (mnd)" htmlFor="horizonMonths">
            <NumberInput
              name="horizonMonths"
              defaultValue={thesis?.horizonMonths?.toString() ?? ''}
              placeholder="36"
            />
          </Field>
          <Field label="Overbevisning 1–5" htmlFor="conviction">
            <NumberInput
              name="conviction"
              defaultValue={thesis?.conviction?.toString() ?? ''}
              placeholder="3"
            />
          </Field>
        </div>

        <Field
          label="Hva ville fått meg til å ombestemme meg?"
          hint="Fritekst. Vilkårene under er den delen appen kan kontrollere selv."
          htmlFor="whatWouldChangeMyMind"
        >
          <TextArea
            name="whatWouldChangeMyMind"
            defaultValue={thesis?.whatWouldChangeMyMind ?? ''}
            rows={3}
          />
        </Field>

        <ConditionsEditor conditions={conditions} onChange={setConditions} />

        <SubmitButton>{thesis ? 'Lagre ny versjon' : 'Lagre tese'}</SubmitButton>
        <FormMessage state={state} />

        {thesis && (
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="h-10 w-full rounded-xl text-[0.875rem] text-ink-muted"
          >
            Avbryt
          </button>
        )}
      </form>
    </Card>
  )
}

/**
 * Structured invalidation conditions.
 *
 * Prose alone cannot be checked, which is why "has my investment case changed?"
 * is usually rhetorical. These give code something to evaluate — and they are
 * what lets the app distinguish a thesis that broke from a price that merely
 * fell.
 */
function ConditionsEditor({
  conditions,
  onChange,
}: {
  conditions: DraftCondition[]
  onChange: (next: DraftCondition[]) => void
}) {
  function update(index: number, patch: Partial<DraftCondition>) {
    onChange(conditions.map((c, i) => (i === index ? { ...c, ...patch } : c)))
  }

  return (
    <fieldset className="space-y-3 rounded-xl border border-line p-3">
      <legend className="px-1 font-medium text-[0.8125rem] text-ink">Vilkår som brister</legend>
      <p className="text-[0.75rem] text-ink-faint leading-relaxed">
        Konkrete ting appen kan følge med på. En kurs som faller er ikke i seg selv en brutt tese.
      </p>

      {conditions.map((condition, index) => (
        <div key={condition.id} className="space-y-2 rounded-lg bg-surface-sunken p-2.5">
          <div className="grid grid-cols-2 gap-2">
            <select
              value={condition.kind}
              onChange={(e) => update(index, { kind: e.target.value as DraftCondition['kind'] })}
              className="h-10 rounded-lg border border-line bg-surface px-2 text-[0.875rem]"
            >
              {KIND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              value={condition.operator}
              onChange={(e) =>
                update(index, { operator: e.target.value as DraftCondition['operator'] })
              }
              className="h-10 rounded-lg border border-line bg-surface px-2 text-[0.875rem]"
            >
              {OPERATORS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <input
            value={condition.subject}
            onChange={(e) => update(index, { subject: e.target.value })}
            placeholder="f.eks. kontantbeholdning i måneder"
            className="h-10 w-full rounded-lg border border-line bg-surface px-2.5 text-[0.875rem]"
          />

          <div className="grid grid-cols-2 gap-2">
            <input
              value={condition.threshold}
              onChange={(e) => update(index, { threshold: e.target.value })}
              inputMode="decimal"
              placeholder="12"
              className="h-10 rounded-lg border border-line bg-surface px-2.5 text-[0.875rem]"
            />
            <input
              value={condition.unit}
              onChange={(e) => update(index, { unit: e.target.value })}
              placeholder="måneder"
              className="h-10 rounded-lg border border-line bg-surface px-2.5 text-[0.875rem]"
            />
          </div>

          <button
            type="button"
            onClick={() => onChange(conditions.filter((_, i) => i !== index))}
            className="text-[0.8125rem] text-ink-muted"
          >
            Fjern vilkår
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() =>
          onChange([
            ...conditions,
            {
              id: crypto.randomUUID(),
              kind: 'METRIC',
              subject: '',
              operator: '<',
              threshold: '',
              unit: '',
              note: '',
            },
          ])
        }
        className="h-10 w-full rounded-lg border border-line border-dashed text-[0.875rem] text-ink-muted"
      >
        + Legg til vilkår
      </button>
    </fieldset>
  )
}

function ThesisView({ thesis, onEdit }: { thesis: Thesis; onEdit: () => void }) {
  return (
    <Card className="px-4 py-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-[0.9375rem] text-ink">{thesis.title}</p>
          <p className="mt-0.5 text-[0.75rem] text-ink-faint">
            Versjon {thesis.version}
            {thesis.conviction && ` · overbevisning ${thesis.conviction}/5`}
            {thesis.horizonMonths && ` · ${thesis.horizonMonths} mnd`}
          </p>
        </div>
        <button type="button" onClick={onEdit} className="shrink-0 text-[0.8125rem] text-accent">
          Endre
        </button>
      </div>

      <Block label="Hvorfor jeg eier den" body={thesis.whyIOwnIt} />
      {thesis.whatIExpect && <Block label="Forventning" body={thesis.whatIExpect} />}
      {thesis.mainRisks && <Block label="Risiko" body={thesis.mainRisks} />}
      {thesis.whatWouldChangeMyMind && (
        <Block label="Ville fått meg til å ombestemme meg" body={thesis.whatWouldChangeMyMind} />
      )}

      {thesis.conditions.length > 0 && (
        <div className="mt-4 border-line border-t pt-3">
          <p className="mb-2 font-medium text-[0.8125rem] text-ink">Vilkår</p>
          <ul className="space-y-1.5">
            {thesis.conditions.map((c) => (
              <li key={c.id} className="flex items-start gap-2 text-[0.8125rem]">
                <Badge tone={c.status === 'BREACHED' ? 'warn' : 'neutral'}>
                  {c.status === 'BREACHED' ? 'brutt' : c.status === 'HOLDING' ? 'holder' : 'ukjent'}
                </Badge>
                <span className={cx('text-ink-muted', c.status === 'BREACHED' && 'text-ink')}>
                  {c.subject} {c.operator} {c.threshold?.toString() ?? ''} {c.unit ?? ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}

function Block({ label, body }: { label: string; body: string }) {
  return (
    <div className="mt-3 first:mt-0">
      <p className="font-medium text-[0.75rem] text-ink-faint uppercase tracking-[0.06em]">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-[0.875rem] text-ink leading-relaxed">{body}</p>
    </div>
  )
}
