import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * The island, seen whole.
 *
 * Specification section 5.5. This is a navigational overview, not the playable
 * camera: the five places are painted, and the child taps the one that is open.
 *
 * Section 9.1 is strict about what the first release shows here — "a single
 * active visited marker with the rest of the island as quiet scenery", and
 * explicitly "no fake 'coming soon' clickable gates". So the meadow, the
 * forest, the village and the hilltop carry no marker at all. They are drawn,
 * they are visibly there, and nothing invites a tap that would do nothing.
 * A place earns its marker by opening, not by existing.
 */

/**
 * Where each place sits on the overview, as a fraction of the artwork, so the
 * markers follow the painting at any size rather than at one.
 */
const PLACES = {
  brygga: { x: 0.235, y: 0.7, label: 'Brygga', route: '/brygga', open: true },
  blomsterenga: { x: 0.45, y: 0.5, label: 'Blomsterenga', route: null, open: false },
  sporlia: { x: 0.8, y: 0.4, label: 'Sporlia', route: null, open: false },
  lillevik: { x: 0.29, y: 0.26, label: 'Lillevik', route: null, open: false },
  utsikten: { x: 0.63, y: 0.1, label: 'Utsikten', route: null, open: false },
} as const;

export function Kart() {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const open = Object.values(PLACES).filter((p) => p.open);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-cream">
      <div
        className="relative overflow-hidden"
        style={{ aspectRatio: '941 / 1672', maxHeight: '100dvh', maxWidth: '100vw' }}
      >
        <img
          src="assets/worlds/laereoya/island-overview.webp"
          alt="Læreøya sett ovenfra"
          className="block h-full w-full object-contain"
          draggable={false}
        />

        {open.map((place) => (
          <button
            key={place.label}
            onClick={() => place.route && navigate(place.route)}
            // Label above the dot: below it, the name sits on top of the very
            // landmark the marker is pointing at.
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col-reverse items-center gap-1"
            style={{ left: `${place.x * 100}%`, top: `${place.y * 100}%` }}
            aria-label={place.label}
          >
            <span className="relative flex h-12 w-12 items-center justify-center">
              {/* A slow ring, not a blink: an invitation rather than an alarm. */}
              {!reduced && (
                <motion.span
                  className="absolute inset-0 rounded-full bg-snow"
                  initial={{ opacity: 0.45, scale: 0.85 }}
                  animate={{ opacity: [0.45, 0.12, 0.45], scale: [0.85, 1.25, 0.85] }}
                  transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
              <span className="relative h-5 w-5 rounded-full border-2 border-ink/70 bg-snow shadow-soft" />
            </span>
            <span className="rounded-full bg-snow/90 px-3 py-1 font-display text-label font-semibold text-ink shadow-soft">
              {place.label}
            </span>
          </button>
        ))}

        {/* The map is home now, so it has the two ways out every home has:
         * the journal, and back to the title. Same icons and buttons as the
         * chapter HUD, so they read as the same controls everywhere. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4">
          <button
            onClick={() => navigate('/dagbok')}
            aria-label="Dagbok"
            className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-xl bg-snow/95 shadow-soft"
          >
            <img src="assets/ui/journal.png" alt="" aria-hidden className="h-7 w-7 object-contain" />
          </button>
          <button
            onClick={() => navigate('/')}
            aria-label="Til start"
            className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-xl bg-snow/95 shadow-soft"
          >
            <img src="assets/ui/home.png" alt="" aria-hidden className="h-7 w-7 object-contain" />
          </button>
        </div>
      </div>
    </div>
  );
}
