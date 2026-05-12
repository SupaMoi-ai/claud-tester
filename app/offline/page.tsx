export default function OfflinePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 text-center bg-paper text-ink">
      <div>
        <h1 className="text-xl font-medium">You are offline</h1>
        <p className="mt-2 text-sm text-ink/70">
          Reopen the app — your cached parking data is still available.
        </p>
      </div>
    </main>
  );
}
