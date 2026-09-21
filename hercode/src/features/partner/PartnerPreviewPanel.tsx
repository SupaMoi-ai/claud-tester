import { Eye } from 'lucide-react';
import { copy } from '../../copy';
import type { PartnerProjection } from '../../domain/projectForPartner';

/**
 * "This is what your partner can currently see."
 *
 * One renderer, shared by Partner setup, BroCode and Privacy overview, so the
 * three can never disagree about what is visible.
 */
export function PartnerPreviewPanel({
  projection,
  title = copy.partner.previewTitle,
}: {
  projection: PartnerProjection;
  title?: string;
}) {
  return (
    <section className="rounded-card border border-dusty bg-surface p-4">
      <h3 className="flex items-center gap-2 text-[14px] font-medium text-ink">
        <Eye size={15} aria-hidden className="shrink-0 text-ink/60" />
        {title}
      </h3>

      {projection.visibleSummary.length === 0 ? (
        <p className="mt-2 text-[15px] leading-snug text-ink/75">
          {copy.privacy.nothingLive}
        </p>
      ) : (
        <ul className="mt-2 space-y-1">
          {projection.visibleSummary.map((line) => (
            <li key={line} className="text-[15px] leading-snug text-ink">
              {line}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
