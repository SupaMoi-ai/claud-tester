import type { Concept, Subject } from '../learning/types';

/**
 * Seed learning graph.
 *
 * Titles and descriptions here are PARENT-facing — they appear in the parent
 * dashboard and learning map, never on a child screen. The child only ever
 * meets these concepts dressed up as story beats.
 *
 * `worldLocation` ties a concept to a place on the island, which is what lets
 * the world grow as specific knowledge grows.
 */

const c = (
  id: string,
  subject: Subject,
  title: string,
  description: string,
  gradeRange: [number, number],
  prerequisites: string[],
  worldLocation?: string,
): Concept => ({
  id,
  subject,
  title,
  description,
  gradeRange,
  prerequisites,
  worldLocation,
});

export const CONCEPTS: Concept[] = [
  // ---------------------------------------------------------------- MATEMATIKK
  c('tall-1-20', 'matematikk', 'Tall 1–20',
    'Kjenner igjen, teller og sammenligner tall opp til 20.',
    [1, 2], [], 'tallfjellet'),

  c('telling-oppover-nedover', 'matematikk', 'Telle opp og ned',
    'Teller videre fra et hvilket som helst tall, og baklengs igjen.',
    [1, 2], ['tall-1-20'], 'tallfjellet'),

  c('addisjon-under-20', 'matematikk', 'Addisjon under 20',
    'Legger sammen to tall når svaret blir 20 eller mindre.',
    [1, 3], ['tall-1-20'], 'tallfjellet'),

  c('subtraksjon-under-20', 'matematikk', 'Subtraksjon under 20',
    'Trekker fra, og forstår hvor mye som er igjen.',
    [1, 3], ['addisjon-under-20'], 'tallfjellet'),

  c('tiere-og-enere', 'matematikk', 'Tiere og enere',
    'Ser at 34 er tre tiere og fire enere.',
    [2, 3], ['tall-1-20'], 'tallfjellet'),

  c('addisjon-over-20', 'matematikk', 'Addisjon med tiere',
    'Regner med tosifrede tall, med og uten veksling.',
    [2, 4], ['subtraksjon-under-20', 'tiere-og-enere'], 'tallfjellet'),

  c('ganging-enkel', 'matematikk', 'Enkel multiplikasjon',
    'Forstår ganging som gjentatt addisjon — 4 grupper med 3.',
    [2, 4], ['addisjon-over-20'], 'tallfjellet'),

  c('deling-enkel', 'matematikk', 'Enkel deling',
    'Deler likt i grupper, og ser at deling er ganging baklengs.',
    [3, 4], ['ganging-enkel'], 'tallfjellet'),

  c('maaling-lengde', 'matematikk', 'Måling og lengde',
    'Bruker centimeter, meter og kilometer til å beskrive avstand.',
    [2, 4], ['tall-1-20'], 'havna'),

  c('moenster', 'matematikk', 'Mønster og rekker',
    'Finner regelen i en rekke og fortsetter den.',
    [1, 3], ['telling-oppover-nedover'], 'oppfinneroya'),

  c('former-og-rom', 'matematikk', 'Former og rom',
    'Kjenner igjen former og hvordan de passer sammen.',
    [1, 3], [], 'oppfinneroya'),

  c('klokka', 'matematikk', 'Klokka',
    'Leser hele og halve timer, og regner ut hvor lenge noe varer.',
    [2, 4], ['tall-1-20'], 'historiedalen'),

  // --------------------------------------------------------------------- NORSK
  c('bokstaver', 'norsk', 'Bokstaver og lyder',
    'Kjenner bokstavene og lyden hver av dem lager.',
    [1, 2], [], 'fortellerbyen'),

  c('lese-ord', 'norsk', 'Lese ord',
    'Trekker lydene sammen til hele ord.',
    [1, 2], ['bokstaver'], 'fortellerbyen'),

  c('lese-setninger', 'norsk', 'Lese setninger',
    'Leser korte setninger med flyt og forstår hva de sier.',
    [1, 3], ['lese-ord'], 'fortellerbyen'),

  c('leseforstaaelse', 'norsk', 'Leseforståelse',
    'Finner viktig informasjon i en kort tekst og bruker den.',
    [2, 4], ['lese-setninger'], 'fortellerbyen'),

  c('ordforraad', 'norsk', 'Ordforråd',
    'Møter nye ord og forklarer dem med egne ord.',
    [1, 4], ['lese-ord'], 'fortellerbyen'),

  c('staving', 'norsk', 'Staving',
    'Skriver vanlige ord riktig, og hører hvor lydene hører hjemme.',
    [2, 4], ['lese-ord'], 'fortellerbyen'),

  c('skrive-setninger', 'norsk', 'Skrive setninger',
    'Setter sammen egne setninger med stor bokstav og punktum.',
    [2, 4], ['staving', 'lese-setninger'], 'fortellerbyen'),

  c('fortelling', 'norsk', 'Fortelle og gjenfortelle',
    'Forteller hva som skjedde, i riktig rekkefølge.',
    [1, 4], ['lese-setninger'], 'fortellerbyen'),

  c('muntlig-refleksjon', 'norsk', 'Sette ord på det du lærte',
    'Forklarer med egne ord hva som var nytt eller overraskende.',
    [1, 5], ['fortelling'], 'fortellerbyen'),

  // ------------------------------------------------------------------ NATURFAG
  c('dyr', 'naturfag', 'Dyr',
    'Kjenner igjen dyr og hva som gjør dem forskjellige.',
    [1, 3], [], 'skoglandet'),

  c('leveomraader', 'naturfag', 'Leveområder',
    'Forstår at dyr lever der de finner mat, ly og varme.',
    [1, 4], ['dyr'], 'skoglandet'),

  c('arktiske-dyr', 'naturfag', 'Dyr i Arktis',
    'Vet hvordan dyr i kulda holder på varmen — pels, fett og farge.',
    [2, 5], ['leveomraader'], 'nordlysobservatoriet'),

  c('okosystem', 'naturfag', 'Økosystem',
    'Ser at planter, dyr og vær henger sammen.',
    [3, 5], ['leveomraader'], 'skoglandet'),

  c('aarstider', 'naturfag', 'Årstider',
    'Vet hvorfor året skifter, og hva som skjer i naturen da.',
    [1, 3], [], 'skoglandet'),

  c('vaer', 'naturfag', 'Vær',
    'Beskriver vær, og hva som lager regn, vind og snø.',
    [1, 4], ['aarstider'], 'nordlysobservatoriet'),

  c('temperatur', 'naturfag', 'Temperatur',
    'Leser temperatur, også under null, og sammenligner steder.',
    [2, 4], ['vaer', 'tall-1-20'], 'nordlysobservatoriet'),

  c('kart-og-sted', 'naturfag', 'Kart og steder',
    'Finner steder på et kart og forstår hva nord og sør betyr.',
    [2, 4], [], 'havna'),

  c('havet', 'naturfag', 'Havet',
    'Vet hva som lever i havet og hvordan det henger sammen med oss.',
    [2, 5], ['leveomraader', 'kart-og-sted'], 'havna'),

  c('fysikk-krefter', 'naturfag', 'Krefter og bevegelse',
    'Utforsker dytting, dragning, tyngde og balanse.',
    [2, 5], ['former-og-rom'], 'oppfinneroya'),

  c('lys-og-himmel', 'naturfag', 'Lys og himmelen',
    'Utforsker sol, stjerner, mørketid og nordlys.',
    [2, 5], ['aarstider'], 'nordlysobservatoriet'),
];

export const CONCEPTS_BY_ID: Record<string, Concept> = Object.fromEntries(
  CONCEPTS.map((x) => [x.id, x]),
);

export function getConcept(id: string): Concept | undefined {
  return CONCEPTS_BY_ID[id];
}

export const SUBJECTS: Subject[] = ['matematikk', 'norsk', 'naturfag'];
