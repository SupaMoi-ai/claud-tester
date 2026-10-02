import { motion } from 'framer-motion';
import { TONES } from '../design/tones';
import type { ParentInsight } from './insights';

/**
 * One thing the child did today, told as a sentence.
 *
 * Big emoji, a plain title, one warm paragraph. No bar, no percentage badge,
 * no traffic light — the moment this card grows a metric it stops being
 * something a parent reads and starts being something they audit.
 */
export function ParentInsightCard({
  insight,
  index = 0,
}: {
  insight: ParentInsight;
  index?: number;
}) {
  const tone = TONES[insight.tone];

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, type: 'spring', stiffness: 300, damping: 28 }}
      className="flex gap-4 rounded-lg bg-snow p-5 shadow-soft md:p-6"
    >
      <span
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full
          ${tone.soft} text-[1.75rem]`}
        aria-hidden
      >
        {insight.emoji}
      </span>
      <div className="min-w-0">
        <h3 className="font-display text-lead font-semibold leading-snug text-ink">
          {insight.title}
        </h3>
        <p className="mt-1.5 text-body leading-relaxed text-ink-soft">
          {insight.body}
        </p>
      </div>
    </motion.article>
  );
}
