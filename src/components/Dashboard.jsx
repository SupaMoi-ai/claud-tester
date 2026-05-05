import { useMemo, useState } from 'react'
import {
  PHASE_HERO,
  PHASE_ONE_LINER,
  PHASE_MOOD_HINT,
  PHASE_EMOJI,
  TIPS,
  ALERTS,
} from '../lib/content.js'
import {
  PHASE_LABELS,
  PHASE_COLORS,
  getDaysUntilNextPeriod,
  getPhaseRanges,
  getDayInPhase,
  getCycleInfoForDate,
  formatShortDate,
} from '../lib/cycle.js'
import { pickDailyTip } from '../lib/personalization.js'
import { isAlertDismissed, dismissAlert, saveProfile } from '../lib/storage.js'

const PHASE_GRADIENT = {
  menstrual: 'linear-gradient(135deg, #C8322C 0%, #8B1F1B 100%)',
  follicular: 'linear-gradient(135deg, #3DAA6A 0%, #1F6B40 100%)',
  ovulation: 'linear-gradient(135deg, #E8B84B 0%, #B08A20 100%)',
  luteal: 'linear-gradient(135deg, #7B68B8 0%, #4A3D80 100%)',
}

function QuickStart({ onChange, onGoToProfile }) {
  const [name, setName] = useState('')
  const [lastPeriod, setLastPeriod] = useState('')
  const today = new Date().toISOString().slice(0, 10)

  const submit = (e) => {
    e.preventDefault()
    if (!lastPeriod) return
    const saved = saveProfile({
      name: name.trim(),
      lastPeriod,
      cycleLength: 28,
      relationship: 'girlfriend',
      personality: { type: '', social: '', processing: '', conflictStyle: '' },
      neurology: [],
      comfort: [],
      entertainment: [],
      food: { cravings: [], favorites: '', dietary: '' },
      drinks: [],
      gifts: { types: [], flowers: '', scent: '' },
      loveLanguages: [],
      background: { culture: '', languages: '', familyImportance: '', careerLevel: '', values: [] },
      notes: '',
    })
    onChange(saved)
  }

  return (
    <div className="space-y-6">
      <div
        className="rounded-xl p-6 sm:p-10 corner-accents relative overflow-hidden"
        style={{ background: PHASE_GRADIENT.menstrual, minHeight: '180px' }}
      >
        <div className="label text-cream/80 mb-2">// new playbook</div>
        <h1 className="display text-4xl sm:text-6xl text-cream leading-none">
          START THE CODE.
        </h1>
        <p className="mt-4 text-cream/95 max-w-md">
          Two fields. One minute. The whole app lights up.
        </p>
      </div>

      <form onSubmit={submit} className="card space-y-5">
        <div className="label">// quick start</div>
        <label className="block">
          <span className="label block mb-2">Her name (optional)</span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Maya"
          />
        </label>
        <label className="block">
          <span className="label block mb-2">First day of her last period</span>
          <input
            type="date"
            className="input"
            value={lastPeriod}
            max={today}
            onChange={(e) => setLastPeriod(e.target.value)}
            required
          />
        </label>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button type="submit" className="btn btn-primary" disabled={!lastPeriod}>
            ENTER THE CODE →
          </button>
          <button type="button" className="btn btn-ghost" onClick={onGoToProfile}>
            Or build full profile
          </button>
        </div>
      </form>
    </div>
  )
}

function HeroCard({ phase, cycleDay, cycleLength, name }) {
  if (!phase) return null
  return (
    <div
      className="rounded-xl p-6 sm:p-10 corner-accents relative overflow-hidden"
      style={{ background: PHASE_GRADIENT[phase], minHeight: '220px' }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="label text-cream/80 mb-2">
            // {name ? name.toUpperCase() : 'today'} :: phase
          </div>
          <h1 className="display text-5xl sm:text-7xl text-cream leading-none">
            {PHASE_LABELS[phase]}
          </h1>
          <p className="mt-4 text-cream/95 max-w-md text-base sm:text-lg">
            {PHASE_HERO[phase]}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-5xl sm:text-6xl">{PHASE_EMOJI[phase]}</div>
          <div className="display text-cream text-lg sm:text-xl mt-2">
            DAY {cycleDay} / {cycleLength}
          </div>
        </div>
      </div>
    </div>
  )
}

function HeadsUpAlert({ alert, onDismiss }) {
  if (!alert) return null
  const tones = {
    alert: 'border-alert text-alert',
    red: 'border-red text-red',
    gold: 'border-alert text-alert',
    purple: 'border-phase-luteal text-phase-luteal',
  }
  const tone = tones[alert.tone] || tones.alert
  return (
    <div
      className={`flex items-center gap-4 border-l-4 ${tone} bg-dark p-4 rounded`}
      role="alert"
    >
      <div className="text-2xl">{alert.icon}</div>
      <div className="flex-1">
        <div className="display tracking-wider text-base">{alert.title}</div>
        <div className="text-cream/85 text-sm mt-0.5">{alert.body}</div>
      </div>
      <button
        className="text-cream/60 hover:text-cream text-2xl leading-none px-2"
        onClick={onDismiss}
        aria-label="Dismiss alert"
      >
        ×
      </button>
    </div>
  )
}

function TodaysTip({ tip }) {
  if (!tip) return null
  return (
    <div className="card corner-accents">
      <div className="label mb-3">// today's move</div>
      <p className="text-xl sm:text-2xl text-cream leading-snug font-light">{tip}</p>
    </div>
  )
}

function PhaseProgressBar({ cycleDay, cycleLength, daysUntil }) {
  const ranges = getPhaseRanges(cycleLength)
  const phases = ['menstrual', 'follicular', 'ovulation', 'luteal']
  const pct = ((cycleDay - 1) / cycleLength) * 100

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="label">// cycle progress</div>
        <div className="label">
          {daysUntil === 0
            ? 'PERIOD TODAY'
            : `${daysUntil} ${daysUntil === 1 ? 'DAY' : 'DAYS'} TO PERIOD`}
        </div>
      </div>
      <div className="relative h-3 rounded-full overflow-hidden bg-night flex">
        {phases.map((p) => {
          const [start, end] = ranges[p]
          const widthPct = ((end - start + 1) / cycleLength) * 100
          return (
            <div
              key={p}
              style={{ background: PHASE_COLORS[p], width: `${widthPct}%` }}
              className="h-full"
              title={PHASE_LABELS[p]}
            />
          )
        })}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-cream border-2 border-night"
          style={{ left: `calc(${pct}% - 6px)`, animation: 'pulseDot 1.6s ease-in-out infinite' }}
        />
      </div>
      <div className="flex justify-between mt-2 text-[10px] tracking-widest font-mono text-cream/60">
        <span>MENSTRUAL</span>
        <span>FOLLICULAR</span>
        <span>OVULATION</span>
        <span>LUTEAL</span>
      </div>
    </div>
  )
}

function NextDays({ profile }) {
  if (!profile?.lastPeriod) return null
  const today = new Date()
  const labels = ['Tomorrow', '+ 2', '+ 3', '+ 4']
  const days = []
  for (let i = 1; i <= 4; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    const info = getCycleInfoForDate(profile, d)
    days.push({
      date: d,
      phase: info.phase,
      cycleDay: info.cycleDay,
      label: labels[i - 1],
    })
  }
  return (
    <div className="card">
      <div className="label mb-4">// what's coming</div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {days.map((d) => (
          <div
            key={d.date.toISOString()}
            className="bg-night border border-border rounded p-3"
            style={{ borderLeftColor: PHASE_COLORS[d.phase], borderLeftWidth: '4px' }}
          >
            <div className="label text-cream/60 text-[10px]">{d.label}</div>
            <div className="display text-cream text-base mt-1">
              {formatShortDate(d.date).toUpperCase()}
            </div>
            <div
              className="display text-sm mt-1"
              style={{ color: PHASE_COLORS[d.phase] }}
            >
              {PHASE_MOOD_HINT[d.phase]}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function buildAlert(profile, cycleDay) {
  if (!profile) return null
  const daysUntil = getDaysUntilNextPeriod(profile)
  if (cycleDay === 1) return ALERTS.PERIOD_0
  if (daysUntil === 1) return ALERTS.PERIOD_1
  if (daysUntil === 2) return ALERTS.PERIOD_2
  if (daysUntil === 3) return ALERTS.PERIOD_3
  if (cycleDay === 14) return ALERTS.OVULATION
  if (cycleDay === 18) return ALERTS.LUTEAL
  return null
}

export default function Dashboard({ profile, cycleDay, phase, onGoToProfile, onProfileChange }) {
  const [dismissedTick, setDismissedTick] = useState(0)

  const cycleLength = profile?.cycleLength || 28
  const dayInPhase = getDayInPhase(cycleDay, cycleLength)
  const tip = useMemo(
    () => (profile && phase ? pickDailyTip(phase, profile, dayInPhase, TIPS) : null),
    [phase, profile, dayInPhase],
  )
  const alert = useMemo(
    () => (profile ? buildAlert(profile, cycleDay) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile, cycleDay, dismissedTick],
  )

  if (!profile?.lastPeriod) {
    return (
      <div className="stagger">
        <QuickStart onChange={onProfileChange} onGoToProfile={onGoToProfile} />
      </div>
    )
  }

  const showAlert = alert && !isAlertDismissed(alert.id)
  const daysUntil = getDaysUntilNextPeriod(profile)

  const onDismissAlert = () => {
    if (alert) {
      dismissAlert(alert.id)
      setDismissedTick((t) => t + 1)
    }
  }

  return (
    <div className="space-y-6 stagger">
      <HeroCard phase={phase} cycleDay={cycleDay} cycleLength={cycleLength} name={profile.name} />

      {showAlert && <HeadsUpAlert alert={alert} onDismiss={onDismissAlert} />}

      <TodaysTip tip={tip} />

      <PhaseProgressBar cycleDay={cycleDay} cycleLength={cycleLength} daysUntil={daysUntil} />

      <NextDays profile={profile} />
    </div>
  )
}

void PHASE_ONE_LINER
