import type { Adventure } from '../../adventure/types';

/**
 * ISBJØRNEN SOM GIKK SEG VILL — Svalbard.
 *
 * The prototype's one complete adventure. Six tasks, each a different shape,
 * all inside a single story: maths, natural science, reading, geography,
 * drawing and saying what you learned out loud.
 *
 * Note how the maths never announces itself. The child is not "doing
 * subtraction"; they are working out how much further they have to walk in a
 * snowstorm. That framing is the whole product.
 *
 * Content is kept in this file (rather than in i18n/nb.ts) because an
 * adventure is a written work, not interface chrome — a translated adventure
 * becomes `isbjornen.nn.ts` and is registered per locale in ./index.ts.
 */
export const isbjornen: Adventure = {
  id: 'isbjornen',
  title: 'Isbjørnen som gikk seg vill',
  place: 'Svalbard',
  teaser: 'Radioen fra Svalbard knitrer. Noen trenger hjelp.',
  emoji: '🐻‍❄️',
  locationId: 'havna',
  heroCharacter: 'lumi',
  concepts: [
    'subtraksjon-under-20',
    'arktiske-dyr',
    'leseforstaaelse',
    'kart-og-sted',
    'leveomraader',
    'muntlig-refleksjon',
  ],
  unlocks: ['nordlystaarn', 'nordlysobservatoriet'],
  takeaways: [
    { emoji: '➖', text: 'Du regnet ut hvor langt det var igjen å gå.' },
    { emoji: '🐻‍❄️', text: 'Du fant ut at isbjørnhår ikke er hvite i det hele tatt.' },
    { emoji: '📖', text: 'Du fant den viktigste setningen i beskjeden fra forskeren.' },
    { emoji: '🗺️', text: 'Du fant Svalbard på kartet.' },
  ],

  stages: [
    /* ------------------------------------------------------------ opening */
    {
      kind: 'story',
      id: 'apning',
      cta: 'Vi hjelper!',
      lines: [
        { who: 'lumi', mood: 'curious', text: 'Hysj litt … hører du det? Radioen nede i havna har stått og knitret hele morgenen.' },
        { who: 'lumi', mood: 'thinking', text: '«Vi har et problem! En liten isbjørn har kommet bort fra mammaen sin.»' },
        { who: 'lumi', mood: 'curious', text: 'Det er fra Svalbard. Det ligger langt, langt mot nord — der det er is nesten hele året.' },
        { who: 'lumi', mood: 'excited', text: 'Ungen er helt alene. Skal vi dra og hjelpe?' },
      ],
    },

    /* --------------------------------------------- 1: distance (maths) */
    {
      kind: 'numberChoice',
      id: 'avstand',
      conceptId: 'subtraksjon-under-20',
      intro: [
        { who: 'lumi', mood: 'happy', text: 'Vi er framme! Det knirker i snøen, og det lukter salt og kaldt.' },
        { who: 'lumi', mood: 'thinking', text: 'Forskningsstasjonen ligger 4 km unna. Vi har allerede gått 1 km.' },
      ],
      variants: {
        easy: {
          prompt: 'Vi skal gå 3 km, og vi har gått 1. Hvor langt er det igjen?',
          options: [1, 2, 3],
          answer: 2,
          visual: { kind: 'numberline', from: 0, to: 3, walked: 1, unit: 'km' },
        },
        base: {
          prompt: 'Så … hvor langt er det igjen?',
          options: [2, 3, 4, 5],
          answer: 3,
          visual: { kind: 'numberline', from: 0, to: 4, walked: 1, unit: 'km' },
        },
        hard: {
          prompt: 'Vinden snudde, så vi må rundt. Nå er det 12 km i alt, og vi har gått 5. Hvor langt er det igjen?',
          options: [5, 6, 7, 8],
          answer: 7,
          visual: { kind: 'numberline', from: 0, to: 12, walked: 5, unit: 'km' },
        },
      },
      hints: [
        { text: 'Prøv å telle videre fra der vi er, helt til vi er framme. Hvor mange steg ble det?' },
        {
          text: 'Se på streken. Vi står der det røde merket er — tell rutene fram til enden.',
          visual: { kind: 'numberline', from: 0, to: 4, walked: 1, unit: 'km' },
        },
        { text: 'Vi skulle gå 4 km og har gått 1. Da tar vi 4 − 1, og det blir 3. Så det er 3 km igjen!' },
      ],
      after: [
        { who: 'lumi', mood: 'excited', text: 'Tre kilometer! Det klarer vi lett. Kom igjen!' },
      ],
    },

    /* ------------------------------------------ 2: polar bear (science) */
    {
      kind: 'guessReveal',
      id: 'pels',
      conceptId: 'arktiske-dyr',
      intro: [
        { who: 'lumi', mood: 'curious', text: 'Der! Bak snøhaugen … ser du den vesle hvite dusken?' },
        { who: 'lumi', mood: 'happy', text: 'Det er ungen. Den har gjemt seg for vinden.' },
      ],
      prompt: 'Isbjørnen ser jo helt hvit ut. Men tror DU at hårene faktisk er hvite?',
      options: [
        { id: 'ja', label: 'Ja, helt hvite', emoji: '🤍' },
        { id: 'nei', label: 'Nei, noe annet', emoji: '🤔' },
        { id: 'kanskje', label: 'Aner ikke — gjetter!', emoji: '🎲' },
      ],
      revealEmoji: '🔬',
      revealTitle: 'Nei! Hårene er faktisk gjennomsiktige.',
      revealBody:
        'Hvert hår er hult inni, som et bittelite sugerør. Lyset spretter rundt inne i det, og da ser det hvitt ut for oss — akkurat som snø egentlig er klar is. Og vet du hva som er under pelsen? Svart hud. Svart suger til seg varmen fra sola, så isbjørnen holder seg varm selv når det er tretti kuldegrader.',
      after: [
        { who: 'lumi', mood: 'excited', text: 'Gjennomsiktig og svart på én gang. Naturen er litt sprø, spør du meg.' },
      ],
    },

    /* ------------------------------------------------- 3: reading a note */
    {
      kind: 'reading',
      id: 'beskjed',
      conceptId: 'leseforstaaelse',
      intro: [
        { who: 'lumi', mood: 'thinking', text: 'Det henger en lapp på døra til stasjonen. Kan du lese den for meg?' },
      ],
      from: 'Ingrid, forsker på stasjonen',
      body:
        'Hei! Vi så ungen i morges ved den gamle værstasjonen. Mora har vært ute på isen mot øst i to dager. Ungen er sulten, men frisk. Ikke prøv å mate den — den må finne mora si selv.',
      question: 'Hvor så forskerne ungen sist?',
      options: [
        { id: 'vaerstasjon', label: 'Ved den gamle værstasjonen', emoji: '🏚️' },
        { id: 'isen', label: 'Ute på isen mot øst', emoji: '🧊' },
        { id: 'havna', label: 'Nede i havna', emoji: '⚓' },
      ],
      answer: 'vaerstasjon',
      hints: [
        { text: 'Let etter setningen som begynner med «Vi så ungen …». Svaret gjemmer seg der.' },
        {
          text: 'Se på den første setningen. Den forteller både når og hvor.',
          visual: { kind: 'highlight', sentence: 'Vi så ungen i morges ved den gamle værstasjonen.' },
        },
        { text: 'Det står «Vi så ungen i morges ved den gamle værstasjonen». Så det er der de så den sist. Det med isen mot øst handler om mora.' },
      ],
      after: [
        { who: 'lumi', mood: 'happy', text: 'Bra lest! Mora er altså østover, på isen. Da vet vi hvilken vei vi skal se.' },
      ],
    },

    /* ------------------------------------------------- 4: find Svalbard */
    {
      kind: 'mapFind',
      id: 'kart',
      conceptId: 'kart-og-sted',
      intro: [
        { who: 'lumi', mood: 'curious', text: 'Vi må si fra på radioen hvor vi er. Men … hvor ER vi, egentlig?' },
      ],
      prompt: 'Kan du finne Svalbard på kartet?',
      targets: [
        { id: 'svalbard', label: 'Svalbard', x: 56, y: 14 },
        { id: 'nord-norge', label: 'Nord-Norge', x: 47, y: 47 },
        { id: 'sor-norge', label: 'Sør-Norge', x: 33, y: 72 },
        { id: 'island', label: 'Island', x: 12, y: 40 },
      ],
      answer: 'svalbard',
      hints: [
        { text: 'Svalbard ligger lengst mot nord av alt her. Nord er oppover på kartet.' },
        {
          text: 'Helt øverst. Det er det stedet som ligger aller lengst fra de andre.',
          visual: { kind: 'pointer', targetId: 'svalbard', note: 'Nordover!' },
        },
        { text: 'Svalbard er øygruppa helt øverst på kartet, langt nord for Norge. Den lille flekken der oppe.' },
      ],
      after: [
        { who: 'lumi', mood: 'excited', text: 'Riktig! Vi er nesten på toppen av kartet. Ikke rart det er kaldt.' },
      ],
    },

    /* --------------------------------------------------- 5: drawing */
    {
      kind: 'drawing',
      id: 'hvileplass',
      conceptId: 'leveomraader',
      intro: [
        { who: 'lumi', mood: 'thinking', text: 'Ungen skjelver. Den trenger et sted å hvile mens vi venter på mora.' },
      ],
      prompt: 'Kan du tegne et varmt sted isbjørnungen kan hvile?',
      after: [
        { who: 'lumi', mood: 'excited', text: 'Den la seg med én gang. Se, den sovner nesten!' },
      ],
    },

    /* ------------------------------------------------- 6: reflection */
    {
      kind: 'reflection',
      id: 'refleksjon',
      conceptId: 'muntlig-refleksjon',
      intro: [
        { who: 'lumi', mood: 'curious', text: 'Mens vi venter … jeg er kjempenysgjerrig på én ting.' },
      ],
      prompt: 'Hva var det kuleste du lærte i dag?',
      after: [],
    },

    /* ------------------------------------------------------- the ending */
    {
      kind: 'story',
      id: 'slutten',
      cta: 'Se hva som skjedde!',
      lines: [
        { who: 'lumi', mood: 'thinking', text: 'Hysj. Hører du det? Noe tungt som går i snøen …' },
        { who: 'lumi', mood: 'excited', text: 'DER! Ute på isen mot øst — akkurat der lappen sa!' },
        { who: 'lumi', mood: 'excited', text: 'Ungen våknet med ett og satte av gårde. Og mamma-bjørnen la seg ned og lot den krype helt inntil.' },
        { who: 'lumi', mood: 'happy', text: 'De fant hverandre. Og det var du som fant veien.' },
      ],
    },
  ],
};
