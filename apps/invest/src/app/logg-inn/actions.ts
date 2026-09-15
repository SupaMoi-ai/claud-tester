'use server'

import { headers } from 'next/headers'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({
  email: z.string().email('Skriv inn en gyldig e-postadresse.'),
  next: z.string().startsWith('/').max(200).catch('/'),
})

export type LoginState =
  | { status: 'idle' }
  | { status: 'sent' }
  | { status: 'error'; message: string }

export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({
    email: formData.get('email'),
    next: formData.get('next') ?? '/',
  })

  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Ugyldig e-postadresse.' }
  }

  const origin = (await headers()).get('origin')
  if (!origin) {
    return { status: 'error', message: 'Klarte ikke å avgjøre adressen til appen.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?neste=${encodeURIComponent(parsed.data.next)}`,
      // Sign-ups are disabled in the Supabase dashboard once the single
      // account exists; this stops a stranger provisioning one by accident.
      shouldCreateUser: true,
    },
  })

  if (error) {
    return { status: 'error', message: `Kunne ikke sende lenken: ${error.message}` }
  }

  return { status: 'sent' }
}
