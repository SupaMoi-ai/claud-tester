/**
 * Discovery cards — the "huh, I wonder…" surface.
 *
 * These are chosen by the child's stated interests, which is what makes the
 * world feel like it noticed them. They are a finite, hand-written set on
 * purpose: no infinite feed, nothing that refills forever to keep a child
 * scrolling.
 */
export interface Discovery {
  id: string;
  emoji: string;
  question: string;
  /** The little verb on the card — varied so the set doesn't feel templated. */
  cta: string;
  /** Interest ids this speaks to. Empty = shown to everyone. */
  interests: string[];
  /** Set when the card opens a real, playable adventure. */
  adventureId?: string;
}

export const DISCOVERIES: Discovery[] = [
  {
    id: 'isbjorn',
    emoji: '🐻‍❄️',
    question: 'Er isbjørnen egentlig hvit?',
    cta: 'La oss finne ut →',
    interests: ['dyr', 'naturen'],
    adventureId: 'isbjornen',
  },
  {
    id: 'nordlys',
    emoji: '🌌',
    question: 'Hvorfor danser nordlyset?',
    cta: 'Finn ut →',
    interests: ['verdensrommet', 'naturen'],
  },
  {
    id: 'hval',
    emoji: '🐋',
    question: 'Kan hvaler snakke med hverandre?',
    cta: 'Undersøk →',
    interests: ['havet', 'dyr'],
  },
  {
    id: 'dino-lyd',
    emoji: '🦖',
    question: 'Hvordan vet vi hvilken lyd dinosaurer lagde?',
    cta: 'La oss finne ut →',
    interests: ['dinosaurer', 'historie'],
  },
  {
    id: 'bro',
    emoji: '🌉',
    question: 'Hvorfor faller ikke ei bru ned?',
    cta: 'Bygg med Bolt →',
    interests: ['bygging', 'roboter'],
  },
  {
    id: 'stjerne',
    emoji: '⭐',
    question: 'Hvor lang tid bruker lyset fra en stjerne hit?',
    cta: 'Se etter →',
    interests: ['verdensrommet'],
  },
  {
    id: 'farger',
    emoji: '🎨',
    question: 'Hvorfor blir blått og gult til grønt?',
    cta: 'Prøv selv →',
    interests: ['tegning'],
  },
  {
    id: 'vulkan',
    emoji: '🌋',
    question: 'Hva er det egentlig som kommer opp av en vulkan?',
    cta: 'Grav dypere →',
    interests: ['naturen', 'dinosaurer'],
  },
  {
    id: 'musikk',
    emoji: '🎵',
    question: 'Hvorfor høres en stor tromme dypere ut enn en liten?',
    cta: 'Lytt →',
    interests: ['musikk'],
  },
  {
    id: 'vikinger',
    emoji: '🏰',
    question: 'Hvordan fant vikingene veien uten kart?',
    cta: 'Følg sporet →',
    interests: ['historie', 'havet'],
  },
  {
    id: 'lopekraft',
    emoji: '⚽',
    question: 'Hvorfor svinger ballen når den skrus?',
    cta: 'Test det →',
    interests: ['sport'],
  },
  {
    id: 'fortelling',
    emoji: '📖',
    question: 'Hva gjør en historie skummel?',
    cta: 'Finn ut →',
    interests: ['fortellinger', 'tegning'],
  },
];

/**
 * Ranked for this child: cards matching a stated interest first, then the rest,
 * with a stable order so the same child sees the same shelf each time.
 */
export function discoveriesFor(interests: string[], limit = 6): Discovery[] {
  const score = (d: Discovery) =>
    d.interests.filter((i) => interests.includes(i)).length;

  return [...DISCOVERIES]
    .map((d, i) => ({ d, score: score(d), i }))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, limit)
    .map((x) => x.d);
}
