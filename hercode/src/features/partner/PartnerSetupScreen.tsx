import { ArrowLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/Button';
import { SectionTitle } from '../../components/Card';
import { Chip } from '../../components/Chip';
import { Sheet } from '../../components/Sheet';
import { Toggle } from '../../components/Toggle';
import { copy } from '../../copy';
import { projectForPartner } from '../../domain/projectForPartner';
import type { ShareableCategory, SignalValue } from '../../domain/types';
import { useHerCode } from '../../store/useHerCode';
import { PartnerPreviewPanel } from './PartnerPreviewPanel';

const CATEGORIES: ShareableCategory[] = ['appointment', 'household', 'shopping', 'family'];

const SIGNALS: SignalValue[] = [
  'low-capacity',
  'need-quiet',
  'could-use-affection',
  'mentally-overloaded',
  'feeling-social',
  'need-practical-help',
  'want-to-talk',
];

/** She controls what is shared here, and watches the preview change as she does. */
export function PartnerSetupScreen({
  onBack,
  onOpenBroCode,
}: {
  onBack: () => void;
  onOpenBroCode: () => void;
}) {
  const state = useHerCode();
  const today = state.today();
  const [confirmCycle, setConfirmCycle] = useState(false);

  const projection = projectForPartner(state, today);
  const signal = state.partnerSignal?.date === today ? state.partnerSignal.value : null;

  return (
    <div className="no-scrollbar h-full overflow-y-auto px-4 pt-5">
      <header className="flex items-center gap-2 px-1">
        <button
          type="button"
          onClick={onBack}
          aria-label={copy.common.back}
          className="tap -ml-3 flex items-center justify-center rounded-chip text-ink/70 transition-colors duration-200 hover:text-ink"
        >
          <ArrowLeft size={20} aria-hidden />
        </button>
        <h1 className="font-display text-[24px] leading-tight text-ink">
          {copy.partner.title}
        </h1>
      </header>

      <div className="mt-5">
        <Toggle
          label={
            state.profile.partnerConnected
              ? copy.partner.connected(state.profile.partnerName)
              : copy.partner.notConnected
          }
          checked={state.profile.partnerConnected}
          onChange={state.setPartnerConnected}
        />
      </div>

      <section className="mt-6">
        <SectionTitle>{copy.partner.sharingTitle}</SectionTitle>
        <p className="mb-2 px-1 text-[13px] leading-snug text-muted">
          {copy.partner.sharingHint}
        </p>
        <div className="space-y-2">
          {CATEGORIES.map((category) => (
            <Toggle
              key={category}
              label={copy.partner.categories[category]}
              checked={state.sharing.categories[category]}
              onChange={(next) => state.setSharing(category, next)}
            />
          ))}
        </div>
      </section>

      <section className="mt-6">
        <SectionTitle>{copy.partner.signalTitle}</SectionTitle>
        <p className="mb-2 px-1 text-[13px] leading-snug text-muted">
          {copy.partner.signalHint}
        </p>
        <div className="flex flex-wrap gap-2">
          <Chip
            selected={signal === null}
            onClick={() => state.setSignal(null)}
            className="px-3 py-1.5 text-[14px]"
          >
            {copy.partner.signalNone}
          </Chip>
          {SIGNALS.map((value) => (
            <Chip
              key={value}
              selected={signal === value}
              onClick={() => state.setSignal({ value, date: today })}
              className="px-3 py-1.5 text-[14px]"
            >
              {copy.signals[value]}
            </Chip>
          ))}
        </div>
      </section>

      {/* No section heading: the toggle's own label says the same thing. */}
      <section className="mt-6">
        <Toggle
          tone="careful"
          label={copy.partner.cycleTitle}
          hint={state.sharing.cycleDetail ? copy.partner.cycleOn : copy.partner.cycleHint}
          checked={state.sharing.cycleDetail}
          onChange={(next) => {
            // Turning it on asks first. Turning it off never does.
            if (next) setConfirmCycle(true);
            else state.setCycleDetailSharing(false);
          }}
        />
      </section>

      <button
        type="button"
        onClick={onOpenBroCode}
        className="tap mt-6 flex w-full items-center justify-between gap-2 rounded-card bg-surface px-4 text-[15px] font-medium text-ink shadow-soft transition-colors duration-200 hover:bg-sand/40"
      >
        {copy.partner.openBroCode}
        <ChevronRight size={18} aria-hidden className="shrink-0 text-muted" />
      </button>

      {/* Last in the flow, so it pins for the whole scroll and never covers
          a control. A preview that scrolls out of sight is not live: she has
          to see it change as she flips the toggles above. */}
      <div className="sticky bottom-0 -mx-4 mt-6 border-t border-line bg-bg px-4 py-3">
        <PartnerPreviewPanel projection={projection} />
      </div>

      <Sheet
        open={confirmCycle}
        onOpenChange={setConfirmCycle}
        title={copy.partner.cycleConfirmTitle}
        footer={
          <div className="flex items-center gap-3">
            <Button variant="quiet" onClick={() => setConfirmCycle(false)}>
              {copy.common.cancel}
            </Button>
            <Button
              variant="primary"
              full
              onClick={() => {
                state.setCycleDetailSharing(true);
                setConfirmCycle(false);
              }}
            >
              {copy.partner.cycleConfirmYes}
            </Button>
          </div>
        }
      >
        <p className="text-[15px] leading-relaxed text-ink/85">
          {copy.partner.cycleConfirmBody}
        </p>
      </Sheet>
    </div>
  );
}
