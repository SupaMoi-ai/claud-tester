'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Card } from '@/components/ui/primitives'
import { type LoginState, sendMagicLink } from './actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-12 w-full rounded-xl bg-accent font-medium text-[0.9375rem] text-white transition-opacity disabled:opacity-60"
    >
      {pending ? 'Sender…' : 'Send innloggingslenke'}
    </button>
  )
}

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState<LoginState, FormData>(sendMagicLink, { status: 'idle' })

  if (state.status === 'sent') {
    return (
      <Card className="px-5 py-6">
        <p className="font-semibold text-[0.9375rem] text-ink">Sjekk e-posten din</p>
        <p className="mt-1.5 text-[0.875rem] text-ink-muted leading-relaxed">
          Vi har sendt deg en lenke. Åpne den på denne enheten, så er du inne.
        </p>
      </Card>
    )
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="sr-only">E-postadresse</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="din@epost.no"
          className="h-12 w-full rounded-xl border border-line bg-surface px-4 text-[1rem] text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-soft"
        />
      </label>

      <SubmitButton />

      {state.status === 'error' && (
        <p role="alert" className="text-[0.875rem] text-down">
          {state.message}
        </p>
      )}
    </form>
  )
}
