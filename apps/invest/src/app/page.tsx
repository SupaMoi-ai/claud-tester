export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-3 px-5">
      <p className="font-medium text-ink-faint text-xs uppercase tracking-widest">Portefølje</p>
      <h1 className="text-hero tnum">— kr</h1>
      <p className="text-ink-muted text-sm">
        Ingen data ennå. Databasen er ikke koblet til — se <code>SETUP.md</code>.
      </p>
    </main>
  )
}
