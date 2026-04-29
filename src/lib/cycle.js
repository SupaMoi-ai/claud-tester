// Cycle math — pure functions. All inputs are date strings (ISO) or Date objects.

const MS_PER_DAY = 1000 * 60 * 60 * 24

export const PHASES = ['menstrual', 'follicular', 'ovulation', 'luteal']

export const PHASE_LABELS = {
  menstrual: 'Menstrual',
  follicular: 'Follicular',
  ovulation: 'Ovulation',
  luteal: 'Luteal',
}

export const PHASE_COLORS = {
  menstrual: '#C8322C',
  follicular: '#3DAA6A',
  ovulation: '#E8B84B',
  luteal: '#7B68B8',
}

export const PHASE_INITIALS = {
  menstrual: 'M',
  follicular: 'F',
  ovulation: 'O',
  luteal: 'L',
}

function toMidnight(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function calculateCycleDay(profile, today = new Date()) {
  if (!profile?.lastPeriod) return null
  const start = toMidnight(profile.lastPeriod)
  const t = toMidnight(today)
  const cycleLength = profile.cycleLength || 28
  const diff = Math.floor((t - start) / MS_PER_DAY)
  if (diff < 0) return null
  return ((diff % cycleLength) + cycleLength) % cycleLength + 1
}

export function calculatePhase(cycleDay, cycleLength = 28) {
  if (!cycleDay) return null
  return getPhaseForDay(cycleDay, cycleLength)
}

export function getPhaseForDay(dayOfCycle, cycleLength = 28) {
  if (!dayOfCycle) return null
  const follicularEnd = Math.floor(cycleLength * 0.46)
  const ovulationEnd = Math.floor(cycleLength * 0.61)
  if (dayOfCycle <= 5) return 'menstrual'
  if (dayOfCycle <= follicularEnd) return 'follicular'
  if (dayOfCycle <= ovulationEnd) return 'ovulation'
  return 'luteal'
}

export function getPhaseRanges(cycleLength = 28) {
  const follicularEnd = Math.floor(cycleLength * 0.46)
  const ovulationEnd = Math.floor(cycleLength * 0.61)
  return {
    menstrual: [1, 5],
    follicular: [6, follicularEnd],
    ovulation: [follicularEnd + 1, ovulationEnd],
    luteal: [ovulationEnd + 1, cycleLength],
  }
}

export function getNextPeriodDate(profile, today = new Date()) {
  if (!profile?.lastPeriod) return null
  const start = toMidnight(profile.lastPeriod)
  const t = toMidnight(today)
  const cycleLength = profile.cycleLength || 28
  const diff = Math.floor((t - start) / MS_PER_DAY)
  const cyclesElapsed = diff < 0 ? 0 : Math.floor(diff / cycleLength) + 1
  return new Date(start.getTime() + cyclesElapsed * cycleLength * MS_PER_DAY)
}

export function getDaysUntilNextPeriod(profile, today = new Date()) {
  const next = getNextPeriodDate(profile, today)
  if (!next) return null
  const t = toMidnight(today)
  return Math.max(0, Math.ceil((next - t) / MS_PER_DAY))
}

// Returns { date: Date, phase, cycleDay } for a given calendar date.
export function getCycleInfoForDate(profile, date) {
  if (!profile?.lastPeriod) return { date, phase: null, cycleDay: null }
  const start = toMidnight(profile.lastPeriod)
  const t = toMidnight(date)
  const cycleLength = profile.cycleLength || 28
  const diff = Math.floor((t - start) / MS_PER_DAY)
  if (diff < 0) return { date, phase: null, cycleDay: null }
  const cycleDay = (diff % cycleLength) + 1
  const phase = getPhaseForDay(cycleDay, cycleLength)
  return { date, phase, cycleDay }
}

// Day-in-phase: how many days into the current phase (1-indexed).
export function getDayInPhase(cycleDay, cycleLength = 28) {
  if (!cycleDay) return null
  const phase = getPhaseForDay(cycleDay, cycleLength)
  const ranges = getPhaseRanges(cycleLength)
  return cycleDay - ranges[phase][0] + 1
}

export function getPhaseLength(phase, cycleLength = 28) {
  const r = getPhaseRanges(cycleLength)[phase]
  return r[1] - r[0] + 1
}

export function formatShortDate(date) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function isSameDay(a, b) {
  return toMidnight(a).getTime() === toMidnight(b).getTime()
}
