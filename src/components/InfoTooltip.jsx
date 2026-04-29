import { useState } from 'react'

export default function InfoTooltip({ text }) {
  const [show, setShow] = useState(false)
  return (
    <span
      className="relative inline-block ml-1"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={() => setShow((s) => !s)}
    >
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-cream/40 text-cream/70 text-[10px] cursor-help">
        i
      </span>
      {show && (
        <span className="absolute z-30 left-5 top-0 w-60 p-3 bg-night border border-red rounded text-xs text-cream/85 leading-relaxed shadow-2xl">
          {text}
        </span>
      )}
    </span>
  )
}
