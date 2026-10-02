import { motion, useReducedMotion } from 'framer-motion';

interface BackButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
}

/**
 * The only navigation a child ever sees.
 *
 * No tab bar, no menu, no breadcrumb — per the brief, navigation should feel
 * invisible. A soft chevron in the corner is the whole system.
 */
export function BackButton({
  onClick,
  label = 'Tilbake',
  className = '',
}: BackButtonProps) {
  const reduced = useReducedMotion();

  return (
    <motion.button
      onClick={onClick}
      aria-label={label}
      className={`flex h-14 w-14 items-center justify-center rounded-full
        bg-snow/85 text-ink shadow-soft backdrop-blur-sm ${className}`}
      whileTap={reduced ? undefined : { scale: 0.9 }}
      whileHover={reduced ? undefined : { x: -3 }}
      transition={{ type: 'spring', stiffness: 500, damping: 26 }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M15 5 L8 12 L15 19"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </motion.button>
  );
}
