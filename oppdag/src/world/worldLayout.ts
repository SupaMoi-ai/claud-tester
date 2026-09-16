import type { Subject } from '../learning/types';
import type { GameState } from '../state/types';
import { readMastery } from '../learning/masteryEngine';

/**
 * The world layout and — more importantly — the rules by which it grows.
 *
 * The core metaphor: knowledge builds the world. Nothing here unlocks on a
 * timer, a streak or a coin purchase. Every element appears because the child
 * actually learned the thing it is attached to.
 */

export type LocationId =
  | 'skoglandet'
  | 'tallfjellet'
  | 'fortellerbyen'
  | 'oppfinneroya'
  | 'nordlysobservatoriet'
  | 'havna'
  | 'historiedalen';

export interface WorldLocation {
  id: LocationId;
  /** Child-facing name — a place, never a subject. */
  name: string;
  /** What Lumi says about it when it is still closed. */
  teaser: string;
  /** Position on the 1000×640 world viewBox. */
  x: number;
  y: number;
  tone: 'butter' | 'sky' | 'moss' | 'coral' | 'lavender';
  emoji: string;
  /** Subjects that quietly live here. Never shown to the child. */
  subjects: Subject[];
  /** Adventure ids reachable from this place. */
  adventures: string[];
}

export const LOCATIONS: WorldLocation[] = [
  {
    id: 'skoglandet', name: 'Skoglandet',
    teaser: 'Her bor Birk. Det rasler alltid i noe.',
    x: 250, y: 300, tone: 'moss', emoji: '🌲',
    subjects: ['naturfag'], adventures: [],
  },
  {
    id: 'havna', name: 'Havna',
    teaser: 'Herfra går båtene. Og radioen står her.',
    x: 620, y: 430, tone: 'sky', emoji: '⚓',
    subjects: ['naturfag', 'matematikk'], adventures: ['isbjornen'],
  },
  {
    id: 'tallfjellet', name: 'Tallfjellet',
    teaser: 'Bolt sier det bor tall oppe i fjellet. Jeg tror ham nesten.',
    x: 430, y: 150, tone: 'coral', emoji: '⛰️',
    subjects: ['matematikk'], adventures: [],
  },
  {
    id: 'fortellerbyen', name: 'Fortellerbyen',
    teaser: 'Alle husene der er fulle av historier.',
    x: 760, y: 265, tone: 'butter', emoji: '🏮',
    subjects: ['norsk'], adventures: [],
  },
  {
    id: 'oppfinneroya', name: 'Oppfinnerøya',
    teaser: 'Det lukter alltid litt brent der borte.',
    x: 150, y: 470, tone: 'lavender', emoji: '🔧',
    subjects: ['matematikk', 'naturfag'], adventures: [],
  },
  {
    id: 'nordlysobservatoriet', name: 'Nordlysobservatoriet',
    teaser: 'Noe høyt og mørkt står der. Jeg tør ikke gå alene.',
    x: 500, y: 70, tone: 'lavender', emoji: '🔭',
    subjects: ['naturfag'], adventures: [],
  },
  {
    id: 'historiedalen', name: 'Historiedalen',
    teaser: 'Det ligger gamle ting i jorda der. Ekte gamle.',
    x: 855, y: 450, tone: 'butter', emoji: '🗿',
    subjects: ['norsk', 'naturfag'], adventures: [],
  },
];

export const LOCATIONS_BY_ID = Object.fromEntries(
  LOCATIONS.map((l) => [l.id, l]),
) as Record<LocationId, WorldLocation>;

/* -------------------------------------------------------------------------- */
/* Scenery — the small things that appear as specific knowledge grows.         */
/* -------------------------------------------------------------------------- */

export type SceneryId =
  | 'skog'
  | 'bro'
  | 'bat'
  | 'nordlystaarn'
  | 'fyr'
  | 'hval';

export interface SceneryElement {
  id: SceneryId;
  /** Shown in the unlock moment. */
  name: string;
  /** Why it appeared, in the child's language. */
  because: string;
  emoji: string;
}

export const SCENERY: Record<SceneryId, SceneryElement> = {
  skog: { id: 'skog', name: 'Skogen', because: 'Du ble kjent med dyrene som bor her.', emoji: '🌳' },
  bro: { id: 'bro', name: 'Brua', because: 'Du klarte å regne ut hvor langt det var igjen.', emoji: '🌉' },
  bat: { id: 'bat', name: 'Båten', because: 'Du fant fram på kartet.', emoji: '⛵' },
  // Not the telescope — that belongs to the observatory this stands next to,
  // and the unlock moment showed the same icon twice.
  nordlystaarn: { id: 'nordlystaarn', name: 'Nordlystårnet', because: 'Du hjalp isbjørnungen hjem.', emoji: '🌌' },
  fyr: { id: 'fyr', name: 'Fyret', because: 'Du fant den viktige setningen i teksten.', emoji: '🗼' },
  hval: { id: 'hval', name: 'Hvalen', because: 'Du lærte hvor dyrene finner varme og mat.', emoji: '🐋' },
};

/* -------------------------------------------------------------------------- */
/* Growth rules                                                                */
/* -------------------------------------------------------------------------- */

type Rule = {
  /** Location or scenery id this rule can unlock. */
  id: LocationId | SceneryId;
  test: (state: GameState) => boolean;
};

const CHILD = (state: GameState) => state.profile?.id ?? 'anon';

/** Has the child reached at least `developing` on this concept? */
function knows(state: GameState, conceptId: string, atLeast: 'exploring' | 'developing' = 'developing') {
  const m = readMastery(state.mastery, CHILD(state), conceptId);
  if (atLeast === 'exploring') {
    return m.state !== 'new';
  }
  return m.state === 'developing' || m.state === 'secure';
}

const completed = (state: GameState, adventureId: string) =>
  Boolean(state.adventures[adventureId]?.completedAt);

export const GROWTH_RULES: Rule[] = [
  // Places
  { id: 'nordlysobservatoriet', test: (s) => completed(s, 'isbjornen') },
  { id: 'tallfjellet', test: (s) => knows(s, 'subtraksjon-under-20') },
  { id: 'fortellerbyen', test: (s) => knows(s, 'leseforstaaelse') },
  { id: 'oppfinneroya', test: (s) => knows(s, 'former-og-rom') || knows(s, 'moenster') },
  { id: 'historiedalen', test: (s) => knows(s, 'fortelling') && knows(s, 'kart-og-sted') },

  // Scenery.
  //
  // These ask for `developing`, not `exploring`, on purpose: one lucky answer
  // should not build a bridge. At roughly two solid answers per concept, a
  // single adventure grows one or two things rather than filling the whole
  // island at once — which is what keeps the next thing worth earning.
  // `skog` is the exception, tied to the gentle starting activity so a child
  // sees the world respond to what they already knew on day one.
  { id: 'skog', test: (s) => knows(s, 'dyr', 'exploring') },
  { id: 'bro', test: (s) => knows(s, 'subtraksjon-under-20') },
  { id: 'bat', test: (s) => knows(s, 'kart-og-sted') },
  { id: 'fyr', test: (s) => knows(s, 'leseforstaaelse') },
  { id: 'hval', test: (s) => knows(s, 'leveomraader') },
  { id: 'nordlystaarn', test: (s) => completed(s, 'isbjornen') },
];

/**
 * Which ids have become true but aren't in the world yet.
 * Called after every adventure stage, so the world can grow mid-story.
 */
export function evaluateUnlocks(state: GameState): string[] {
  return GROWTH_RULES.filter(
    (rule) => !state.unlocked.includes(rule.id) && rule.test(state),
  ).map((rule) => rule.id);
}

export function isLocation(id: string): id is LocationId {
  return id in LOCATIONS_BY_ID;
}

export function isScenery(id: string): id is SceneryId {
  return id in SCENERY;
}

/** Title + reason for the unlock moment, whichever kind of thing it is. */
export function describeUnlock(id: string): { name: string; because: string; emoji: string } {
  if (isScenery(id)) {
    const s = SCENERY[id];
    return { name: s.name, because: s.because, emoji: s.emoji };
  }
  if (isLocation(id)) {
    const l = LOCATIONS_BY_ID[id];
    return {
      name: l.name,
      because: 'Et helt nytt sted har åpnet seg i verdenen din.',
      emoji: l.emoji,
    };
  }
  return { name: id, because: '', emoji: '✨' };
}
