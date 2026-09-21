import { AnimatePresence, motion } from 'framer-motion';
import { Mic, Search, Trash2 } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Button } from '../../components/Button';
import { SectionTitle } from '../../components/Card';
import { CategoryPicker } from '../../components/CategoryPicker';
import { Shimmer, ShimmerLabel } from '../../components/Shimmer';
import { copy } from '../../copy';
import type { BrainCategory, BrainItemDraft } from '../../domain/types';
import { cn } from '../../lib/cn';
import { askAI } from '../../mock/mockAI';
import { useHerCode } from '../../store/useHerCode';

const MOTION = { duration: 0.22, ease: [0.4, 0, 0.2, 1] as const };

const SECTION_ORDER: BrainCategory[] = [
  'task',
  'shopping',
  'appointment',
  'idea',
  'remember',
  'meal',
  'someday',
];

/** Capture first, sort after. She never decides where something belongs up front. */
export function BrainScreen() {
  const brainItems = useHerCode((s) => s.brainItems);
  const addBrainItems = useHerCode((s) => s.addBrainItems);
  const updateBrainItem = useHerCode((s) => s.updateBrainItem);
  const removeBrainItem = useHerCode((s) => s.removeBrainItem);

  const [raw, setRaw] = useState('');
  const [processing, setProcessing] = useState(false);
  const [drafts, setDrafts] = useState<BrainItemDraft[] | null>(null);
  const [query, setQuery] = useState('');
  const [listening, setListening] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const text = raw.trim();
    if (text.length === 0) return;
    setProcessing(true);
    setDrafts(null);
    void askAI('categorize', {
      screen: 'brain',
      capacity: 'normal',
      tasks: [],
      rawText: text,
      now: new Date().toISOString(),
    }).then((response) => {
      setDrafts(response.items ?? []);
      setProcessing(false);
      setRaw('');
    });
  };

  /** Simulated voice: it fills the box with a real sentence, nothing is recorded. */
  const speak = () => {
    setListening(true);
    window.setTimeout(() => {
      setRaw(copy.brain.voiceSample);
      setListening(false);
      inputRef.current?.focus();
    }, 700);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return brainItems;
    return brainItems.filter(
      (item) =>
        item.text.toLowerCase().includes(q) ||
        copy.brain.categoryLabel[item.category].toLowerCase().includes(q),
    );
  }, [brainItems, query]);

  const grouped = useMemo(
    () =>
      SECTION_ORDER.map((category) => ({
        category,
        items: filtered.filter((item) => item.category === category),
      })).filter((group) => group.items.length > 0),
    [filtered],
  );

  return (
    <div className="no-scrollbar h-full overflow-y-auto px-4 pb-28 pt-5">
      <h1 className="px-1 font-display text-[27px] leading-tight text-ink">{copy.brain.title}</h1>
      <p className="mb-4 mt-1 px-1 text-[14px] text-muted">{copy.brain.subtitle}</p>

      <div className="rounded-card bg-surface p-3 shadow-soft">
        <textarea
          ref={inputRef}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={copy.brain.placeholder}
          rows={3}
          aria-label={copy.brain.title}
          className="w-full resize-none bg-transparent text-[16px] leading-relaxed text-ink outline-none placeholder:text-muted"
        />
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={speak}
            aria-label={copy.brain.voice}
            className={cn(
              'tap flex shrink-0 items-center gap-1.5 rounded-chip px-3 text-[14px] transition-colors duration-200',
              listening ? 'bg-dusty/60 text-ink' : 'bg-bg text-ink/75 hover:bg-sand/50',
            )}
          >
            <Mic size={16} aria-hidden />
            {listening ? copy.brain.voiceListening : copy.brain.voice}
          </button>
          <div className="flex-1" />
          <Button variant="primary" onClick={submit} disabled={raw.trim().length === 0}>
            {copy.brain.submit}
          </Button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {processing ? (
          <motion.div
            key="processing"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={MOTION}
            className="mt-4 space-y-3 rounded-card bg-surface p-4 shadow-soft"
          >
            <ShimmerLabel text={copy.brain.processing} />
            <Shimmer lines={4} />
          </motion.div>
        ) : null}

        {drafts && drafts.length > 0 ? (
          <motion.section
            key="drafts"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={MOTION}
            className="mt-4 rounded-card bg-sage/25 p-3"
          >
            <SectionTitle>{copy.brain.draftTitle}</SectionTitle>
            <p className="mb-2 px-1 text-[13px] text-muted">{copy.brain.draftHint}</p>
            <div className="space-y-2">
              {drafts.map((draft, i) => (
                <div key={`${draft.raw}-${i}`} className="rounded-card bg-surface p-3">
                  <p className="break-words text-[16px] leading-snug text-ink">{draft.text}</p>
                  <CategoryPicker
                    value={draft.category}
                    onChange={(category) =>
                      setDrafts((current) =>
                        (current ?? []).map((d, index) =>
                          index === i ? { ...d, category } : d,
                        ),
                      )
                    }
                  />
                </div>
              ))}
            </div>
            <Button
              variant="primary"
              full
              className="mt-3"
              onClick={() => {
                addBrainItems(drafts);
                setDrafts(null);
              }}
            >
              {copy.brain.approveAll}
            </Button>
          </motion.section>
        ) : null}
      </AnimatePresence>

      <div className="mt-6 flex items-center gap-2 rounded-card bg-surface px-3 shadow-soft">
        <Search size={17} aria-hidden className="shrink-0 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={copy.brain.search}
          aria-label={copy.brain.search}
          className="tap w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
        />
      </div>

      {grouped.length === 0 ? (
        <p className="mt-6 px-1 text-[15px] text-muted">
          {query.trim().length > 0 ? copy.brain.searchEmpty : copy.brain.empty}
        </p>
      ) : null}

      {grouped.map((group) => (
        <section key={group.category} className="mt-6">
          <SectionTitle right={String(group.items.length)}>
            {copy.brain.sections[group.category]}
          </SectionTitle>
          <div className="space-y-2">
            {group.items.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-2 rounded-card bg-surface p-3 shadow-soft"
              >
                <div className="min-w-0 flex-1">
                  <input
                    value={item.text}
                    onChange={(e) => updateBrainItem(item.id, { text: e.target.value })}
                    aria-label={item.text}
                    className="w-full bg-transparent text-[16px] leading-snug text-ink outline-none"
                  />
                  <CategoryPicker
                    value={item.category}
                    onChange={(category) => updateBrainItem(item.id, { category })}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeBrainItem(item.id)}
                  aria-label={`${copy.common.close}: ${item.text}`}
                  className="tap flex shrink-0 items-center justify-center rounded-chip text-muted transition-colors duration-200 hover:text-ink"
                >
                  <Trash2 size={16} aria-hidden />
                </button>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
