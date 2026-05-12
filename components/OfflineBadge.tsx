"use client";

export default function OfflineBadge({ fetchedAt }: { fetchedAt: string | null }) {
  if (!fetchedAt) return null;
  const t = new Date(fetchedAt);
  const mins = Math.max(1, Math.round((Date.now() - t.getTime()) / 60_000));
  return (
    <div className="absolute bottom-[58vh] right-3 z-20 rounded-full border border-ink/15 bg-paper/95 px-2.5 py-1 text-[11px]">
      Offline · cached {mins}m ago
    </div>
  );
}
