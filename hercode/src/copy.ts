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
} as const;
