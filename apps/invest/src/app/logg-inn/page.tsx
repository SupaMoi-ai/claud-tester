import { LoginForm } from './login-form'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Logg inn' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ neste?: string }>
}) {
  const { neste } = await searchParams

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8">
        <h1 className="font-semibold text-[1.75rem] text-ink tracking-tight">Portefølje</h1>
        <p className="mt-1.5 text-[0.9375rem] text-ink-muted">Din private investeringsoversikt.</p>
      </div>

      <LoginForm next={neste ?? '/'} />

      <p className="mt-8 text-[0.8125rem] text-ink-faint leading-relaxed">
        Du får en engangslenke på e-post. Ingen passord å huske, og ingenting av porteføljen din
        forlater din egen database.
      </p>
    </main>
  )
}
