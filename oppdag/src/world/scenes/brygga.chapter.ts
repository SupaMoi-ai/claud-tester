import type { Hint, NumberChoiceStage } from '../../adventure/types';
import type { Difficulty } from '../../learning/types';

/**
 * BRYGGA — the chapter, as data.
 *
 * What Milla says, in what order, and what each line does to the harbour. The
 * screen component reads this and drives the world; it holds no lines of its
 * own. The next chapter should be a second file like this one rather than a
 * second copy of the logic that runs it.
 *
 * The content rule behind every line below, from the brief: no score, no
 * timer, no failure. The child cannot get this wrong — they can only not have
 * finished it yet. Milla asks, waits, and thanks them; she never corrects.
 *
 * Norwegian, short sentences, written to be read aloud by an adult or by the
 * speech service. Counting words are spelled out — ett, to, tre — because the
 * numeral is the thing being learned and a child who cannot yet read "3" can
 * still hear "tre".
 */

/** Which of Milla's three portraits a line is spoken on. */
export type MillaPortrait = 'calm' | 'talk' | 'pleased';

export interface Beat {
  portrait: MillaPortrait;
  line: string;
}

/** The ask. Opens when the child first goes to Milla. */
export const INTRO: Beat[] = [
  { portrait: 'calm', line: 'Hei! Jeg heter Milla.' },
  {
    portrait: 'talk',
    line: 'Jeg samler skjell i kurven min. Men tre skjell trillet ut på stien.',
  },
  { portrait: 'talk', line: 'Kan du finne de tre skjellene?' },
];

/** If the child comes back to her before they have found all three. */
export const REMINDER: Beat[] = [
  { portrait: 'talk', line: 'Se langs stien. Skjellene er lyse som sand.' },
];

/** The shells are found. Leads straight into the basket task. */
export const THANKS: Beat[] = [
  { portrait: 'pleased', line: 'Tre skjell! Takk skal du ha.' },
  { portrait: 'talk', line: 'Nå er kurven min full. Kan du hjelpe meg med den?' },
];

/** After the task: the way north. */
export const CLEARING: Beat[] = [
  { portrait: 'talk', line: 'Nå skal jeg flytte kvistene som ligger over stien.' },
  { portrait: 'pleased', line: 'Sånn! Nå er veien nordover åpen. Vi ses, Ellie.' },
];

/** After the path is open, if the child taps her again. */
export const FAREWELL: Beat[] = [
  { portrait: 'calm', line: 'Gå nordover når du er klar. Jeg blir her litt til.' },
];

/** The three shells, in the order the scene lists them. */
export const SHELL_IDS = ['shell-1', 'shell-2', 'shell-3'] as const;

/** Counted aloud as each one is picked up. */
export const COUNT_WORDS = ['Ett skjell', 'To skjell', 'Tre skjell'] as const;

/**
 * What the child keeps from this chapter.
 *
 * Earned, not collected: there is no set to complete and nothing is missable.
 * The ids are stored in game state and the journal draws the matching picture.
 */
export const KEEPSAKES = {
  milla: 'brygga-milla',
  shells: 'brygga-skjell',
} as const;

/* ------------------------------------------------------------------------ */
/* The task at the basket                                                    */
/* ------------------------------------------------------------------------ */

/**
 * Milla's basket: equal groups.
 *
 * Ellie is 8 and in 3rd grade, and counting three shells is a kindergarten
 * task. Multiplication as equal groups — "3 rom med 4 skjell i hvert" — is
 * `ganging-enkel`, grades 2–4 in the concept graph, and it is what a basket
 * with compartments is *for*.
 *
 * Only the numbers are authored. The question, the three answer cards, all
 * three hints and Milla's praise are derived from them, so a hint can never
 * describe a different basket from the one in the question.
 */
export const BASKET: Record<Difficulty, { groups: number; each: number }> = {
  easy: { groups: 2, each: 3 },
  base: { groups: 3, each: 4 },
  hard: { groups: 4, each: 5 },
};

const SHELL_ICON = 'assets/ui/shell-full.png';

const WORDS = [
  'null', 'en', 'to', 'tre', 'fire', 'fem', 'seks', 'sju', 'åtte', 'ni', 'ti',
  'elleve', 'tolv', 'tretten', 'fjorten', 'femten', 'seksten', 'sytten',
  'atten', 'nitten', 'tjue', 'tjueen', 'tjueto', 'tjuetre', 'tjuefire',
  'tjuefem',
];

/** A number as Milla says it. Counting shells, one is "ett". */
export function word(n: number): string {
  return n === 1 ? 'ett' : (WORDS[n] ?? String(n));
}

const capital = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/**
 * The three cards: the answer, and the two slips a child really makes.
 *
 * Adding instead of multiplying (3 + 4 = 7) is the classic one. Counting one
 * group too many (16 for 3 × 4) is the other. Neither is a random number —
 * a distractor nobody would choose teaches nothing when it is not chosen.
 */
export function basketOptions(groups: number, each: number): number[] {
  return [groups + each, groups * each, (groups + 1) * each].sort((a, b) => a - b);
}

function basketVariant(groups: number, each: number) {
  return {
    prompt:
      `Kurven min har ${groups} rom. Det ligger ${each} skjell i hvert rom. ` +
      `Hvor mange skjell er det til sammen?`,
    options: basketOptions(groups, each),
    answer: groups * each,
  };
}

function basketHints(groups: number, each: number): [Hint, Hint, Hint] {
  const sum = Array.from({ length: groups }, () => each).join(' + ');
  return [
    { text: `Tell skjellene i ett rom først. Hvor mange er det i hvert?` },
    {
      text: `Her er rommene. Tell alle skjellene.`,
      visual: { kind: 'equalGroups', groups, each, image: SHELL_ICON },
    },
    {
      text:
        `${sum} = ${groups * each}. ${capital(word(groups))} rom med ` +
        `${word(each)} i hvert.`,
      visual: { kind: 'equalGroups', groups, each, image: SHELL_ICON },
    },
  ];
}

/** Milla's praise counts in steps: "Tolv! Fire, åtte, tolv." */
function stepPraise(groups: number, each: number): string {
  const steps = Array.from({ length: groups }, (_, i) => word((i + 1) * each));
  return `${capital(word(groups * each))}! ${capital(steps.join(', '))}.`;
}

export interface ChapterTask {
  stage: NumberChoiceStage;
  difficulty: Difficulty;
  /** Milla's line on the right answer. */
  praise: string;
}

/**
 * The task this player gets.
 *
 * Fitted to the player, not to Ellie: she is the demo child, but the game is
 * for 5 to 9. From 2nd grade, the basket at the difficulty the learning
 * engine picked — easy the first time for a 2nd grader, who is at the bottom
 * of the concept's range. Below that, counting the shells they found, which
 * is what this beat used to be for everyone and was only ever right for them.
 */
export function chapterTask(grade: number, picked: Difficulty, firstTime: boolean): ChapterTask {
  if (grade <= 1) {
    const variant = {
      prompt: 'Hvor mange skjell fant du?',
      options: [2, 3, 4],
      answer: 3,
    };
    return {
      difficulty: 'base',
      praise: 'Tre! Ett, to, tre.',
      stage: {
        id: 'brygga-telle',
        kind: 'numberChoice',
        conceptId: 'tall-1-20',
        unit: 'skjell',
        variants: { easy: variant, base: variant, hard: variant },
        hints: [
          { text: 'Se på skjellene du har funnet, øverst på skjermen.' },
          {
            text: 'Her er de. Tell dem.',
            visual: { kind: 'equalGroups', groups: 1, each: 3, image: SHELL_ICON },
          },
          { text: 'Ett, to, tre. Du fant tre skjell.' },
        ],
      },
    };
  }

  const difficulty: Difficulty = grade === 2 && firstTime ? 'easy' : picked;
  const { groups, each } = BASKET[difficulty];
  return {
    difficulty,
    praise: stepPraise(groups, each),
    stage: {
      id: 'brygga-kurven',
      kind: 'numberChoice',
      conceptId: 'ganging-enkel',
      unit: 'skjell',
      variants: {
        easy: basketVariant(BASKET.easy.groups, BASKET.easy.each),
        base: basketVariant(BASKET.base.groups, BASKET.base.each),
        hard: basketVariant(BASKET.hard.groups, BASKET.hard.each),
      },
      hints: basketHints(groups, each),
    },
  };
}

/**
 * School year from the profile. `null` is not "unknown" — the profile defines
 * it as "går ikke på skolen ennå", so it is year 0, not a guess from age.
 */
export function gradeOf(profile: { grade: number | null } | null): number {
  return profile?.grade ?? 0;
}
