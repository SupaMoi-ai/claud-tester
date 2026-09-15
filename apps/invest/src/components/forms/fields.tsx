'use client'

import type { ReactNode } from 'react'
import { useFormStatus } from 'react-dom'
import { cx } from '@/components/ui/primitives'

const CONTROL =
  'h-12 w-full rounded-xl border border-line bg-surface px-3.5 text-[1rem] text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-soft'

/**
 * Label + control + hint.
 *
 * The association is explicit via `htmlFor` rather than relying on the label
 * wrapping its input: every control below sets `id` from its `name`, which is
 * unique within a form, so screen readers get a real pairing and the
 * relationship survives any future layout change.
 */
export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string
  hint?: string
  /** The `name` of the control inside, which is also used as its id. */
  htmlFor?: string
  children: ReactNode
}) {
  return (
    <div className="block">
      <label htmlFor={htmlFor} className="mb-1.5 block font-medium text-[0.8125rem] text-ink">
        {label}
      </label>
      {children}
      {hint && (
        <span className="mt-1 block text-[0.75rem] text-ink-faint leading-snug">{hint}</span>
      )}
    </div>
  )
}

/**
 * A numeric input that stays a text input.
 *
 * `type="number"` rejects "1 234,56" and silently discards the value on some
 * mobile browsers. The value is parsed server-side by parseNbNumber, which
 * understands Norwegian formatting; the keyboard hint is all that's needed here.
 */
export function NumberInput(props: {
  name: string
  defaultValue?: string
  placeholder?: string
  required?: boolean
}) {
  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      id={props.name}
      className={CONTROL}
      {...props}
    />
  )
}

export function TextInput(props: {
  name: string
  defaultValue?: string
  placeholder?: string
  required?: boolean
  maxLength?: number
}) {
  return <input type="text" autoComplete="off" id={props.name} className={CONTROL} {...props} />
}

export function DateInput(props: { name: string; defaultValue?: string; required?: boolean }) {
  return <input type="date" id={props.name} className={CONTROL} {...props} />
}

export function Select({
  name,
  defaultValue,
  options,
}: {
  name: string
  defaultValue?: string | undefined
  options: ReadonlyArray<{ value: string; label: string }>
}) {
  return (
    <select
      name={name}
      id={name}
      defaultValue={defaultValue}
      className={cx(CONTROL, 'appearance-none pr-9')}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function TextArea({
  name,
  defaultValue,
  placeholder,
  rows = 3,
  required,
}: {
  name: string
  defaultValue?: string
  placeholder?: string
  rows?: number
  required?: boolean
}) {
  return (
    <textarea
      name={name}
      id={name}
      defaultValue={defaultValue}
      placeholder={placeholder}
      rows={rows}
      required={required}
      className="w-full resize-y rounded-xl border border-line bg-surface px-3.5 py-3 text-[1rem] text-ink leading-relaxed placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-soft"
    />
  )
}

export function SubmitButton({
  children,
  variant = 'primary',
}: {
  children: ReactNode
  variant?: 'primary' | 'secondary'
}) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className={cx(
        'h-12 w-full rounded-xl font-medium text-[0.9375rem] transition-opacity disabled:opacity-60',
        variant === 'primary' ? 'bg-accent text-white' : 'border border-line bg-surface text-ink',
      )}
    >
      {pending ? 'Lagrer…' : children}
    </button>
  )
}

export function FormMessage({
  state,
}: {
  state:
    | { status: 'idle' }
    | { status: 'saved'; message: string }
    | { status: 'error'; message: string }
}) {
  if (state.status === 'idle') return null
  return (
    <p
      role={state.status === 'error' ? 'alert' : 'status'}
      className={cx('text-[0.875rem]', state.status === 'error' ? 'text-down' : 'text-up')}
    >
      {state.message}
    </p>
  )
}
