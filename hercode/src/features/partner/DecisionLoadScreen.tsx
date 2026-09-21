import { ArrowLeft, Pencil } from 'lucide-react';
import { useState } from 'react';
import { Chip } from '../../components/Chip';
import { copy } from '../../copy';
import type { DecisionRule, DecisionRuleValue } from '../../domain/types';
import { useHerCode } from '../../store/useHerCode';

const RULES: DecisionRuleValue[] = [
  'partner-decides',
  'partner-handles',
  'partner-takes-over',
  'ask-me-first',
  'always-ask',
];

/** Decided once, so the same question stops arriving. */
export function DecisionLoadScreen({ onBack }: { onBack: () => void }) {
  const decisionRules = useHerCode((s) => s.decisionRules);
  const setDecisionRule = useHerCode((s) => s.setDecisionRule);

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
          {copy.decisions.title}
        </h1>
      </header>
      <p className="mb-4 mt-1 px-1 text-[14px] text-muted">{copy.decisions.hint}</p>

      <div className="space-y-2">
        {decisionRules.map((rule) => (
          <RuleRow
            key={rule.topic}
            rule={rule}
            onChange={(next) => setDecisionRule(rule.topic, next)}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Collapsed to the decision she already made. A screen about lowering decision
 * load should not open with thirty choices on it.
 */
function RuleRow({
  rule,
  onChange,
}: {
  rule: DecisionRule;
  onChange: (next: DecisionRuleValue) => void;
}) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="tap flex w-full items-center gap-3 rounded-card bg-surface px-4 py-3 text-left shadow-soft transition-colors duration-200 hover:bg-sand/30"
      >
        <span className="min-w-0 flex-1 text-[16px] leading-snug text-ink">{rule.topic}</span>
        <span className="flex shrink-0 items-center gap-1.5 rounded-chip bg-sage/50 px-3 py-1 text-[13px] text-ink">
          {copy.decisions.rules[rule.rule]}
          <Pencil size={12} aria-hidden className="opacity-60" />
        </span>
      </button>
    );
  }

  return (
    <section className="rounded-card bg-surface p-3 shadow-soft">
      <h2 className="px-1 text-[16px] leading-snug text-ink">{rule.topic}</h2>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {RULES.map((value) => (
          <Chip
            key={value}
            selected={rule.rule === value}
            onClick={() => {
              onChange(value);
              setEditing(false);
            }}
            className="px-3 py-1 text-[13px]"
          >
            {copy.decisions.rules[value]}
          </Chip>
        ))}
      </div>
    </section>
  );
}
