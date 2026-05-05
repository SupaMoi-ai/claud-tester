import { useState } from 'react'
import { GOLDEN_RULES, PHRASE_BANK, RED_LIST, FAQ } from '../lib/content.js'

function GoldenRules() {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-5">
        <h3 className="display text-2xl sm:text-3xl text-red">The Golden Rules</h3>
        <span className="label text-cream/50">// commandments</span>
      </div>
      <ol className="space-y-3">
        {GOLDEN_RULES.map((rule, i) => (
          <li
            key={i}
            className="flex items-start gap-4 card corner-accents p-4"
          >
            <span className="display text-red text-2xl w-10 shrink-0">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="text-cream/95 leading-relaxed">{rule}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

function PhraseBankSection() {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-5">
        <h3 className="display text-2xl sm:text-3xl text-green">What To Say</h3>
        <span className="label text-cream/50">// phrase bank</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PHRASE_BANK.map((group) => (
          <div key={group.situation} className="card !p-5">
            <div className="display text-cream tracking-wider text-base mb-3">
              {group.situation}
            </div>
            <ul className="space-y-2">
              {group.phrases.map((p, i) => (
                <li key={i} className="text-cream/85 leading-relaxed flex gap-2">
                  <span className="text-green">"</span>
                  <span>{p}</span>
                  <span className="text-green">"</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

function RedListSection() {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-5">
        <h3 className="display text-2xl sm:text-3xl text-red">What Not To Say</h3>
        <span className="label text-cream/50">// red list</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {RED_LIST.map((item) => (
          <div key={item.phrase} className="card !p-5 border-l-4 border-l-red">
            <div className="display text-red text-lg line-through">{item.phrase}</div>
            <p className="text-cream/75 text-sm mt-2 italic">{item.why}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function FAQItem({ item, open, onToggle }) {
  return (
    <div className="card !p-0 overflow-hidden">
      <button
        className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-mid/40 transition-colors"
        onClick={onToggle}
      >
        <span className="display text-cream tracking-wider text-base sm:text-lg">{item.q}</span>
        <span className={`display text-cream/60 text-2xl transition-transform ${open ? 'rotate-45' : ''}`}>+</span>
      </button>
      {open && (
        <div className="border-t border-border p-4 sm:p-5 bg-night/40 text-cream/85 leading-relaxed">
          {item.a}
        </div>
      )}
    </div>
  )
}

function FAQSection() {
  const [openIdx, setOpenIdx] = useState(0)
  return (
    <section>
      <div className="flex items-baseline justify-between mb-5">
        <h3 className="display text-2xl sm:text-3xl text-cream">FAQ</h3>
        <span className="label text-cream/50">// the awkward questions</span>
      </div>
      <div className="space-y-3">
        {FAQ.map((item, i) => (
          <FAQItem
            key={item.q}
            item={item}
            open={openIdx === i}
            onToggle={() => setOpenIdx(openIdx === i ? -1 : i)}
          />
        ))}
      </div>
    </section>
  )
}

export default function TheCode() {
  return (
    <div className="space-y-12 stagger">
      <header>
        <div className="label">// section :: the playbook</div>
        <h2 className="display text-3xl sm:text-5xl text-cream mt-2">THE CODE</h2>
        <p className="text-cream/70 mt-2 max-w-2xl">
          The non-negotiables. The phrases that work. The phrases that don't. And the questions guys are too afraid to ask.
        </p>
      </header>

      <GoldenRules />
      <PhraseBankSection />
      <RedListSection />
      <FAQSection />
    </div>
  )
}
