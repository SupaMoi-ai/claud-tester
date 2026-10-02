/**
 * The gentle starting activity.
 *
 * Never called a test, never scored, never shown as right/wrong in aggregate.
 * Its only job is to give the mastery map a starting position so the first
 * real adventure can pitch itself at roughly the right level.
 *
 * Deliberately mixed formats — counting, picking a picture, reading, spotting
 * a pattern — so it reads as a handful of small games rather than a quiz.
 */

export type CheckItem =
  | {
      kind: 'count';
      id: string;
      conceptId: string;
      prompt: string;
      emoji: string;
      count: number;
      options: number[];
    }
  | {
      kind: 'pick';
      id: string;
      conceptId: string;
      prompt: string;
      options: { id: string; emoji: string; label: string }[];
      answer: string;
    }
  | {
      kind: 'word';
      id: string;
      conceptId: string;
      prompt: string;
      word: string;
      options: { id: string; emoji: string; label: string }[];
      answer: string;
    }
  | {
      kind: 'pattern';
      id: string;
      conceptId: string;
      prompt: string;
      sequence: string[];
      options: string[];
      answer: string;
    }
  | {
      kind: 'sum';
      id: string;
      conceptId: string;
      prompt: string;
      a: number;
      b: number;
      emoji: string;
      options: number[];
    };

export const CHECK_ITEMS: CheckItem[] = [
  {
    kind: 'count',
    id: 'c1',
    conceptId: 'tall-1-20',
    prompt: 'Hjelp meg — hvor mange fisker er det her?',
    emoji: '🐟',
    count: 7,
    options: [5, 6, 7, 8],
  },
  {
    kind: 'pick',
    id: 'c2',
    conceptId: 'dyr',
    prompt: 'Hvem av disse liker seg best der det er skikkelig kaldt?',
    options: [
      { id: 'lion', emoji: '🦁', label: 'Løve' },
      { id: 'penguin', emoji: '🐧', label: 'Pingvin' },
      { id: 'camel', emoji: '🐫', label: 'Kamel' },
      { id: 'parrot', emoji: '🦜', label: 'Papegøye' },
    ],
    answer: 'penguin',
  },
  {
    kind: 'word',
    id: 'c3',
    conceptId: 'lese-ord',
    prompt: 'Hva står det her?',
    word: 'BÅT',
    options: [
      { id: 'car', emoji: '🚗', label: 'Bil' },
      { id: 'boat', emoji: '⛵', label: 'Båt' },
      { id: 'house', emoji: '🏠', label: 'Hus' },
    ],
    answer: 'boat',
  },
  {
    kind: 'sum',
    id: 'c4',
    conceptId: 'addisjon-under-20',
    prompt: 'Jeg fant 4 steiner, så fant jeg 3 til. Hvor mange har jeg nå?',
    a: 4,
    b: 3,
    emoji: '🪨',
    options: [6, 7, 8, 9],
  },
  {
    kind: 'pattern',
    id: 'c5',
    conceptId: 'moenster',
    prompt: 'Hva kommer etterpå, tror du?',
    sequence: ['🌲', '🍄', '🌲', '🍄', '🌲'],
    options: ['🌲', '🍄', '🐦'],
    answer: '🍄',
  },
  {
    kind: 'pick',
    id: 'c6',
    conceptId: 'aarstider',
    prompt: 'Når er det mørkest ute om ettermiddagen?',
    options: [
      { id: 'summer', emoji: '☀️', label: 'Om sommeren' },
      { id: 'winter', emoji: '❄️', label: 'Om vinteren' },
      { id: 'spring', emoji: '🌷', label: 'Om våren' },
    ],
    answer: 'winter',
  },
];
