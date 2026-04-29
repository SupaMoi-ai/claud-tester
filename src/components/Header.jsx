import { useState } from 'react'

export default function Header({ tabs, active, onChange }) {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 bg-night/90 backdrop-blur border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        <button
          onClick={() => onChange('dashboard')}
          className="flex items-center gap-3 group"
          aria-label="BRO CODE home"
        >
          <span className="w-9 h-9 rounded bg-red flex items-center justify-center display text-cream text-lg leading-none">
            BC
          </span>
          <span className="display text-xl sm:text-2xl tracking-wider group-hover:text-red transition-colors">
            BRO CODE
          </span>
          <span className="hidden md:inline-block label opacity-50 ml-2">
            // The Playbook
          </span>
        </button>

        <nav className="hidden md:flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={
                'px-3 py-2 rounded display text-sm tracking-wider transition-all ' +
                (active === tab.id
                  ? 'text-red border-b-2 border-red'
                  : 'text-cream/70 hover:text-cream')
              }
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <button
          className="md:hidden p-2 border border-border rounded"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          <span className="block w-6 h-0.5 bg-cream mb-1.5" />
          <span className="block w-6 h-0.5 bg-cream mb-1.5" />
          <span className="block w-6 h-0.5 bg-cream" />
        </button>
      </div>

      {open && (
        <nav className="md:hidden border-t border-border bg-dark">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                onChange(tab.id)
                setOpen(false)
              }}
              className={
                'block w-full text-left px-6 py-4 display tracking-wider border-b border-border transition-colors ' +
                (active === tab.id ? 'text-red bg-mid' : 'text-cream hover:bg-mid')
              }
            >
              {tab.label}
            </button>
          ))}
        </nav>
      )}
    </header>
  )
}
