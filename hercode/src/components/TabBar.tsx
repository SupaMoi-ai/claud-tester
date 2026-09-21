import { Brain, Sun } from 'lucide-react';
import { copy } from '../copy';
import type { TabId } from '../domain/types';
import { cn } from '../lib/cn';

/**
 * Two tabs in Milestone 1. Calendar, Patterns and Me arrive with the screens
 * they lead to — a tab never points at something that is not built.
 */
const TABS: Array<{ id: TabId; label: string; Icon: typeof Sun }> = [
  { id: 'today', label: copy.tabs.today, Icon: Sun },
  { id: 'brain', label: copy.tabs.brain, Icon: Brain },
];

export function TabBar({
  active,
  onChange,
}: {
  active: TabId;
  onChange: (tab: TabId) => void;
}) {
  return (
    <nav
      aria-label="Main"
      className="safe-bottom z-30 shrink-0 border-t border-line bg-surface/95 px-6 pt-1 backdrop-blur"
    >
      <ul className="flex items-stretch justify-around">
        {TABS.map(({ id, label, Icon }) => {
          const selected = active === id;
          return (
            <li key={id} className="flex-1">
              <button
                type="button"
                aria-current={selected ? 'page' : undefined}
                onClick={() => onChange(id)}
                className={cn(
                  'tap flex w-full flex-col items-center justify-center gap-0.5 rounded-card py-2 transition-colors duration-200',
                  selected ? 'text-ink' : 'text-muted',
                )}
              >
                <Icon size={21} aria-hidden strokeWidth={selected ? 2.2 : 1.7} />
                <span className={cn('text-[12px]', selected && 'font-medium')}>{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
