import { useState } from 'react'

export default function ProfileSection({ number, title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="card !p-0 overflow-hidden">
      <button
        className="w-full flex items-center justify-between gap-4 p-4 sm:p-5 text-left hover:bg-mid/50 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-4">
          <span className="display text-red text-xl w-8">{String(number).padStart(2, '0')}</span>
          <span className="display text-lg sm:text-xl text-cream tracking-wider">{title}</span>
        </div>
        <span className={`display text-cream/60 text-2xl transition-transform ${open ? 'rotate-45' : ''}`}>
          +
        </span>
      </button>
      {open && (
        <div className="border-t border-border p-4 sm:p-6 bg-night/40">{children}</div>
      )}
    </section>
  )
}
