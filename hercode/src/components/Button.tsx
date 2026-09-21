import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

type Variant = 'primary' | 'secondary' | 'quiet' | 'attention';

/** One primary action per screen. Everything else is secondary or quiet. */
export function Button({
  children,
  variant = 'secondary',
  full = false,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: Variant;
  full?: boolean;
}) {
  const variants: Record<Variant, string> = {
    primary: 'bg-ink text-bg hover:bg-ink/90',
    secondary: 'bg-surface text-ink border border-line hover:bg-sand/40',
    quiet: 'bg-transparent text-muted hover:text-ink',
    attention: 'bg-apricot/70 text-ink hover:bg-apricot',
  };

  return (
    <button
      type="button"
      {...rest}
      className={cn(
        'tap inline-flex items-center justify-center gap-2 rounded-chip px-5 text-[15px] font-medium transition-colors duration-200 disabled:opacity-50',
        variants[variant],
        full && 'w-full',
        className,
      )}
    >
      {children}
    </button>
  );
}
