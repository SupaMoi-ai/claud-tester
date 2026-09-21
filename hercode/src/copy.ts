/**
 * Every user-facing string lives here.
 *
 * Tone rules (enforced by src/test/copy.test.ts):
 * no causal hormone claims, no guilt language, no streaks, no cheerleading,
 * no exclamation marks. Postponed items are "moved", never late.
 */

import type { CapacityLevel } from './domain/types';

export const capacityLabel: Record<CapacityLevel, string> = {
  minimum: 'Bare minimum',
  light: 'A little',
  normal: 'Normal',
  high: 'I actually have energy',
};

export const capacityDescription: Record<CapacityLevel, string> = {
  minimum: 'Only what has to happen.',
  light: 'One thing, plus the essentials.',
  normal: 'Three things feels right.',
  high: 'Room for something extra.',
};

export const copy = {
  app: {
    name: 'HerCode',
    partnerApp: 'BroCode',
    disclaimer: 'Personal observations, not medical advice.',
  },

  common: {
    skip: 'Skip',
    done: 'Done',
    back: 'Back',
    next: 'Next',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    close: 'Close',
    notEnoughData: 'Not enough data yet',
  },

  tabs: {
    today: 'Today',
    brain: 'Brain',
    patterns: 'Patterns',
    me: 'Me',
  },

  onboarding: {
    skipAll: 'Skip setup',
    useDemo: 'Use demo (Mia)',
    step: (n: number, total: number) => `Step ${n} of ${total}`,
    intro: 'A few questions. You can change any of this later.',

    helpTitle: 'What would you like help with?',
    helpHint: 'Choose as many as you like.',

    overwhelmTitle: "What usually happens when there's too much?",
    overwhelmHint: 'This helps HerCode suggest the right kind of step.',
    overwhelmOptions: {
      freeze: 'I freeze',
      'jump-between': 'I jump between things',
      forget: 'I forget',
      avoid: 'I avoid everything',
      exhausted: 'I become exhausted',
      depends: 'Depends on the day',
    },

    cycleTitle:
      'Would you like HerCode to include your cycle when looking for personal patterns?',
    cycleHint:
      'Cycle data is one signal among sleep, stress, mood, workload and energy. It stays private unless you choose otherwise.',
    cycleOptions: {
      yes: 'Yes',
      'maybe-later': 'Maybe later',
      no: 'No',
    },

    partnerTitle: 'Would you like to connect a partner?',
    partnerHint:
      'Everything is private by default. You choose what your partner can see, one item at a time.',
    partnerYes: 'Connect Jonas',
    partnerNo: 'Not now',

    nameTitle: 'What should we call you?',
    namePlaceholder: 'Your name',
    nameHint: 'Leave it as Mia to keep the demo data familiar.',
    finish: 'Start',
  },

  checkIn: {
    title: 'How are you arriving today?',
    subtitle: 'About five seconds.',
    energy: 'Energy',
    energyScale: ['Very low', 'Low', 'Middling', 'Good', 'High'],
    brain: 'Brain',
    brainOptions: { foggy: 'Foggy', normal: 'Normal', sharp: 'Sharp' },
    capacity: 'Capacity',
    feelings: 'Anything else? (optional)',
    submit: 'Done',
  },

  today: {
    greetingMorning: (name: string) => `Good morning, ${name}`,
    greetingAfternoon: (name: string) => `Good afternoon, ${name}`,
    greetingEvening: (name: string) => `Good evening, ${name}`,
    contextEnergy: 'Energy',
    contextBrain: 'Brain',
    contextCapacity: 'Capacity',
    noCheckIn: 'Not set',
    todaysThree: "Today's 3",
    todaysOne: 'Your one thing',
    fixed: 'Fixed today',
    essentials: 'Essentials',
    stretch: 'If you have room',
    stretchHint: 'Optional.',
    everythingElse: 'Everything else',
    everythingElseCount: (n: number) => `Everything else (${n})`,
    everythingElseHint: 'Still here whenever you want it.',
    overwhelmed: "I'm overwhelmed",
    allDone: "That's everything you planned for today.",
    emptyPrimary: 'Nothing planned beyond the essentials.',
    movedNote: (n: number) => (n === 1 ? 'Moved once' : `Moved ${n} times`),
    twoMinuteOffer: 'Want a two-minute first step instead?',
    twoMinuteCta: 'Make it two minutes',

    plan: {
      minimum: 'Everything else can move.',
      minimumLead: 'Today, enough is:',
      light: 'One thing, plus the essentials.',
      normal: 'Three things, plus what is already fixed.',
      high: "Today's 3, and one extra if you want it.",
    },

    suppressed: (n: number) =>
      `${n} non-essential reminders are hidden while you are at bare minimum.`,
  },

  taskActions: {
    complete: 'Complete',
    snooze: 'Snooze',
    snoozeLaterToday: 'Later today',
    snoozeTomorrow: 'Tomorrow',
    snoozeSomeday: 'Someday',
    move: 'Move',
    cantStart: "I can't start",
    askAI: 'Ask HerCode',
    moved: 'Moved',
    movedToTomorrow: 'Moved to tomorrow',
    movedToSomeday: 'Moved to someday',
    completedToast: 'Marked complete.',
  },

  overwhelm: {
    title: 'How much can you handle right now?',
    subtitle: 'Your plan changes straight away. Nothing is deleted.',
    confirm: 'Use this',
  },

  brain: {
    title: "What's in your head?",
    subtitle: 'Put it down first. Sorting happens after.',
    placeholder: 'Type or speak whatever is taking up space...',
    voice: 'Speak instead',
    voiceListening: 'Listening',
    voiceSample:
      'Need to buy Ellie rain boots, book hair appointment, remember that green lamp I liked and maybe tacos Thursday',
    submit: 'Empty my head',
    processing: 'Sorting this out',
    draftTitle: 'Here is what I heard',
    draftHint: 'Change anything that landed in the wrong place.',
    approveAll: 'Looks right',
    search: 'Search everything',
    searchEmpty: 'Nothing matches that yet.',
    empty: 'Nothing captured yet. The box above takes anything.',
    sections: {
      task: 'Tasks',
      shopping: 'Shopping',
      idea: 'Ideas',
      remember: 'Remember',
      someday: 'Someday',
      meal: 'Meal ideas',
      appointment: 'Appointments',
    },
    categoryLabel: {
      task: 'Task',
      shopping: 'Shopping',
      idea: 'Idea/Saved',
      remember: 'Remember',
      someday: 'Someday',
      meal: 'Meal idea',
      appointment: 'Appointment',
    },
  },

  ai: {
    button: 'Ask HerCode',
    thinking: 'Thinking',
    promptsToday: [
      'What should I do first?',
      'I have 15 minutes',
      'Plan my afternoon',
      'What am I forgetting?',
    ],
    promptsBrain: ['Make this easier', 'What am I forgetting?', 'Move non-urgent things'],
    breakdownTitle: "Let's make this smaller.",
    stepLabel: (n: number) => `Step ${n}`,
    stepMinutes: (m: number) => `${m} min`,
    nextStep: 'Done, next step',
    lastStep: 'That was the last step.',
    easier: 'Make it even easier',
    fiveMinute: 'Give me 5-minute version',
    later: 'Do later',
    keepSteps: 'Keep these steps',
    askSomethingElse: 'Ask something else',
    noTasks: 'Nothing is waiting on you right now.',
  },

  patterns: {
    title: 'Patterns',
    intro: 'Based on your check-ins and what you have finished.',
    noticed: 'HerCode noticed a possible pattern.',
    why: 'Why am I seeing this?',
    hideWhy: 'Hide the data',
    sampleSize: (n: number) => `Drawn from ${n} entries`,
    notEnoughTitle: 'Not enough data yet',
    notEnoughBody: 'A few more days of check-ins and this one can appear.',

    cycleOffTitle: 'Your cycle is not part of this',
    cycleOffBody:
      'Cycle data is one signal among sleep, stress, mood, workload and energy. You can include it whenever you want to, and turn it off again.',
    cycleOffCta: 'Include my cycle',

    /** Sentences are templates so the numbers come from real events. */
    text: {
      callsBeforeNoon: 'You tend to complete phone calls more often before 12:00.',
      capacityAfterSocial: (low: number, total: number) =>
        `You reported low capacity on ${low} of the last ${total} days after two consecutive social evenings.`,
      energyAroundCycle:
        'Your average energy has been higher around this part of your cycle during your last three cycles.',
      energyAroundCycleLevel:
        'Your average energy around this part of your cycle has been about the same as at other times.',
      steppedHousehold:
        'You usually finish household tasks more consistently when they are broken into steps under 10 minutes.',
    },

    evidence: {
      before12: 'Finished before 12:00',
      after12: 'Finished after 12:00',
      ofCompleted: (n: number, total: number) => `${n} of ${total}`,
      recentCall: 'Recent call',
      dayAfterTwo: 'Day after two social evenings',
      lowCapacity: 'Low capacity',
      normalOrBetter: 'Normal or better',
      cycleDays: (from: number, to: number) => `Cycle days ${from}-${to}`,
      averageEnergy: (value: string) => `${value} of 5`,
      thisPartOfCycle: 'Where you are now',
      aroundNow: (from: number, to: number) => `Around cycle day ${from}-${to}`,
      otherDays: 'Other days in your cycle',
      entries: (n: number) => `${n} check-ins`,
      withSmallSteps: 'Broken into small steps',
      withoutSmallSteps: 'Not broken into steps',
      finishedRate: (done: number, total: number) => `${done} of ${total} finished`,
    },

    chart: {
      calls: 'calls',
      energy: 'average energy',
      household: 'finished',
      days: 'days',
    },
  },

  me: {
    title: 'Me',
    partner: 'Partner & BroCode',
    partnerHint: 'Choose what your partner can see.',
    decisions: 'Decision load',
    decisionsHint: 'Who decides what, so you are not asked every time.',
    privacy: 'Privacy overview',
    privacyHint: 'Everything is private until you share it.',
    reset: 'Reset demo data',
    resetHint: 'Puts Mia back the way she started.',
    resetConfirmTitle: 'Reset the demo?',
    resetConfirmBody:
      'This clears everything you changed in this session and loads the original demo data again.',
    resetConfirm: 'Reset',
  },

  partner: {
    title: 'Partner & BroCode',
    connected: (name: string) => `Connected to ${name}`,
    notConnected: 'No partner connected',
    connectCta: 'Connect Jonas',
    disconnectCta: 'Disconnect',

    sharingTitle: 'What can be shared',
    sharingHint: 'Off by default. Turn on only what you want your partner to see.',
    categories: {
      appointment: 'Appointments',
      household: 'Household jobs',
      shopping: 'Shopping',
      family: 'Family tasks',
    },

    signalTitle: "Today's signal",
    signalHint: 'A simple state your partner can see. It clears at the end of the day.',
    signalNone: 'No signal',

    cycleTitle: 'Exact cycle detail',
    cycleHint: 'Off. Your cycle stays private unless you turn this on.',
    cycleOn: 'On. Your partner can see which cycle day you are on.',
    cycleConfirmTitle: 'Share your exact cycle day?',
    cycleConfirmBody:
      'Your partner will see which day of your cycle you are on. Symptoms, mood and notes stay private either way. You can turn this off again at any time.',
    cycleConfirmYes: 'Yes, share the cycle day',

    previewTitle: 'This is what your partner can currently see',
    openBroCode: 'Open BroCode preview',
  },

  brocode: {
    name: 'BroCode',
    tagline: (name: string) => `${name}'s companion app`,
    sharedTitle: (name: string) => `${name} has shared`,
    nothingShared: (name: string) => `${name} has not shared anything today.`,
    nothingSharedHint: 'That is the default. Nothing reaches you unless she chooses it.',
    takeOverTitle: 'Things you can take over',
    takeOverEmpty: 'Nothing is shared with you right now.',
    helpfulTitle: 'Helpful today',
    decisionsTitle: 'Who decides what',
    cycleDay: (day: number) => `Cycle day ${day}`,
    manageSharing: 'Manage sharing',

    helpful: {
      default: 'Try solving one practical thing without asking her to manage the process.',
      'low-capacity':
        'Try solving one practical thing without asking her to manage the process.',
      'need-quiet': 'Keep this evening low-key. A quiet room does more than a conversation.',
      'could-use-affection': 'Sit next to her for a while. Nothing needs solving.',
      'mentally-overloaded': 'Take one decision off her list and tell her it is handled.',
      'feeling-social': 'A good evening to suggest doing something together.',
      'need-practical-help': 'Pick one job below and do it without checking in first.',
      'want-to-talk': 'Make some space to listen this evening.',
    },
  },

  signals: {
    'low-capacity': 'Low capacity',
    'need-quiet': 'Need quiet',
    'could-use-affection': 'Could use affection',
    'mentally-overloaded': 'Mentally overloaded',
    'feeling-social': 'Feeling social',
    'need-practical-help': 'Need practical help',
    'want-to-talk': 'Want to talk',
  },

  decisions: {
    title: 'Decision load',
    hint: 'Set this once, so the same question stops coming back.',
    rules: {
      'partner-decides': 'Partner can decide',
      'partner-handles': 'Partner can handle',
      'partner-takes-over': 'Partner can take over',
      'ask-me-first': 'Ask me first',
      'always-ask': 'Always ask',
    },
    takeOver: {
      'partner-decides': (topic: string) => `Decide ${topic.toLowerCase()}`,
      'partner-handles': (topic: string) => `Handle ${topic.toLowerCase()}`,
      'partner-takes-over': (topic: string) => `Take over ${topic.toLowerCase()}`,
    },
    fromRule: 'Your decision-load setting',
    fromTask: 'Shared with your partner',
  },

  privacy: {
    title: 'Privacy overview',
    intro: 'Everything is private by default. You choose what leaves this app.',
    privateTitle: 'Private',
    privateBody:
      'Notes, exact symptoms, mood logs, cycle details and anything in your Brain. Never shared.',
    sharedTitle: 'Shared',
    sharedBody:
      'Appointments, household jobs, shopping and family tasks, one category at a time, only when you turn them on.',
    signalTitle: 'Partner signal',
    signalBody:
      'A single simplified state you pick yourself. It clears at the end of the day.',
    liveTitle: 'Live right now',
    nothingLive: 'Nothing is being shared.',
    manage: 'Manage sharing',
  },
} as const;
