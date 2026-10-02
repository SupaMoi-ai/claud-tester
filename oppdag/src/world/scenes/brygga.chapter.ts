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

/** The thanks, and the way north. */
export const THANKS: Beat[] = [
  { portrait: 'pleased', line: 'Ett, to, tre. Tre skjell! Takk skal du ha.' },
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
