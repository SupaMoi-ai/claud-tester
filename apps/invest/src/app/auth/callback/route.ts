import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Exchanges the magic-link code for a session.
 *
 * `neste` is validated as a relative path before use: an open redirect here
 * would let a crafted email bounce a signed-in session to another origin.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const requested = searchParams.get('neste') ?? '/'
  const next = requested.startsWith('/') && !requested.startsWith('//') ? requested : '/'

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/feil?grunn=mangler-kode`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/auth/feil?grunn=${encodeURIComponent(error.message)}`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
