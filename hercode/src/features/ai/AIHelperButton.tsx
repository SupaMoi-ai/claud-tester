import { Sparkles } from 'lucide-react';
import { copy } from '../../copy';

/**
 * Floating and always reachable. Icon only, because a labelled pill sits on
 * top of task text as the list scrolls past it.
 */
export function AIHelperButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={copy.ai.button}
      title={copy.ai.button}
      className="absolute bottom-[84px] right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-ink text-bg shadow-lift transition-colors duration-200 hover:bg-ink/90"
    >
      <Sparkles size={22} aria-hidden />
    </button>
  );
}
