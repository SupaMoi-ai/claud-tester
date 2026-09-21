import { ArrowLeft, Lock, Settings2 } from 'lucide-react';
import { copy } from '../../copy';
import type { PartnerProjection } from '../../domain/projectForPartner';
import { PartnerPreviewPanel } from './PartnerPreviewPanel';

/**
 * The companion app, as Jonas sees it.
 *
 * It takes a PartnerProjection and nothing else — no store, no private slices.
 * src/test/privacy.test.ts asserts this file never reaches for either.
 *
 * Same design system as HerCode, with dusty blue leading instead of sage, so
 * it reads as a sibling app rather than a second product.
 */
export function BroCodePreview({
  projection,
  onBack,
  onManageSharing,
}: {
  projection: PartnerProjection;
  onBack: () => void;
  onManageSharing: () => void;
}) {
  return (
    <div className="no-scrollbar h-full overflow-y-auto bg-dusty/45 px-4 pb-28 pt-5">
      <header className="flex items-center gap-2 px-1">
        <button
          type="button"
          onClick={onBack}
          aria-label={copy.common.back}
          className="tap -ml-3 flex items-center justify-center rounded-chip text-ink/70 transition-colors duration-200 hover:text-ink"
        >
          <ArrowLeft size={20} aria-hidden />
        </button>
        <div className="min-w-0">
          <h1 className="font-display text-[24px] leading-tight text-ink">
            {copy.brocode.name}
          </h1>
          <p className="text-[13px] text-ink/60">
            {copy.brocode.tagline(projection.userName)}
          </p>
        </div>
      </header>

      {!projection.hasSharedToday ? (
        <section className="mt-6 rounded-card bg-surface p-5 shadow-soft">
          <Lock size={18} aria-hidden className="text-ink/45" />
          <p className="mt-2 text-[17px] leading-snug text-ink">
            {copy.brocode.nothingShared(projection.userName)}
          </p>
          <p className="mt-2 text-[14px] leading-snug text-muted">
            {copy.brocode.nothingSharedHint}
          </p>
        </section>
      ) : (
        <>
          {projection.signal ? (
            <section className="mt-6 rounded-card bg-surface p-4 shadow-soft">
              <p className="text-[13px] text-muted">
                {copy.brocode.sharedTitle(projection.userName)}
              </p>
              <p className="mt-1 font-display text-[22px] leading-snug text-ink">
                {projection.signal.label}
              </p>
            </section>
          ) : null}

          {projection.cycleDetail ? (
            <section className="mt-3 rounded-card bg-lavender/35 px-4 py-3">
              <p className="text-[15px] text-ink">
                {copy.brocode.cycleDay(projection.cycleDetail.cycleDay)}
              </p>
            </section>
          ) : null}

          <section className="mt-6">
            <h2 className="mb-2 px-1 font-display text-[19px] text-ink">
              {copy.brocode.takeOverTitle}
            </h2>
            {projection.canTakeOver.length === 0 ? (
              <p className="px-1 text-[15px] text-muted">{copy.brocode.takeOverEmpty}</p>
            ) : (
              <ul className="space-y-2">
                {projection.canTakeOver.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-card bg-surface px-4 py-3 shadow-soft"
                  >
                    <p className="text-[16px] leading-snug text-ink">{item.title}</p>
                    <p className="mt-0.5 text-[12px] text-muted">{item.why}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-6 rounded-card bg-sand/50 p-4">
            <h2 className="text-[14px] font-medium text-ink">{copy.brocode.helpfulTitle}</h2>
            <p className="mt-1 text-[16px] leading-snug text-ink/85">
              {projection.helpfulToday}
            </p>
          </section>

          <section className="mt-6">
            <h2 className="mb-2 px-1 font-display text-[19px] text-ink">
              {copy.brocode.decisionsTitle}
            </h2>
            <ul className="divide-y divide-line overflow-hidden rounded-card bg-surface shadow-soft">
              {projection.decisions.map((decision) => (
                <li
                  key={decision.topic}
                  className="flex items-baseline justify-between gap-3 px-4 py-3"
                >
                  <span className="min-w-0 text-[15px] leading-snug text-ink">
                    {decision.topic}
                  </span>
                  <span className="shrink-0 text-[13px] text-muted">{decision.label}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {projection.hasSharedToday ? (
        <div className="mt-6">
          <PartnerPreviewPanel projection={projection} />
        </div>
      ) : null}

      <button
        type="button"
        onClick={onManageSharing}
        className="tap mt-4 flex w-full items-center justify-center gap-2 rounded-card bg-surface px-5 text-[15px] font-medium text-ink shadow-soft transition-colors duration-200 hover:bg-sand/40"
      >
        <Settings2 size={17} aria-hidden />
        {copy.brocode.manageSharing}
      </button>
    </div>
  );
}
