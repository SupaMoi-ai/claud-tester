import Link from 'next/link'
import { cx } from '@/components/ui/primitives'
import type { DetectorHit } from '@/domain/detectors/run'

/**
 * At most three findings, most severe first.
 *
 * The cap is the point. A feed that shows everything it noticed is a feed
 * nobody reads, and the whole promise of this screen is that ten seconds is
 * enough. Anything below the cut is still on the Insights tab.
 */
const MAX_VISIBLE = 3

export function AttentionStrip({ hits }: { hits: readonly DetectorHit[] }) {
  if (hits.length === 0) return null

  const visible = hits.slice(0, MAX_VISIBLE)
  const remaining = hits.length - visible.length

  return (
    <section aria-label="Krever oppmerksomhet" className="space-y-2">
      {visible.map((hit) => (
        <AttentionCard key={hit.fingerprint} hit={hit} />
      ))}

      {remaining > 0 && (
        <Link
          href="/innsikt"
          className="block px-1 py-1 text-[0.8125rem] text-ink-muted underline-offset-2 hover:underline"
        >
          {remaining === 1 ? 'Ett funn til' : `${remaining} funn til`} i Innsikt
        </Link>
      )}
    </section>
  )
}

function AttentionCard({ hit }: { hit: DetectorHit }) {
  const urgent = hit.severity >= 4
  const body = (
    <div
      className={cx(
        'rounded-card border px-4 py-3',
        urgent ? 'border-warn/30 bg-warn-soft' : 'border-line bg-surface',
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden
          className={cx(
            'mt-[0.4rem] size-1.5 shrink-0 rounded-full',
            urgent ? 'bg-warn' : 'bg-ink-faint',
          )}
        />
        <div className="min-w-0">
          <p className="font-medium text-[0.875rem] text-ink leading-snug">{hit.headline}</p>
          {hit.detail && (
            <p className="mt-1 text-[0.8125rem] text-ink-muted leading-relaxed">{hit.detail}</p>
          )}
        </div>
      </div>
    </div>
  )

  return hit.subjectId ? (
    <Link href={`/beholdning/${hit.subjectId}`} className="block active:opacity-80">
      {body}
    </Link>
  ) : (
    body
  )
}
