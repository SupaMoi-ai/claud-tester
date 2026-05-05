// Phase × trait matrix from the v2.0 spec.
// Each entry is { match: (profile) => bool, line: string }.

const has = (arr, val) => Array.isArray(arr) && arr.includes(val)

const matrix = {
  menstrual: [
    { match: (p) => has(p.neurology, 'adhd'), line: "Keep requests minimal. Don't ask her to make decisions. Reduce visual clutter." },
    { match: (p) => has(p.neurology, 'anxiety'), line: "Extra physical closeness helps. Don't leave her alone if she seems distressed." },
    { match: (p) => p.personality?.social === 'introvert', line: "Don't fill the silence. Presence without pressure." },
    { match: (p) => p.personality?.social === 'extrovert', line: 'She still wants company — just low-energy company.' },
    { match: (p) => has(p.loveLanguages, 'acts-of-service'), line: 'Do the dishes, laundry, dinner. No asking. Just do.' },
    { match: (p) => has(p.loveLanguages, 'words-of-affirmation'), line: "Tell her she's strong. Her body is doing something incredible." },
    { match: (p) => has(p.loveLanguages, 'physical-touch'), line: 'Hold her. Back rubs. Warm presence.' },
    { match: (p) => p.personality?.type === 'a-type', line: "She'll hate feeling unproductive. Normalize rest as productive." },
    { match: (p) => has(p.neurology, 'sensory'), line: 'Lower the lights. Lower the volume. Quiet wins.' },
    { match: (p) => has(p.comfort, 'heat'), line: 'Heating pad on, hot bath ready. Heat is her friend right now.' },
    { match: (p) => has(p.comfort, 'space-alone'), line: 'Give her the space she asked for — without making her feel guilty for it.' },
  ],
  follicular: [
    { match: (p) => p.personality?.social === 'extrovert', line: 'She wants social. Be her hype man and plan something.' },
    { match: (p) => p.personality?.type === 'a-type', line: "She's in optimal mode. Support ambitious plans." },
    { match: (p) => has(p.neurology, 'adhd'), line: 'She may hyperfocus on a new project. Support it, don\'t derail it.' },
    { match: (p) => has(p.loveLanguages, 'quality-time'), line: 'She wants adventures together. Plan it.' },
    { match: (p) => has(p.entertainment, 'fitness'), line: 'Suggest a workout, hike, or class together — energy match.' },
    { match: (p) => has(p.loveLanguages, 'words-of-affirmation'), line: "Tell her you're proud of what she's building. Be specific." },
    { match: (p) => p.personality?.social === 'introvert', line: "Energy is up but she's still introvert — small adventures, not big crowds." },
  ],
  ovulation: [
    { match: (p) => p.personality?.type === 'a-type', line: "This is her peak performance window. Don't slow her down." },
    { match: (p) => has(p.loveLanguages, 'physical-touch'), line: "She's most interested in intimacy now. Match that energy." },
    { match: (p) => has(p.loveLanguages, 'words-of-affirmation'), line: "Tell her she's incredible. She already knows it but she wants to hear it from you." },
    { match: (p) => has(p.neurology, 'adhd'), line: 'Great window for important conversations — she\'s most focused.' },
    { match: (p) => has(p.loveLanguages, 'receiving-gifts'), line: 'Surprise gift hits hardest in this window. Something small, specific to her.' },
    { match: (p) => has(p.loveLanguages, 'quality-time'), line: 'Plan the date night you keep talking about. This is the week.' },
    { match: (p) => has(p.gifts, 'experiences'), line: 'Book the dinner. Get the tickets. Make the moment.' },
  ],
  luteal: [
    { match: (p) => has(p.neurology, 'anxiety'), line: 'Late luteal amplifies anxiety significantly. Be extra steady.' },
    { match: (p) => has(p.neurology, 'depression'), line: 'Most vulnerable window. Watch for mood drops. Be present, not fixated.' },
    { match: (p) => p.personality?.social === 'introvert', line: 'Give her the quiet she needs without making her feel guilty.' },
    { match: (p) => p.personality?.type === 'a-type', line: "Her productivity dips naturally. Normalize this, don't comment on it." },
    { match: (p) => has(p.loveLanguages, 'acts-of-service'), line: 'This is when acts of service matter most. Do everything.' },
    { match: (p) => has(p.neurology, 'adhd'), line: "Routine matters more now. Don't disrupt it." },
    { match: (p) => has(p.neurology, 'autism'), line: 'Predictability is caring. Keep the schedule, keep the cues.' },
    { match: (p) => has(p.neurology, 'sensory'), line: 'Soften everything: light, sound, fabrics, smells. Cozy mode.' },
    { match: (p) => has(p.comfort, 'cuddles') || has(p.comfort, 'held'), line: 'Long hold tonight. No phone. Just presence.' },
    { match: (p) => has(p.comfort, 'verbal-reassurance'), line: '"We are good. I\'m not going anywhere." Say it out loud.' },
  ],
}

export function buildPersonalizedTips(phase, profile) {
  if (!profile || !phase || !matrix[phase]) return []
  return matrix[phase].filter((entry) => {
    try { return entry.match(profile) } catch { return false }
  }).map((entry) => entry.line)
}

// Pick a single best tip for the dashboard, weighted toward personalized lines if available.
export function pickDailyTip(phase, profile, dayInPhase, generalTips) {
  const personalized = buildPersonalizedTips(phase, profile)
  // Use day-of-cycle as a stable seed so the tip doesn't shuffle every render.
  const seed = (profile?.lastPeriod ? new Date(profile.lastPeriod).getDate() : 0) + (dayInPhase || 1)
  if (personalized.length > 0 && (seed % 3) !== 0) {
    return personalized[seed % personalized.length]
  }
  const phaseTips = generalTips?.[phase]
  if (!phaseTips) return null
  const phaseLength = (phaseTips.early?.length || 0) + (phaseTips.late?.length || 0)
  if (phaseLength === 0) return null
  // First half of phase → early tips, second half → late tips.
  const useEarly = (dayInPhase || 1) <= 3
  const list = useEarly ? phaseTips.early : phaseTips.late
  if (!list || list.length === 0) {
    return (phaseTips.early || phaseTips.late || [])[seed % 1] || null
  }
  return list[seed % list.length]
}
