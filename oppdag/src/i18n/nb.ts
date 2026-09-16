/**
 * Norwegian Bokmål — all child- and parent-facing interface copy.
 *
 * Tone rules for anything added here:
 *   - short, warm, conversational. Never school-formal.
 *   - BAD:  "Besvar følgende matematiske spørsmål."
 *   - GOOD: "Hmm… hvor langt har vi igjen, tror du?"
 *   - never the words test, poeng, feil, karakter, nivå towards the child.
 *
 * Adding a locale: copy this file to nn.ts / en.ts and translate. The `Copy`
 * type in ./index.ts is derived from this object, so a missing or renamed key
 * becomes a compile error rather than a blank screen.
 */
export const nb = {
  meta: {
    locale: 'nb',
    name: 'Norsk bokmål',
  },

  app: {
    name: 'OPPDAG',
    tagline: 'Et helt univers å lære i',
  },

  common: {
    back: 'Tilbake',
    next: 'Videre',
    yes: 'Ja!',
    no: 'Ikke nå',
    done: 'Ferdig',
    close: 'Lukk',
    continue: 'Fortsett',
    letsGo: 'Kom igjen!',
    home: 'Hjem',
  },

  splash: {
    hello: 'Hei!',
    intro: 'Bli med Lumi ut i verden.',
    start: 'Start eventyret',
    resume: (name: string) => `Fortsett som ${name}`,
    demo: 'Bruk demo-profil (Mia)',
    demoHint: 'Hopp rett inn i verdenen med en ferdig profil.',
    parents: 'For voksne',
  },

  parentSetup: {
    title: 'Først et lite ord til deg som er voksen',
    body: 'OPPDAG er laget for å utforskes fritt. Barnet ditt ser aldri prøver, poeng eller reklame — bare en verden som vokser når de lærer noe.',
    points: [
      'Ingen reklame, ingen kjøp inne i spillet.',
      'Ingen chat, ingen profiler, ingen fremmede.',
      'Alt lagres kun på denne enheten.',
      'Innstillinger er låst bak en voksenport.',
    ],
    cta: 'Jeg forstår — sett i gang',
    childStarts: 'Nå tar barnet over',
  },

  onboarding: {
    nameTitle: 'Hei! Hva heter du?',
    nameHint: 'Skriv navnet ditt her',
    namePlaceholder: 'Navnet ditt',
    nameCta: 'Det er meg!',

    ageTitle: (name: string) => `Hyggelig å møte deg, ${name}!`,
    ageQuestion: 'Hvor gammel er du?',
    ageUnit: 'år',
    gradeQuestion: 'Hvilket trinn går du i?',
    gradeOption: (n: number) => `${n}. trinn`,
    gradeNone: 'Går ikke på skolen ennå',

    interestTitle: 'Hva er du nysgjerrig på?',
    interestHint: 'Velg alt du synes er spennende.',
    interestCta: 'Sånn, ja!',
    interestNeedOne: 'Velg minst én ting du liker',

    welcomeTitle: (name: string) => `Velkommen, ${name}!`,
    welcomeBody:
      'Jeg heter Lumi. Jeg kjenner alle de rare og fine stedene i denne verdenen — og jeg finner stadig nye.',
    welcomeCta: 'Vis meg!',
  },

  check: {
    lumiIntro:
      'Før vi drar på eventyr må jeg finne ut hva du allerede kan. Klar?',
    start: 'Klar!',
    progress: (i: number, total: number) => `${i} av ${total}`,
    done: 'Nå vet jeg nok!',
    outroTitle: 'Der, ja!',
    outroBody:
      'Nå vet jeg litt om hva du liker og hva du kan. Verdenen din venter.',
    outroCta: 'Inn i verdenen',
  },

  world: {
    /** Lumi's nudge towards the one thing there is to do right now. */
    lumiInvite:
      'Radioen nede i havna har knitret hele morgenen. Vil du høre hva det er?',
    lumiCaughtUp: (name: string) =>
      `Vi klarte det, ${name}! Jeg har samlet noen nye rare spørsmål til deg.`,
    lockedHint: 'Her har jeg ikke vært ennå …',
    locked: 'Kommer snart',
    profileLabel: 'Meg',
    parentLabel: 'For voksne',
    discoveriesLabel: 'Oppdagelser',
    emptyLumi: 'Jeg leter etter neste spor …',
  },

  adventure: {
    start: 'Vi hjelper!',
    notNow: 'Ikke akkurat nå',
    stageOf: (i: number, total: number) => `Steg ${i} av ${total}`,
    tryAgain: 'Prøv en gang til',
    helpMe: 'Lumi, hjelp meg',
    hintAgain: 'Hjelp meg litt mer',
    showMe: 'Vis meg hvordan',
    continue: 'Videre',
    thinking: 'Hmm …',
    leaveTitle: 'Ta en pause?',
    leaveBody: 'Eventyret venter på deg. Du kan komme tilbake når du vil.',
    leaveConfirm: 'Ta pause',
    leaveCancel: 'Bli her',
  },

  feedback: {
    right: ['Der, ja!', 'Akkurat!', 'Så smart!', 'Helt riktig!', 'Du fikk den!'],
    close: [
      'Nesten! Prøv en gang til.',
      'Ikke helt — men du er på sporet.',
      'Hmm, prøv en gang til. Jeg hjelper deg.',
    ],
    guessed: ['Spennende tanke!', 'God gjetning!', 'Sånn tenkte jeg også!'],
  },

  drawing: {
    colours: 'Farger',
    undo: 'Angre',
    clear: 'Start på nytt',
    save: 'Sånn skal det se ut!',
    savedTitle: 'For en fin tegning!',
  },

  reflection: {
    hold: 'Hold inne og fortell',
    listening: 'Jeg hører på deg …',
    orType: 'Eller skriv det i stedet',
    typePlaceholder: 'Det kuleste jeg lærte var …',
    send: 'Sånn!',
    mocked: 'Mikrofonen er ikke skrudd på her, så jeg gjettet på hva du sa.',
  },

  unlock: {
    eyebrow: 'Verdenen din vokser',
    cta: 'Se det!',
    toWorld: 'Tilbake til verdenen',
  },

  complete: {
    eyebrow: 'Eventyret er ferdig',
    learnedTitle: 'Dette fant du ut',
    cta: 'Tilbake til verdenen',
  },

  discoveries: {
    title: 'Oppdagelser',
    subtitle: 'Rare spørsmål jeg har samlet til deg.',
    cta: 'Finn ut →',
    soon: 'Lumi graver fortsatt i denne …',
    soonBody:
      'Dette eventyret er ikke helt ferdig ennå. Men jeg har notert at du lurer på det!',
  },

  profile: {
    title: 'Meg',
    age: (n: number) => `${n} år`,
    grade: (n: number) => `${n}. trinn`,
    interests: 'Jeg liker',
    worldTitle: 'Verdenen min',
    worldCount: (n: number, total: number) => `${n} av ${total} steder åpnet`,
    adventuresTitle: 'Eventyr jeg har vært på',
    noAdventures: 'Ingen ennå — men det kommer!',
    drawingsTitle: 'Tegningene mine',
    noDrawings: 'Her blir det plass til tegningene dine.',
  },

  gate: {
    title: 'Bare for voksne',
    body: 'Hold fingeren på sirkelen i tre sekunder.',
    holding: 'Hold …',
    hint: 'Slipp ikke ennå',
    success: 'Velkommen inn',
    childBack: 'Tilbake til spillet',
  },

  parent: {
    title: (name: string) => `${name} sin uke`,
    todayTitle: 'I dag oppdaget barnet ditt',
    todayEmpty:
      'Ingenting ennå i dag. Innsiktene dukker opp så snart barnet har vært på et eventyr.',
    togetherTitle: 'Prøv dette sammen',
    curiosityTitle: 'Nysgjerrigheten peker mot',
    mapCta: 'Se læringskartet',
    settingsTitle: 'Innstillinger',
    resetLabel: 'Nullstill alt',
    resetBody:
      'Sletter profil, framgang og tegninger fra denne enheten. Kan ikke angres.',
    resetConfirm: 'Ja, slett alt',
    resetCancel: 'Avbryt',
    privacyTitle: 'Data og personvern',
    privacyBody:
      'Alt barnet gjør lagres kun i nettleseren på denne enheten. Ingenting sendes noe sted, og det finnes ingen konto, reklame eller chat.',
    back: 'Tilbake',
  },

  map: {
    title: 'Læringskartet',
    subtitle:
      'Hver prikk er noe barnet kan møte. Linjene viser hva som bygger på hva.',
    legendSecure: 'Kan godt',
    legendDeveloping: 'Holder på å lære',
    legendNew: 'Kommer senere',
    filterAll: 'Alt',
    subjects: {
      matematikk: 'Matematikk',
      norsk: 'Norsk',
      naturfag: 'Naturfag',
    },
    detailPrereq: 'Bygger på',
    detailUnlocks: 'Åpner for',
    detailSeen: (s: string) => `Sist møtt ${s}`,
    detailNeverSeen: 'Ikke møtt ennå',
    tapHint: 'Trykk på en prikk for å se hva den betyr.',
  },

  loading: {
    lumi: 'Jeg leter etter neste spor …',
    bolt: 'Bygger noe smart …',
    birk: 'Snuser rundt i skogen …',
    otto: 'Tenker åtte tanker på én gang …',
  },

  time: {
    today: 'i dag',
    yesterday: 'i går',
    daysAgo: (n: number) => `for ${n} dager siden`,
  },
} as const;
