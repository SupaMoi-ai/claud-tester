import { useMemo, useState } from 'react'
import {
  PHASE_LABELS,
  PHASE_COLORS,
  PHASE_INITIALS,
  getCycleInfoForDate,
  getNextPeriodDate,
  isSameDay,
} from '../lib/cycle.js'
import { NO_PROFILE_COPY, PHASE_ONE_LINER, PHASE_MOOD_HINT } from '../lib/content.js'

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MONTHS = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
]

function getMonthGrid(viewDate) {
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const first = new Date(year, month, 1)
  const startWeekday = first.getDay() // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells = []
  // Leading blanks
  for (let i = 0; i < startWeekday; i++) {
    const d = new Date(year, month, 1 - (startWeekday - i))
    cells.push({ date: d, inMonth: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), inMonth: true })
  }
  // Trailing to fill 6×7 grid
  while (cells.length < 42) {
    const last = cells[cells.length - 1].date
    const next = new Date(last)
    next.setDate(next.getDate() + 1)
    cells.push({ date: next, inMonth: next.getMonth() === month })
  }
  return cells
}

function tintFor(phase) {
  if (!phase) return 'transparent'
  return PHASE_COLORS[phase] + '14'
}

function DayCell({ cell, profile, today, hovered, setHovered }) {
  const info = getCycleInfoForDate(profile, cell.date)
  const isToday = isSameDay(cell.date, today)
  const phase = info.phase
  const isHover = hovered && isSameDay(hovered, cell.date)

  return (
    <div
      onMouseEnter={() => setHovered(cell.date)}
      onMouseLeave={() => setHovered(null)}
      className={`relative h-16 sm:h-20 p-2 border-r border-b border-border transition-all ${
        cell.inMonth ? '' : 'opacity-25'
      } ${isToday ? 'ring-2 ring-inset ring-cream z-10' : ''}`}
      style={{
        background: tintFor(phase),
        borderLeftColor: PHASE_COLORS[phase] || 'transparent',
        borderLeftWidth: phase ? '3px' : '0',
      }}
    >
      <div className="flex items-start justify-between gap-1">
        <span className={`display text-base sm:text-lg ${isToday ? 'text-cream' : 'text-cream/80'}`}>
          {cell.date.getDate()}
        </span>
        {phase && (
          <span
            className="display text-[9px] w-4 h-4 rounded-full flex items-center justify-center"
            style={{ background: PHASE_COLORS[phase], color: '#0D1117' }}
          >
            {PHASE_INITIALS[phase]}
          </span>
        )}
      </div>
      {isToday && (
        <div className="absolute bottom-1 left-1.5 label text-[8px] text-cream">TODAY</div>
      )}
      {phase === 'menstrual' && info.cycleDay === 1 && (
        <div className="absolute bottom-1 right-1.5 text-[10px]">🩸</div>
      )}
      {phase === 'ovulation' && info.cycleDay === 14 && (
        <div className="absolute bottom-1 right-1.5 text-[10px]">⭐</div>
      )}
      {isHover && cell.inMonth && phase && (
        <div className="absolute z-20 left-1/2 -translate-x-1/2 top-full mt-1 w-56 p-3 bg-night border border-red rounded shadow-2xl text-xs">
          <div className="display text-cream text-sm">
            {cell.date.toLocaleDateString('en-US', {
              weekday: 'long', month: 'short', day: 'numeric',
            })}
          </div>
          <div className="label mt-1" style={{ color: PHASE_COLORS[phase] }}>
            {PHASE_LABELS[phase]} · Day {info.cycleDay}
          </div>
          <div className="text-cream/80 mt-1">Mood: {PHASE_MOOD_HINT[phase]}</div>
          <div className="text-cream/70 mt-1 italic">{PHASE_ONE_LINER[phase]}</div>
        </div>
      )}
    </div>
  )
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-3 justify-center text-xs">
      {Object.entries(PHASE_LABELS).map(([key, label]) => (
        <div key={key} className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-sm"
            style={{ background: PHASE_COLORS[key] }}
          />
          <span className="label text-cream/85">{label}</span>
        </div>
      ))}
    </div>
  )
}

function Upcoming({ profile }) {
  const today = new Date()
  const events = []
  for (let m = 0; m < 3; m++) {
    const future = new Date(today)
    future.setDate(future.getDate() + (m * (profile.cycleLength || 28)))
    const next = getNextPeriodDate(profile, future)
    if (!next) continue
    const days = Math.ceil((next - today) / (1000 * 60 * 60 * 24))
    if (days > 0) events.push({ days, label: 'Period starts', icon: '🩸', date: next })
  }
  // Add ovulation milestones
  for (let m = 0; m < 2; m++) {
    const cycleStart = new Date(profile.lastPeriod)
    cycleStart.setDate(cycleStart.getDate() + m * (profile.cycleLength || 28))
    const ovuDate = new Date(cycleStart)
    ovuDate.setDate(ovuDate.getDate() + 13)
    const days = Math.ceil((ovuDate - today) / (1000 * 60 * 60 * 24))
    if (days >= 0 && days < 60) {
      events.push({ days, label: 'Ovulation window opens', icon: '⭐', date: ovuDate })
    }
  }
  events.sort((a, b) => a.days - b.days)

  return (
    <div className="card">
      <div className="label mb-4">// upcoming</div>
      {events.length === 0 ? (
        <p className="text-cream/60">No upcoming events.</p>
      ) : (
        <ul className="space-y-2">
          {events.slice(0, 6).map((e, i) => (
            <li key={i} className="flex items-center gap-3 text-sm">
              <span className="text-lg">{e.icon}</span>
              <span className="display text-cream w-24">In {e.days} {e.days === 1 ? 'day' : 'days'}</span>
              <span className="text-cream/80">{e.label}</span>
              <span className="ml-auto text-cream/50 text-xs">
                {e.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function Calendar({ profile, onGoToProfile }) {
  const [view, setView] = useState(new Date())
  const [hovered, setHovered] = useState(null)
  const today = new Date()
  const cells = useMemo(() => getMonthGrid(view), [view])

  if (!profile?.lastPeriod) {
    return (
      <div className="card corner-accents max-w-2xl mx-auto text-center py-12 mt-8">
        <div className="label mb-4">// status :: no profile</div>
        <h2 className="display text-3xl text-cream mb-4">{NO_PROFILE_COPY.title}</h2>
        <p className="text-cream/80 mb-6">Build the profile to see her calendar.</p>
        <button className="btn btn-primary mx-auto" onClick={onGoToProfile}>
          {NO_PROFILE_COPY.cta}
        </button>
      </div>
    )
  }

  const goPrev = () => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))
  const goNext = () => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))
  const goToday = () => setView(new Date())

  return (
    <div className="space-y-6 stagger">
      <div className="flex items-center justify-between">
        <h2 className="display text-3xl sm:text-4xl text-cream">
          {MONTHS[view.getMonth()]} <span className="text-red">{view.getFullYear()}</span>
        </h2>
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost" onClick={goPrev}>← Prev</button>
          <button className="btn btn-ghost" onClick={goToday}>Today</button>
          <button className="btn btn-ghost" onClick={goNext}>Next →</button>
        </div>
      </div>

      <div className="card !p-0 overflow-hidden">
        <div className="grid grid-cols-7 bg-mid">
          {WEEKDAYS.map((d) => (
            <div key={d} className="label text-center py-2.5 border-r border-border last:border-r-0">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 border-t border-border">
          {cells.map((cell, i) => (
            <DayCell
              key={i}
              cell={cell}
              profile={profile}
              today={today}
              hovered={hovered}
              setHovered={setHovered}
            />
          ))}
        </div>
      </div>

      <Legend />

      <Upcoming profile={profile} />
    </div>
  )
}
