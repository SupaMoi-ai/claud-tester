// All static copy lives here. Sourced verbatim from the v2.0 spec.

export const PHASE_HERO = {
  menstrual: "She's in recovery mode. Be the one who shows up.",
  follicular: 'Energy is rising. Match it, support it, enjoy it.',
  ovulation: 'Peak power. Peak you. This is the superpower window.',
  luteal: "She's reading everything. Be someone worth reading.",
}

export const PHASE_ONE_LINER = {
  menstrual: 'Recovery mode. Show up without being asked.',
  follicular: "She's building. Match her momentum.",
  ovulation: "Peak everything. Don't waste this window.",
  luteal: 'She sees everything. Be worth seeing.',
}

export const PHASE_MOOD_HINT = {
  menstrual: 'Tired',
  follicular: 'Rising',
  ovulation: 'Peak',
  luteal: 'Introspective',
}

export const PHASE_EMOJI = {
  menstrual: '🩸',
  follicular: '🌱',
  ovulation: '⭐',
  luteal: '🌙',
}

export const TIPS = {
  menstrual: {
    early: [
      "Go get her favorite snacks right now. Don't ask, just do it.",
      'Run her a hot bath tonight. Have towels ready.',
      "Take over dinner. Completely. Don't ask what she wants.",
      "Top up the heating pad. Make sure ibuprofen is within reach.",
      'Cancel anything optional this week. Make space for rest.',
    ],
    late: [
      "She's coming out of the heavy days. Plan something small to look forward to.",
      "Check in tonight. 'How are you feeling?' and actually listen.",
      'Energy is returning. Suggest a low-key walk together.',
      'Make her the meal she always asks for.',
    ],
  },
  follicular: {
    early: [
      "Energy is climbing. Suggest something fun for the weekend.",
      'Plan a date — pick the place, pick the time, just tell her.',
      "She's open to new things this week. Suggest one.",
    ],
    late: [
      "Match her momentum. If she's planning, plan with her.",
      'Hype her up about the project she keeps mentioning.',
      "Cook together tonight. It's the energy match she wants.",
    ],
  },
  ovulation: {
    early: [
      "Tell her she's stunning today. Mean it.",
      'Initiate intimacy. She wants to be desired right now.',
      "Big conversations land easy this week. Have the one you've been avoiding.",
    ],
    late: [
      'Peak window. Plan the dinner you keep saying you will.',
      "She's confident — back her loudly in front of others.",
      "Capture this energy. Photo, memory, moment. She'll appreciate it later.",
    ],
  },
  luteal: {
    early: [
      'Cozy mode starts. Less plans, more presence.',
      'Order in tonight. Pick the comfort food. Surprise her.',
      'Notice the small stuff. Compliment something specific.',
    ],
    late: [
      "Late luteal. She's reading everything you do. Be steady.",
      "No big discussions. No big surprises. Just presence.",
      "Get the supplies ready. Period is close. Don't make her ask.",
      "Tonight: blanket, her show, no phone. Just be there.",
    ],
  },
}

export const ALERTS = {
  PERIOD_3: {
    id: 'p-3',
    tone: 'alert',
    title: 'PERIOD IN 3 DAYS',
    body: 'Stock up on supplies. Plan something cozy.',
    icon: '🚨',
  },
  PERIOD_2: {
    id: 'p-2',
    tone: 'alert',
    title: 'PERIOD IN 2 DAYS',
    body: 'Get ibuprofen, heating pad, her favorites.',
    icon: '🚨',
  },
  PERIOD_1: {
    id: 'p-1',
    tone: 'red',
    title: 'PERIOD TOMORROW',
    body: 'Be extra patient. No big discussions tonight.',
    icon: '🚨',
  },
  PERIOD_0: {
    id: 'p-0',
    tone: 'red',
    title: 'TODAY IS DAY 1',
    body: 'She needs you. Go check on her.',
    icon: '🩸',
  },
  OVULATION: {
    id: 'ovu',
    tone: 'gold',
    title: 'OVULATION WINDOW OPENS',
    body: "She's at her peak. Match that energy.",
    icon: '⭐',
  },
  LUTEAL: {
    id: 'lut',
    tone: 'purple',
    title: 'LUTEAL STARTS',
    body: 'Cozy mode. Less plans, more presence.',
    icon: '🌙',
  },
}

export const GOLDEN_RULES = [
  'Never say "Are you on your period?" as an explanation for anything.',
  'Her pain is real. Always. Full stop.',
  'Acts of service speak louder than words during hard days.',
  'Validation before solutions. Always.',
  'Track the cycle. Know it before she has to tell you.',
  'Food in the house = love language. Learn her favorites.',
  'Never compare phases: "You were fine last week." Dead wrong.',
  'Silence is sometimes the best answer. Learn when.',
  'Plan ahead. Knowing her cycle is your secret weapon.',
  "She doesn't need you to fix it. She needs you to show up.",
]

export const PHRASE_BANK = [
  {
    situation: "She's in pain",
    phrases: [
      "I'm so sorry. What can I do right now?",
      "Let me get the heating pad. Stay there.",
      "I'm not going anywhere. Tell me what helps.",
    ],
  },
  {
    situation: "She's crying",
    phrases: [
      "Come here. I've got you.",
      "You don't have to explain anything.",
      "I'm not going anywhere.",
    ],
  },
  {
    situation: "She's irritable",
    phrases: [
      "I hear you. That sounds frustrating.",
      "What do you need from me right now?",
      "Take your time. I'll be here.",
    ],
  },
  {
    situation: 'She wants space',
    phrases: [
      "I'm here when you're ready.",
      "Take whatever time you need.",
      "I'll handle dinner. Don't worry about anything.",
    ],
  },
  {
    situation: 'She wants to talk',
    phrases: [
      "I'm listening. Tell me everything.",
      "That makes sense. What else?",
      "I get why you'd feel that way.",
    ],
  },
  {
    situation: "She's doubting herself",
    phrases: [
      "I've watched you do harder things than this.",
      "You're not wrong about this. I see it too.",
      "You've got this. And I've got you.",
    ],
  },
  {
    situation: 'She needs validation',
    phrases: [
      "You're not crazy. That was unfair.",
      "Your feelings make complete sense.",
      "I would have felt the same way.",
    ],
  },
  {
    situation: "She's at peak energy",
    phrases: [
      "You're glowing today. I noticed.",
      "Tell me what you're working on. I want to hear it.",
      "Whatever you want to do tonight — I'm in.",
    ],
  },
]

export const RED_LIST = [
  {
    phrase: 'Calm down',
    why: "It signals you don't think her feelings are valid.",
  },
  {
    phrase: "You're overreacting",
    why: 'Her feelings are real, even if intense.',
  },
  {
    phrase: 'Is this PMS?',
    why: 'Reduces her emotions to biology, dismisses the real issue.',
  },
  {
    phrase: 'Just relax',
    why: "She's not choosing to feel this way.",
  },
  {
    phrase: "Other women don't make this big a deal",
    why: 'Never compare her to other women.',
  },
  {
    phrase: "I can't say anything right",
    why: 'This makes it about you.',
  },
]

export const FAQ = [
  {
    q: 'Is PMS real?',
    a: "Yes — it's documented in medical literature, with 3–8% of women experiencing PMDD (a more severe form). Hormonal changes in the luteal phase have measurable effects on mood, energy, pain tolerance, and cognition.",
  },
  {
    q: 'Should we have sex during her period?',
    a: "Up to you both. Some women experience increased desire during menstruation; others want zero touch. Communicate. Read her cues. Don't assume either way.",
  },
  {
    q: "What if she says the cycle doesn't affect her?",
    a: 'Believe her. Cycles affect women differently. Some feel almost no change; some feel everything. Either way, knowing the cycle and being kind never hurts.',
  },
  {
    q: 'What if she gets angry at me?',
    a: "Validate first, fix second. Don't blame the cycle — that's dismissive. Address what she actually said. Then, if needed, follow up about the dynamic later, calmly.",
  },
  {
    q: 'Should I ever mention her cycle?',
    a: 'Rarely, carefully — and never as a dismissal. Saying "I know this week is harder, I\'ve got you" is care. Saying "Are you on your period?" is the opposite.',
  },
  {
    q: "What's the difference between PMS and PMDD?",
    a: 'PMS = mild-to-moderate pre-period symptoms. PMDD = severe, life-disrupting symptoms (deep depression, rage, intense anxiety) that need medical support. If her late luteal looks like a different person, support her in talking to a doctor.',
  },
  {
    q: 'How do I bring this up without being weird?',
    a: '"I want to understand you better — and your cycle is part of that. I built/got this thing to help me show up better." Most partners receive that as care, not surveillance.',
  },
]

export const NEUROLOGY_INFO = {
  adhd: {
    label: 'ADHD',
    info: 'Cycle phases amplify ADHD symptoms significantly. Structure and low-stimulation environments help.',
  },
  anxiety: {
    label: 'Anxiety',
    info: 'Luteal phase can spike anxiety. Extra calm and reassurance needed.',
  },
  depression: {
    label: 'Depression / Mood',
    info: 'Hormone dips in late luteal can deepen depressive episodes.',
  },
  autism: {
    label: 'Autism / Neurodivergent',
    info: 'Sensory and routine changes hit harder. Predictability is caring.',
  },
  sensory: {
    label: 'Sensory Sensitivity',
    info: 'Noise, light, smell all matter more during menstruation.',
  },
}

export const PHASE_GUIDE = {
  menstrual: {
    name: 'Menstrual',
    days: 'Days 1–5',
    biology:
      'Estrogen and progesterone are at their lowest. The uterine lining is shedding. Energy is down, pain is up, sleep is broken. Her body is doing real, measurable work.',
    codeSays: [
      "I'm taking care of dinner. Don't lift a finger.",
      "What sounds good? Snack run, food, anything.",
      "You don't owe anyone productivity this week.",
    ],
    neverSay: [
      "Aren't you done with that yet?",
      'You were fine yesterday.',
      "It can't be that bad.",
    ],
    proTip:
      "The first 48 hours are the hardest. Cancel optional plans, lower the lights, take everything off her plate. This is the show-up week.",
  },
  follicular: {
    name: 'Follicular',
    days: 'Days 6–13',
    biology:
      'Estrogen is climbing. Energy returns. Mood lifts. Cognition sharpens. She wants new things, social connection, motion. This is her building phase.',
    codeSays: [
      "What's the plan this weekend? I'm in.",
      "You're on fire lately. I see it.",
      "Want to try something new tonight?",
    ],
    neverSay: [
      "Why are you suddenly so busy?",
      "Calm down with all the plans.",
      "You're being too much.",
    ],
    proTip:
      'Plan adventures now. Book the trip. Start the project together. The momentum here is real and finite — use it.',
  },
  ovulation: {
    name: 'Ovulation',
    days: 'Days 14–17',
    biology:
      'Estrogen peaks. Testosterone spikes. She is at maximum cognitive performance, social confidence, and libido. This is her sharpest, boldest, most magnetic window.',
    codeSays: [
      "You look incredible.",
      "Whatever you want to do — yes.",
      "Tell me about the thing you're working on.",
    ],
    neverSay: [
      "You're full of yourself today.",
      "Why are you so flirty?",
      "Slow down a bit.",
    ],
    proTip:
      "Have the important conversation now — about money, the future, the hard thing. She's most clear-headed and confident here. Don't waste it.",
  },
  luteal: {
    name: 'Luteal',
    days: 'Days 18–28',
    biology:
      'Progesterone rises then crashes. Sensitivity to noise, smell, social slights goes up. Patience for nonsense goes down. Her bullshit detector is at peak. Be honest, be steady, be present.',
    codeSays: [
      "I noticed you handled that today. That was strong.",
      "Tonight is whatever you want it to be.",
      "I'm not going anywhere. We're good.",
    ],
    neverSay: [
      "Why are you so emotional?",
      "It's just the cycle, right?",
      "Can you let it go?",
    ],
    proTip:
      "Late luteal = no big discussions. Postpone any conflict that can wait. She's not less reasonable here — she's reading the truth more clearly than usual. Make sure what you're doing matches what you're saying.",
  },
}

export const WELCOME_COPY = `WELCOME TO BRO CODE.

This app exists because the guys who show up for their partners don't do it by accident.
They learn. They track. They adjust.

This is your playbook. Know the code.`

export const NO_PROFILE_COPY = {
  title: "YOU HAVEN'T BUILT HER PROFILE YET.",
  body:
    "The guide works without it — but it won't know:",
  bullets: [
    'Her favorite comfort foods',
    'Whether she needs space or closeness',
    'How her ADHD affects her cycle',
    'What gestures actually hit',
  ],
  outro: 'Build the profile. Get the real code.',
  cta: 'BUILD HER PROFILE →',
}
