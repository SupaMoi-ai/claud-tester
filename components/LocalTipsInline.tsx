"use client";

import type { LocalTipDTO } from "@/lib/types";

export default function LocalTipsInline({ tips }: { tips: LocalTipDTO[] }) {
  if (!tips.length) return null;
  return (
    <section className="mt-4">
      <h3 className="text-xs uppercase tracking-wide text-ink/50 mb-2">Local tips</h3>
      <ul className="space-y-2">
        {tips.map((t) => (
          <li key={t.id} className="rounded-xl border border-ink/10 p-3">
            <p className="text-sm font-medium">{t.title}</p>
            <p className="text-xs text-ink/70 mt-1">{t.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
