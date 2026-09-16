import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Screen } from '../design/Screen';
import { BackButton } from '../design/BackButton';
import { SoftCard } from '../design/SoftCard';
import { SUBJECTS } from '../data/concepts';
import {
  conceptDepth,
  conceptsBySubject,
  dependentsOf,
  prerequisitesOf,
  stateOf,
} from '../learning/selectors';
import type { Concept, MasteryState, Subject } from '../learning/types';
import { useChildId, useGame } from '../state/store';
import { useCopy } from '../i18n';

const NODE_R = 15;
const COL_W = 168;
const ROW_H = 62;
const BAND_PAD = 78;

/** The three states a parent sees. The internal four never surface here. */
const FILL: Record<MasteryState, string> = {
  secure: '#4AA77B',
  developing: '#F0AE3D',
  exploring: '#F0AE3D',
  new: '#FFFFFF',
};

const SUBJECT_TINT: Record<Subject, string> = {
  matematikk: '#FCDAD2',
  norsk: '#FFE9BD',
  naturfag: '#D4EFE0',
};

interface Node {
  concept: Concept;
  x: number;
  y: number;
  state: MasteryState;
}

/**
 * The parent-facing knowledge map.
 *
 * Explicitly not a spreadsheet: concepts are dots, prerequisites are the lines
 * between them, and what a parent should take away at a glance is the *shape* —
 * where their child is solid, where things are opening up, and what has to come
 * first. Laid out in tidy left-to-right layers by graph depth rather than a
 * force simulation, so it looks the same every time they open it.
 */
export function LearningMap() {
  const copy = useCopy();
  const navigate = useNavigate();
  const { mastery } = useGame();
  const childId = useChildId();
  const [filter, setFilter] = useState<Subject | 'all'>('all');
  const [selected, setSelected] = useState<Concept | null>(null);

  const { nodes, edges, width, height, bands } = useMemo(() => {
    const visible = conceptsBySubject(filter);
    const visibleIds = new Set(visible.map((c) => c.id));
    const subjects: Subject[] = filter === 'all' ? SUBJECTS : [filter];

    const placed: Node[] = [];
    const bandInfo: { subject: Subject; top: number; height: number }[] = [];
    let cursor = 0;
    let maxDepth = 0;

    for (const subject of subjects) {
      const inSubject = visible.filter((c) => c.subject === subject);
      const byDepth = new Map<number, Concept[]>();

      for (const concept of inSubject) {
        const depth = conceptDepth(concept.id);
        maxDepth = Math.max(maxDepth, depth);
        const column = byDepth.get(depth) ?? [];
        column.push(concept);
        byDepth.set(depth, column);
      }

      const tallest = Math.max(1, ...[...byDepth.values()].map((c) => c.length));
      const bandHeight = tallest * ROW_H + BAND_PAD;

      for (const [depth, column] of byDepth) {
        column.forEach((concept, i) => {
          // Centre each column vertically inside its band.
          const offset = (tallest - column.length) * ROW_H * 0.5;
          placed.push({
            concept,
            x: 80 + depth * COL_W,
            y: cursor + BAND_PAD * 0.7 + offset + i * ROW_H,
            state: stateOf(mastery, childId, concept.id),
          });
        });
      }

      bandInfo.push({ subject, top: cursor, height: bandHeight });
      cursor += bandHeight;
    }

    const byId = new Map(placed.map((n) => [n.concept.id, n]));
    const drawn: { from: Node; to: Node }[] = [];
    for (const node of placed) {
      for (const prerequisite of node.concept.prerequisites) {
        if (!visibleIds.has(prerequisite)) continue;
        const from = byId.get(prerequisite);
        if (from) drawn.push({ from, to: node });
      }
    }

    return {
      nodes: placed,
      edges: drawn,
      width: 80 + (maxDepth + 1) * COL_W,
      height: cursor,
      bands: bandInfo,
    };
  }, [filter, mastery, childId]);

  const filters: (Subject | 'all')[] = ['all', ...SUBJECTS];

  return (
    <Screen
      width="wide"
      background="bg-sand"
      overlay={
        <div className="absolute left-5 top-5 z-20">
          <BackButton onClick={() => navigate('/foreldre')} label={copy.parent.back} />
        </div>
      }
    >
      <header className="mt-14 sm:mt-10">
        <h1 className="text-huge leading-tight text-ink">{copy.map.title}</h1>
        <p className="mt-2 max-w-xl text-body text-ink-soft">{copy.map.subtitle}</p>
      </header>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Legend colour={FILL.secure} label={copy.map.legendSecure} filled />
        <Legend colour={FILL.developing} label={copy.map.legendDeveloping} half />
        <Legend colour="#FFFFFF" label={copy.map.legendNew} />
      </div>

      {/* Filters */}
      <div className="mt-5 flex flex-wrap gap-2.5">
        {filters.map((value) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
            className={`min-h-[3rem] rounded-full px-5 font-display text-body font-semibold
              shadow-soft transition-colors ${
                filter === value ? 'bg-ink text-cream' : 'bg-snow text-ink-soft'
              }`}
          >
            {value === 'all' ? copy.map.filterAll : copy.map.subjects[value]}
          </button>
        ))}
      </div>

      <p className="mt-4 text-label text-ink-faint">{copy.map.tapHint}</p>

      {/* The graph */}
      <div className="soft-scroll mt-4 overflow-x-auto rounded-lg bg-snow p-2 shadow-soft">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          className="max-w-none"
          role="img"
          aria-label={copy.map.title}
        >
          {/* Subject bands */}
          {bands.map((band) => (
            <g key={band.subject}>
              <rect
                x="0" y={band.top} width={width} height={band.height}
                fill={SUBJECT_TINT[band.subject]} opacity="0.45" rx="20"
              />
              <text
                x="20" y={band.top + 32}
                fontSize="15" fontWeight="600" fill="#7B6B60"
                fontFamily="Fredoka Variable, sans-serif"
                style={{ textTransform: 'uppercase', letterSpacing: '0.12em' }}
              >
                {copy.map.subjects[band.subject]}
              </text>
            </g>
          ))}

          {/* Prerequisite edges */}
          {edges.map(({ from, to }, i) => {
            const midX = (from.x + to.x) / 2;
            return (
              <motion.path
                key={i}
                d={`M ${from.x + NODE_R} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x - NODE_R} ${to.y}`}
                stroke={from.state === 'secure' ? '#9FD7BB' : '#E2D6C9'}
                strokeWidth={from.state === 'secure' ? 3 : 2}
                fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.1 + i * 0.012 }}
              />
            );
          })}

          {/* Concept nodes */}
          {nodes.map((node, i) => (
            <MasteryNode
              key={node.concept.id}
              node={node}
              index={i}
              onSelect={() => setSelected(node.concept)}
              selected={selected?.id === node.concept.id}
            />
          ))}
        </svg>
      </div>

      {/* Detail */}
      <AnimatePresence mode="wait">
        {selected && (
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mt-5 mb-10"
          >
            <SoftCard>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-display text-label font-semibold uppercase tracking-[0.13em] text-ink-faint">
                    {copy.map.subjects[selected.subject]}
                  </p>
                  <h2 className="mt-1 text-title text-ink">{selected.title}</h2>
                  <p className="mt-2 text-body text-ink-soft">{selected.description}</p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="shrink-0 rounded-full bg-sand px-4 py-2 font-display text-label
                    font-semibold text-ink-soft"
                >
                  {copy.common.close}
                </button>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <DetailList
                  title={copy.map.detailPrereq}
                  items={prerequisitesOf(selected.id).map((c) => c.title)}
                />
                <DetailList
                  title={copy.map.detailUnlocks}
                  items={dependentsOf(selected.id).map((c) => c.title)}
                />
              </div>

              <p className="mt-4 text-label text-ink-faint">
                {(() => {
                  const m = mastery[selected.id];
                  if (!m || m.lastSeen === 0) return copy.map.detailNeverSeen;
                  const days = Math.floor((Date.now() - m.lastSeen) / 86_400_000);
                  const when =
                    days === 0
                      ? copy.time.today
                      : days === 1
                        ? copy.time.yesterday
                        : copy.time.daysAgo(days);
                  return copy.map.detailSeen(when);
                })()}
              </p>
            </SoftCard>
          </motion.div>
        )}
      </AnimatePresence>

      {!selected && <div className="mb-10" />}
    </Screen>
  );
}

/* -------------------------------------------------------------------------- */

function MasteryNode({
  node,
  index,
  selected,
  onSelect,
}: {
  node: Node;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const isHalf = node.state === 'developing' || node.state === 'exploring';

  return (
    <motion.g
      onClick={onSelect}
      style={{ cursor: 'pointer' }}
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1 + index * 0.02, type: 'spring', stiffness: 300, damping: 20 }}
    >
      {selected && (
        <circle cx={node.x} cy={node.y} r={NODE_R + 8} fill="#3A2E28" opacity="0.1" />
      )}

      <circle
        cx={node.x} cy={node.y} r={NODE_R}
        fill={node.state === 'secure' ? FILL.secure : '#FFFFFF'}
        stroke={node.state === 'new' ? '#D9CBB9' : FILL[node.state]}
        strokeWidth="3"
      />
      {/* Half-filled = "holder på å lære" */}
      {isHalf && (
        <path
          d={`M ${node.x} ${node.y - NODE_R} A ${NODE_R} ${NODE_R} 0 0 1 ${node.x} ${node.y + NODE_R} Z`}
          fill={FILL.developing}
        />
      )}

      <text
        x={node.x} y={node.y + NODE_R + 17}
        textAnchor="middle"
        fontSize="12.5"
        fontWeight="600"
        fill="#3A2E28"
        fontFamily="Nunito Variable, sans-serif"
      >
        {node.concept.title.length > 22
          ? `${node.concept.title.slice(0, 21)}…`
          : node.concept.title}
      </text>
    </motion.g>
  );
}

function Legend({
  colour,
  label,
  filled = false,
  half = false,
}: {
  colour: string;
  label: string;
  filled?: boolean;
  half?: boolean;
}) {
  return (
    <span className="flex items-center gap-2.5">
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
        <circle
          cx="11" cy="11" r="9"
          fill={filled ? colour : '#FFFFFF'}
          stroke={filled || half ? colour : '#D9CBB9'}
          strokeWidth="2.5"
        />
        {half && <path d="M 11 2 A 9 9 0 0 1 11 20 Z" fill={colour} />}
      </svg>
      <span className="text-body text-ink-soft">{label}</span>
    </span>
  );
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="font-display text-label font-semibold uppercase tracking-[0.13em] text-ink-faint">
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="mt-2 text-body text-ink-faint">—</p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-2">
          {items.map((item) => (
            <li
              key={item}
              className="rounded-full bg-sand px-3.5 py-1.5 text-label text-ink-soft"
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
