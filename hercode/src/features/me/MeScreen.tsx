import { ChevronRight, Moon, RotateCcw, Shield, Split, Users } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/Button';
import { Sheet } from '../../components/Sheet';
import { copy } from '../../copy';
import type { MeRoute } from '../../domain/types';
import { useHerCode } from '../../store/useHerCode';

/**
 * The hub. It lists only what exists — Cycle and Notifications appear when
 * their screens do.
 */
export function MeScreen({
  onNavigate,
  onWrapUpDay,
}: {
  onNavigate: (route: MeRoute) => void;
  onWrapUpDay: () => void;
}) {
  const resetDemoData = useHerCode((s) => s.resetDemoData);
  const [confirmReset, setConfirmReset] = useState(false);

  const rows: Array<{
    route: MeRoute;
    label: string;
    hint: string;
    Icon: typeof Users;
  }> = [
    { route: 'partner', label: copy.me.partner, hint: copy.me.partnerHint, Icon: Users },
    { route: 'decisions', label: copy.me.decisions, hint: copy.me.decisionsHint, Icon: Split },
    { route: 'privacy', label: copy.me.privacy, hint: copy.me.privacyHint, Icon: Shield },
  ];

  return (
    <div className="no-scrollbar h-full overflow-y-auto px-4 pb-28 pt-5">
      <h1 className="mb-4 px-1 font-display text-[27px] leading-tight text-ink">
        {copy.me.title}
      </h1>

      <div className="space-y-2">
        {rows.map(({ route, label, hint, Icon }) => (
          <button
            key={route}
            type="button"
            onClick={() => onNavigate(route)}
            className="tap flex w-full items-center gap-3 rounded-card bg-surface px-4 py-3 text-left shadow-soft transition-colors duration-200 hover:bg-sand/30"
          >
            <Icon size={19} aria-hidden className="shrink-0 text-ink/55" />
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] leading-snug text-ink">{label}</span>
              <span className="mt-0.5 block text-[13px] leading-snug text-muted">{hint}</span>
            </span>
            <ChevronRight size={18} aria-hidden className="shrink-0 text-muted" />
          </button>
        ))}

        {/* Not a route: the review is the same sheet Today opens after 18:00. */}
        <button
          type="button"
          onClick={onWrapUpDay}
          className="tap flex w-full items-center gap-3 rounded-card bg-surface px-4 py-3 text-left shadow-soft transition-colors duration-200 hover:bg-sand/30"
        >
          <Moon size={19} aria-hidden className="shrink-0 text-ink/55" />
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] leading-snug text-ink">{copy.me.review}</span>
            <span className="mt-0.5 block text-[13px] leading-snug text-muted">
              {copy.me.reviewHint}
            </span>
          </span>
          <ChevronRight size={18} aria-hidden className="shrink-0 text-muted" />
        </button>

        <button
          type="button"
          onClick={() => setConfirmReset(true)}
          className="tap flex w-full items-center gap-3 rounded-card bg-surface px-4 py-3 text-left shadow-soft transition-colors duration-200 hover:bg-sand/30"
        >
          <RotateCcw size={19} aria-hidden className="shrink-0 text-ink/55" />
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] leading-snug text-ink">{copy.me.reset}</span>
            <span className="mt-0.5 block text-[13px] leading-snug text-muted">
              {copy.me.resetHint}
            </span>
          </span>
        </button>
      </div>

      <Sheet
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title={copy.me.resetConfirmTitle}
        footer={
          <div className="flex items-center gap-3">
            <Button variant="quiet" onClick={() => setConfirmReset(false)}>
              {copy.common.cancel}
            </Button>
            <Button
              variant="primary"
              full
              onClick={() => {
                resetDemoData();
                setConfirmReset(false);
              }}
            >
              {copy.me.resetConfirm}
            </Button>
          </div>
        }
      >
        <p className="text-[15px] leading-relaxed text-ink/85">{copy.me.resetConfirmBody}</p>
      </Sheet>
    </div>
  );
}
