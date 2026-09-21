import { useMemo } from 'react';
import { Button } from '../../components/Button';
import { copy } from '../../copy';
import { buildInsights } from '../../domain/insights';
import { useHerCode } from '../../store/useHerCode';
import { InsightCard } from './InsightCard';

/**
 * Everything here is computed from real events by /domain/insights. This
 * screen only arranges the results.
 */
export function PatternsScreen() {
  const history = useHerCode((s) => s.history);
  const tasks = useHerCode((s) => s.tasks);
  const checkIns = useHerCode((s) => s.checkIns);
  const reviews = useHerCode((s) => s.reviews);
  const cycleLogs = useHerCode((s) => s.cycleLogs);
  const cycleConsent = useHerCode((s) => s.profile.cycleConsent);
  const setCycleConsent = useHerCode((s) => s.setCycleConsent);
  const today = useHerCode((s) => s.today)();

  const insights = useMemo(
    () =>
      buildInsights({
        events: history,
        tasks,
        checkIns: Object.values(checkIns),
        reviews: Object.values(reviews),
        cycleLogs,
        cycleConsent: cycleConsent === 'yes',
        today,
      }),
    [history, tasks, checkIns, reviews, cycleLogs, cycleConsent, today],
  );

  return (
    <div className="no-scrollbar h-full overflow-y-auto px-4 pb-28 pt-5">
      <h1 className="px-1 font-display text-[27px] leading-tight text-ink">
        {copy.patterns.title}
      </h1>
      <p className="mb-1 mt-1 px-1 text-[14px] leading-snug text-muted">
        {copy.patterns.intro}
      </p>
      <p className="mb-4 px-1 text-[13px] text-muted">{copy.app.disclaimer}</p>

      <div className="space-y-3">
        {insights.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}

        {cycleConsent !== 'yes' ? (
          <section className="rounded-card bg-lavender/30 p-4">
            <h3 className="font-display text-[17px] leading-snug text-ink">
              {copy.patterns.cycleOffTitle}
            </h3>
            <p className="mt-1 text-[14px] leading-snug text-ink/75">
              {copy.patterns.cycleOffBody}
            </p>
            <Button className="mt-3" onClick={() => setCycleConsent('yes')}>
              {copy.patterns.cycleOffCta}
            </Button>
          </section>
        ) : null}
      </div>
    </div>
  );
}
