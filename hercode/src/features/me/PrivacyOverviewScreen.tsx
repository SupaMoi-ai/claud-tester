import { ArrowLeft } from 'lucide-react';
import { Button } from '../../components/Button';
import { copy } from '../../copy';
import { projectForPartner } from '../../domain/projectForPartner';
import { useHerCode } from '../../store/useHerCode';
import { PartnerPreviewPanel } from '../partner/PartnerPreviewPanel';

/** Privacy as a visible feature, not a policy page. */
export function PrivacyOverviewScreen({
  onBack,
  onManageSharing,
}: {
  onBack: () => void;
  onManageSharing: () => void;
}) {
  const state = useHerCode();
  const projection = projectForPartner(state, state.today());

  const tiers = [
    { title: copy.privacy.privateTitle, body: copy.privacy.privateBody, tone: 'bg-surface' },
    { title: copy.privacy.sharedTitle, body: copy.privacy.sharedBody, tone: 'bg-sage/25' },
    { title: copy.privacy.signalTitle, body: copy.privacy.signalBody, tone: 'bg-dusty/25' },
  ];

  return (
    <div className="no-scrollbar h-full overflow-y-auto px-4 pb-28 pt-5">
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
          {copy.privacy.title}
        </h1>
      </header>
      <p className="mb-4 mt-1 px-1 text-[14px] leading-snug text-muted">
        {copy.privacy.intro}
      </p>

      <div className="space-y-2">
        {tiers.map((tier) => (
          <section key={tier.title} className={`rounded-card p-4 ${tier.tone} shadow-soft`}>
            <h2 className="font-display text-[18px] leading-snug text-ink">{tier.title}</h2>
            <p className="mt-1 text-[14px] leading-snug text-ink/75">{tier.body}</p>
          </section>
        ))}
      </div>

      <div className="mt-6">
        <PartnerPreviewPanel projection={projection} title={copy.privacy.liveTitle} />
      </div>

      <Button full className="mt-4" onClick={onManageSharing}>
        {copy.privacy.manage}
      </Button>
    </div>
  );
}
