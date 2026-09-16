import { CONCEPTS_BY_ID } from '../data/concepts';
import { ADVENTURES_BY_ID } from '../data/adventures';
import { getInterest } from '../data/interests';
import type { GameState, ParentEvent } from '../state/types';
import type { Tone } from '../design/tones';

/**
 * Turns the raw event log into something a parent actually wants to read.
 *
 * The brief is explicit that this must not be analytical. So: no percentages
 * as headlines, no charts, no "performance". Each card says what the child
 * *did*, in a sentence, the way you'd tell your partner over dinner.
 *
 * Wording is composed here at read time rather than stored, so copy can change
 * without a data migration.
 */

export interface ParentInsight {
  id: string;
  emoji: string;
  title: string;
  body: string;
  tone: Tone;
}

const DAY_MS = 86_400_000;

/** Events from the most recent day the child actually played. */
export function latestSessionEvents(events: ParentEvent[]): ParentEvent[] {
  if (events.length === 0) return [];
  const newest = Math.max(...events.map((e) => e.at));
  const dayStart = newest - (newest % DAY_MS);
  return events.filter((e) => e.at >= dayStart);
}

export function buildInsights(state: GameState): ParentInsight[] {
  const events = latestSessionEvents(state.events);
  if (events.length === 0) return [];

  const insights: ParentInsight[] = [];

  /* ---- Adventures finished ------------------------------------------- */
  for (const event of events.filter((e) => e.kind === 'adventure-completed')) {
    const adventure = event.adventureId
      ? ADVENTURES_BY_ID[event.adventureId]
      : undefined;
    if (!adventure) continue;
    insights.push({
      id: `adv-${event.id}`,
      emoji: adventure.emoji,
      title: adventure.title,
      body: `Et helt eventyr fra start til slutt, på ${adventure.place}. Underveis ble det både regning, lesing, kart og tegning — uten at det føltes som skole.`,
      tone: 'sky',
    });
  }

  /* ---- Concepts practised, grouped ------------------------------------ */
  const byConcept = new Map<string, ParentEvent[]>();
  for (const event of events) {
    if (event.kind === 'adventure-completed' || !event.conceptId) continue;
    const list = byConcept.get(event.conceptId) ?? [];
    list.push(event);
    byConcept.set(event.conceptId, list);
  }

  const tones: Tone[] = ['moss', 'butter', 'coral', 'lavender', 'sky'];
  let i = 0;

  for (const [conceptId, group] of byConcept) {
    const concept = CONCEPTS_BY_ID[conceptId];
    if (!concept) continue;

    const expressive = group.filter((e) => e.kind === 'expressive');
    const tasks = group.filter((e) => e.kind === 'concept-practised');

    let body: string;

    if (tasks.length === 0) {
      body = `Barnet utforsket dette på sin egen måte — ved å tegne, gjette eller forklare med egne ord. ${concept.description}`;
    } else {
      const solved = tasks.filter((e) => e.correct).length;
      const unaided = tasks.filter(
        (e) => e.correct && e.support === 'none' && (e.attempts ?? 1) === 1,
      ).length;

      // Only the mastery model gets to say something "sits well" — a single
      // right answer is evidence of one right answer, and a dashboard that
      // overclaims from one data point is a dashboard a parent stops believing.
      const settled = state.mastery[conceptId]?.state === 'secure';
      const confirms = settled ? ' Dette ser ut til å sitte godt nå.' : '';

      if (tasks.length === 1) {
        body =
          unaided === 1
            ? `Løste den på første forsøk, helt uten hjelp.${confirms}`
            : solved === 1
              ? 'Kom fram til svaret med litt hjelp underveis. Det er akkurat der ny læring skjer.'
              : `Prøvde seg på dette, og det er helt som det skal være — ${concept.description.toLowerCase()}`;
      } else if (unaided === tasks.length) {
        body = `Alle ${tasks.length} løst på første forsøk, uten hjelp.${confirms}`;
      } else if (unaided > 0) {
        body = `${solved} av ${tasks.length} løst, ${unaided} av dem helt på egen hånd. Resten tok en liten hjelp underveis.`;
      } else if (solved > 0) {
        body = 'Kom fram til svarene med litt hjelp på veien. Det er akkurat der ny læring skjer.';
      } else {
        body = `Dette er ferskt ennå. Barnet prøvde seg, og det er helt som det skal være — ${concept.description.toLowerCase()}`;
      }
    }

    insights.push({
      id: `concept-${conceptId}`,
      emoji: emojiFor(conceptId),
      title: concept.title,
      body,
      tone: tones[i % tones.length] as Tone,
    });
    i += 1;

    if (expressive.length > 0 && tasks.length > 0) {
      // Keep the list short — the dashboard is a glance, not a report.
      if (insights.length >= 6) break;
    }
  }

  return insights.slice(0, 6);
}

function emojiFor(conceptId: string): string {
  const map: Record<string, string> = {
    'subtraksjon-under-20': '➖',
    'addisjon-under-20': '➕',
    'tall-1-20': '🔢',
    moenster: '🔁',
    leseforstaaelse: '📖',
    'lese-ord': '🔤',
    'lese-setninger': '📚',
    'muntlig-refleksjon': '💬',
    'arktiske-dyr': '🐻‍❄️',
    dyr: '🐾',
    leveomraader: '🏔️',
    'kart-og-sted': '🗺️',
    aarstider: '🍂',
    vaer: '🌦️',
  };
  return map[conceptId] ?? '✨';
}

/* -------------------------------------------------------------------------- */
/* "Prøv dette sammen"                                                         */
/* -------------------------------------------------------------------------- */

const TOGETHER: Record<string, string> = {
  'subtraksjon-under-20':
    'Finn temperaturen der dere bor og på Svalbard i dag. Hvor stor er forskjellen?',
  'addisjon-under-20':
    'Tell hvor mange trappetrinn det er hjem til dere. Del dem i to grupper og legg sammen igjen.',
  'arktiske-dyr':
    'Kjenn på en ullgenser og en vindjakke. Hvilken holder best på varmen, og hvorfor tror dere det?',
  leseforstaaelse:
    'Les en oppskrift sammen. La barnet finne ut hvor mange egg dere trenger — uten at du peker.',
  'kart-og-sted':
    'Finn hjemstedet deres på et kart, og så Svalbard. Hvem bor lengst nord av dere to?',
  leveomraader:
    'Gå en tur og se etter hvor små dyr gjemmer seg. Hva er det med akkurat de stedene?',
  'muntlig-refleksjon':
    'Spør hva som var det rareste barnet lærte i dag. La det ta tid før du svarer noe selv.',
  moenster:
    'Lag et mønster med bestikk på bordet, og la barnet fortsette det.',
};

export function suggestTogether(state: GameState): string {
  const events = latestSessionEvents(state.events);
  for (const event of [...events].reverse()) {
    if (event.conceptId && TOGETHER[event.conceptId]) {
      return TOGETHER[event.conceptId] as string;
    }
  }
  return 'Spør barnet hva de holder på å finne ut av om dagen. Svaret pleier å bli en samtale.';
}

/* -------------------------------------------------------------------------- */
/* "Nysgjerrigheten peker mot"                                                 */
/* -------------------------------------------------------------------------- */

export function curiosityPointsTo(state: GameState): string[] {
  const chosen = (state.profile?.interests ?? [])
    .map((id) => getInterest(id)?.label)
    .filter((x): x is string => Boolean(x));

  // What they actually spent time on beats what they ticked in onboarding.
  const practised = new Set<string>();
  for (const event of latestSessionEvents(state.events)) {
    const concept = event.conceptId ? CONCEPTS_BY_ID[event.conceptId] : undefined;
    if (concept?.subject === 'naturfag') practised.add('Natur');
  }

  return [...new Set([...practised, ...chosen])].slice(0, 4);
}
