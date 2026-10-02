import { motion, useReducedMotion } from 'framer-motion';
import type { SceneryId } from './worldLayout';

/**
 * The things that grow into the island as the child learns.
 *
 * Each element knows its own place on the 1000×640 world canvas and springs in
 * the first time it is unlocked. This is the core metaphor made literal: the
 * forest is there because the child learned about animals, the bridge because
 * they worked out how far was left.
 */

interface Props {
  unlocked: string[];
  /** Ids that should play their arrival now rather than just being present. */
  arriving?: string[];
}

export function WorldScenery({ unlocked, arriving = [] }: Props) {
  const has = (id: SceneryId) => unlocked.includes(id);

  return (
    <g>
      {has('skog') && <Grown id="skog" arriving={arriving}><Forest /></Grown>}
      {has('bro') && <Grown id="bro" arriving={arriving}><Bridge /></Grown>}
      {has('bat') && <Grown id="bat" arriving={arriving}><Boat /></Grown>}
      {has('fyr') && <Grown id="fyr" arriving={arriving}><Lighthouse /></Grown>}
      {has('hval') && <Grown id="hval" arriving={arriving}><Whale /></Grown>}
      {has('nordlystaarn') && (
        <Grown id="nordlystaarn" arriving={arriving}>
          <Tower />
        </Grown>
      )}
    </g>
  );
}

/** Springs up from its own base rather than fading — things here *grow*. */
function Grown({
  id,
  arriving,
  children,
}: {
  id: SceneryId;
  arriving: string[];
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  const isNew = arriving.includes(id);

  if (reduced) return <g>{children}</g>;

  return (
    <motion.g
      initial={isNew ? { scale: 0, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 180, damping: 15, delay: isNew ? 0.2 : 0 }}
      style={{ transformOrigin: 'center bottom', transformBox: 'fill-box' }}
    >
      {children}
    </motion.g>
  );
}

/* -------------------------------------------------------------------------- */
/* Elements                                                                    */
/* -------------------------------------------------------------------------- */

function Tree({ x, y, s = 1, tone = '#5FA97F' }: { x: number; y: number; s?: number; tone?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-4" y="-6" width="8" height="22" rx="4" fill="#A47C57" />
      <path d="M0 -58 C 22 -36 26 -18 20 -6 L -20 -6 C -26 -18 -22 -36 0 -58 Z" fill={tone} />
      <path d="M0 -44 C 14 -30 17 -18 13 -10 L -13 -10 C -17 -18 -14 -30 0 -44 Z" fill="#79C096" opacity="0.75" />
    </g>
  );
}

function Forest() {
  // Kept inside the shoreline and below the Skoglandet pin — trees floating on
  // the sea read as a bug, not as a world.
  return (
    <g>
      <Tree x={224} y={404} s={1.05} />
      <Tree x={278} y={416} s={0.82} tone="#4F9B72" />
      <Tree x={180} y={418} s={0.7} tone="#6FB68C" />
      <Tree x={318} y={402} s={0.92} />
      <Tree x={258} y={380} s={0.58} tone="#4F9B72" />
    </g>
  );
}

function Bridge() {
  return (
    <g>
      <path
        d="M 316 372 C 366 336 426 336 476 372"
        stroke="#C08F6A" strokeWidth="11" fill="none" strokeLinecap="round"
      />
      <path
        d="M 316 372 C 366 336 426 336 476 372"
        stroke="#DCB28A" strokeWidth="5" fill="none" strokeLinecap="round"
      />
      {[340, 372, 404, 436, 462].map((x, i) => (
        <rect key={x} x={x - 2.5} y={356 - [8, 14, 16, 14, 8][i]!} width="5" height={[16, 22, 24, 22, 16][i]} rx="2.5" fill="#A47C57" />
      ))}
    </g>
  );
}

function Boat() {
  return (
    <motion.g
      animate={{ y: [0, -4, 0], rotate: [0, 1.6, 0, -1.6, 0] }}
      transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
      style={{ transformOrigin: '700px 520px', transformBox: 'view-box' }}
    >
      <path d="M 668 520 L 732 520 L 720 540 L 680 540 Z" fill="#F0876F" />
      <rect x="698" y="482" width="4" height="38" rx="2" fill="#8A6A52" />
      <path d="M 702 486 L 728 516 L 702 516 Z" fill="#FFFFFF" />
      <path d="M 696 486 L 674 516 L 696 516 Z" fill="#FFE9BD" />
    </motion.g>
  );
}

function Lighthouse() {
  return (
    <g>
      <path d="M 832 300 L 844 232 L 866 232 L 878 300 Z" fill="#FBFAF7" />
      <path d="M 837 272 L 873 272 L 876 288 L 834 288 Z" fill="#F0876F" />
      <path d="M 841 248 L 869 248 L 871 260 L 839 260 Z" fill="#F0876F" />
      <rect x="841" y="214" width="28" height="20" rx="6" fill="#4A5D7E" />
      <motion.circle
        cx="855" cy="224" r="6" fill="#FFD98E"
        animate={{ opacity: [0.35, 1, 0.35] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <ellipse cx="855" cy="302" rx="30" ry="8" fill="#DCCBB4" />
    </g>
  );
}

function Whale() {
  return (
    <motion.g
      animate={{ x: [0, 22, 0], y: [0, -6, 0] }}
      transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
    >
      <path
        d="M 120 556 C 150 534 208 534 236 552 C 218 570 148 574 120 556 Z"
        fill="#7FA8C9"
      />
      <path d="M 116 552 L 92 538 L 100 560 Z" fill="#6E96B6" />
      <circle cx="206" cy="550" r="3.4" fill="#2A3A57" />
      <path
        d="M 196 532 C 196 522 204 518 204 510"
        stroke="#CFE4F2" strokeWidth="4" strokeLinecap="round" fill="none"
      />
    </motion.g>
  );
}

function Tower() {
  return (
    // Offset clear of the Nordlysobservatoriet pin, which otherwise sits
    // directly on top of the tower's dome.
    <g transform="translate(110 44)">
      <path d="M 478 172 L 490 96 L 512 96 L 524 172 Z" fill="#6B5F8C" />
      <path d="M 484 138 L 518 138 L 521 154 L 481 154 Z" fill="#8B7DB0" />
      <circle cx="501" cy="88" r="21" fill="#D6C8F2" />
      <circle cx="501" cy="88" r="13" fill="#3E3560" />
      <motion.circle
        cx="496" cy="83" r="4" fill="#B8E6F5"
        animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.25, 1] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <ellipse cx="501" cy="174" rx="32" ry="8" fill="#C9BBA6" />
      {/* Little stars that only exist once the tower does */}
      {[[452, 70], [556, 96], [470, 40], [540, 52]].map(([x, y], i) => (
        <motion.circle
          key={i}
          cx={x} cy={y} r="3" fill="#FFE9BD"
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{ duration: 2.6 + i * 0.7, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </g>
  );
}
