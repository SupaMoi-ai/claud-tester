import { motion, useReducedMotion } from 'framer-motion';

interface AudioButtonProps {
  listening: boolean;
  onPress: () => void;
  onRelease: () => void;
  label: string;
  className?: string;
}

/**
 * Hold-to-talk.
 *
 * Press-and-hold rather than tap-to-toggle: a child always knows the mic is on
 * because their finger is on it, and letting go always ends it. Rings pulse
 * outward while listening so there is a visible "I am hearing you".
 */
export function AudioButton({
  listening,
  onPress,
  onRelease,
  label,
  className = '',
}: AudioButtonProps) {
  const reduced = useReducedMotion();

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <div className="relative flex h-40 w-40 items-center justify-center">
        {listening &&
          !reduced &&
          [0, 0.55, 1.1].map((delay) => (
            <motion.span
              key={delay}
              className="absolute rounded-full bg-coral/30"
              initial={{ width: 108, height: 108, opacity: 0.55 }}
              animate={{ width: 176, height: 176, opacity: 0 }}
              transition={{ duration: 1.7, repeat: Infinity, delay, ease: 'easeOut' }}
            />
          ))}

        <motion.button
          onPointerDown={(e) => {
            e.preventDefault();
            onPress();
          }}
          onPointerUp={onRelease}
          onPointerLeave={() => listening && onRelease()}
          aria-label={label}
          aria-pressed={listening}
          className={`relative flex h-28 w-28 items-center justify-center rounded-full
            shadow-lifted transition-colors ${
              listening ? 'bg-coral' : 'bg-coral-soft'
            }`}
          animate={listening && !reduced ? { scale: [1, 1.06, 1] } : { scale: 1 }}
          transition={
            listening && !reduced
              ? { duration: 1.1, repeat: Infinity, ease: 'easeInOut' }
              : { type: 'spring', stiffness: 400, damping: 25 }
          }
          whileTap={reduced ? undefined : { scale: 0.94 }}
        >
          <svg width="46" height="46" viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect
              x="9" y="2" width="6" height="12" rx="3"
              fill={listening ? '#FFFFFF' : '#DE6450'}
            />
            <path
              d="M5 11a7 7 0 0 0 14 0M12 18v3M8.5 21h7"
              stroke={listening ? '#FFFFFF' : '#DE6450'}
              strokeWidth="2.2"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </motion.button>
      </div>

      <p className="text-center font-display text-body font-semibold text-ink-soft">
        {label}
      </p>
    </div>
  );
}
