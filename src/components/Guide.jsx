import { useState } from 'react'
import { PHASE_GUIDE, PHASE_EMOJI, NO_PROFILE_COPY } from '../lib/content.js'
import { PHASE_COLORS, PHASE_LABELS } from '../lib/cycle.js'
import { buildPersonalizedTips } from '../lib/personalization.js'

function PhaseCard({ phaseKey, profile, isCurrent, expanded, onToggle }) {
  const data = PHASE_GUIDE[phaseKey]
  const personalized = buildPersonalizedTips(phaseKey, profile)
  const color = PHASE_COLORS[phaseKey]

  return (
    <article
      className="card !p-0 overflow-hidden corner-accents transition-all"
      style={{ borderColor: expanded ? color : undefined }}
    >
      <button
        onClick={onToggle}
        className="w-full text-left p-5 sm:p-6 flex items-start justify-between gap-4 hover:bg-mid/30 transition-colors"
      >
        <div>
          <div className="label flex items-center gap-3">
            <span style={{ color }}>// phase</span>
            {isCurrent && (
              <span
                className="px-2 py-0.5 rounded-full text-[10px] tracking-widest"
                style={{ background: color, color: '#0D1117' }}
              >
                CURRENT
              </span>
            )}
          </div>
          <h3 className="display text-3xl sm:text-4xl mt-2" style={{ color }}>
            {data.name}
          </h3>
          <div className="label text-cream/60 mt-1">{data.days}</div>
        </div>
        <div className="text-4xl">{PHASE_EMOJI[phaseKey]}</div>
      </button>

      {expanded && (
        <div className="border-t border-border p-5 sm:p-6 space-y-5">
          <Block label="// what's happening in her body">
            <p className="text-cream/85 leading-relaxed">{data.biology}</p>
          </Block>

          {profile && (
            <Block label="// for her" color={color}>
              {personalized.length === 0 ? (
                <p className="text-cream/70 italic">
                  Fill in more of her profile to unlock personalized cues.
                </p>
              ) : (
                <ul className="space-y-2">
                  {personalized.map((line, i) => (
                    <li key={i} className="flex gap-3">
                      <span style={{ color }}>▸</span>
                      <span className="text-cream/90">{line}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Block>
          )}

          <Block label="// the code says" color="#3DAA6A">
            <ul className="space-y-2">
              {data.codeSays.map((line, i) => (
                <li key={i} className="flex gap-3 text-cream/90">
                  <span className="text-green">✓</span>
                  <span>"{line}"</span>
                </li>
              ))}
            </ul>
          </Block>

          <Block label="// never say" color="#C8322C">
            <ul className="space-y-2">
              {data.neverSay.map((line, i) => (
                <li key={i} className="flex gap-3 text-cream/90">
                  <span className="text-red">✕</span>
                  <span className="line-through opacity-80">"{line}"</span>
                </li>
              ))}
            </ul>
          </Block>

          <div className="bg-mid border-l-4 p-4 rounded-r" style={{ borderColor: color }}>
            <div className="label mb-2" style={{ color }}>// pro tip</div>
            <p className="text-cream/95 leading-relaxed">{data.proTip}</p>
          </div>
        </div>
      )}
    </article>
  )
}

function Block({ label, color, children }) {
  return (
    <div>
      <div className="label mb-3" style={color ? { color } : undefined}>{label}</div>
      {children}
    </div>
  )
}

function NoProfileState({ onGoToProfile }) {
  return (
    <div className="card corner-accents max-w-2xl mx-auto text-center py-12 mt-8">
      <div className="label mb-4">// status :: no profile</div>
      <h2 className="display text-3xl sm:text-4xl text-cream mb-6">
        {NO_PROFILE_COPY.title}
      </h2>
      <p className="text-cream/80 mb-3">{NO_PROFILE_COPY.body}</p>
      <ul className="text-cream/80 mb-6 space-y-1">
        {NO_PROFILE_COPY.bullets.map((b) => (
          <li key={b}>• {b}</li>
        ))}
      </ul>
      <p className="display text-red text-lg mb-8">{NO_PROFILE_COPY.outro}</p>
      <button className="btn btn-primary mx-auto" onClick={onGoToProfile}>
        {NO_PROFILE_COPY.cta}
      </button>
    </div>
  )
}

export default function Guide({ profile, currentPhase, onGoToProfile }) {
  const [expanded, setExpanded] = useState(currentPhase || 'menstrual')

  if (!profile?.lastPeriod) {
    return <NoProfileState onGoToProfile={onGoToProfile} />
  }

  const phases = ['menstrual', 'follicular', 'ovulation', 'luteal']

  return (
    <div className="space-y-6 stagger">
      <header>
        <div className="label">// section :: the guide</div>
        <h2 className="display text-3xl sm:text-5xl text-cream mt-2">THE GUIDE</h2>
        <p className="text-cream/70 mt-2 max-w-2xl">
          Phase-by-phase. Personalized to her profile. The code that turns information into action.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {phases.map((p) => (
          <PhaseCard
            key={p}
            phaseKey={p}
            profile={profile}
            isCurrent={p === currentPhase}
            expanded={expanded === p}
            onToggle={() => setExpanded(expanded === p ? null : p)}
          />
        ))}
      </div>
    </div>
  )
}

void PHASE_LABELS
