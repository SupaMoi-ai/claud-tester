import { motion } from 'framer-motion';

interface ProgressDotsProps {
  total: number;
  current: number;
  className?: string;
  label?: string;
}

/**
 * Where-am-I, without numbers or a score.
 *
 * Deliberately not a percentage bar: a bar invites "how much is left", dots
 * just say "there are a few of these". Completed steps fill in warm, the
 * current one is larger and softly pulsing.
 */
export function ProgressDots({
  total,
  current,
  className = '',
  label,
}: ProgressDotsProps) {
  return (
    <div
      className={`flex items-center gap-2.5 ${className}`}
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current + 1}
      aria-label={label ?? 'Framgang'}
    >
      {Array.from({ length: total }, (_, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <motion.span
            key={i}
            className={`block rounded-full ${
              done ? 'bg-moss' : active ? 'bg-coral' : 'bg-hairline'
            }`}
            animate={{
              width: active ? 30 : 11,
              height: 11,
              opacity: done || active ? 1 : 0.8,
            }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          />
        );
      })}
    </div>
  );
}
