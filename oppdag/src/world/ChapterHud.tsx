import { useNavigate } from 'react-router-dom';

/**
 * The interface over a chapter.
 *
 * Specification section 5.1, and the visual target for "Velkommen til
 * Læreøya": a journal at top left, the task's progress at top centre, pause at
 * top right, and nothing else. The prompt behind that target spells out the
 * absences — "no health, XP, coins, timer, or joystick in default tap-to-walk
 * mode" — and they matter more than the presences. A child who is counting
 * shells should see how many shells are left, not a score.
 *
 * Progress is drawn as the thing being collected rather than as a number: a
 * row of shells that fill in. A child who cannot yet read a numeral can still
 * see two empty shells and know what remains.
 *
 * The icons are drawn art, not glyphs. They were hand-built as inline SVG
 * while the sheet was being made, and the first attempt at a scallop — a plain
 * arc rising from a base point — drew a convincing umbrella.
 */

interface Props {
  /** How many of the task's pieces exist in total. */
  total: number;
  /** How many are done. Shells fill left to right. */
  done: number;
  /** Where the pause button goes back to. */
  exitTo?: string;
}

/** Icons live in one place so a re-cut sheet lands everywhere at once. */
const ICON = {
  journal: 'assets/ui/journal.png',
  pause: 'assets/ui/pause.png',
  shellEmpty: 'assets/ui/shell-empty.png',
  shellFull: 'assets/ui/shell-full.png',
  speech: 'assets/ui/speech.png',
  home: 'assets/ui/home.png',
} as const;

export function ChapterHud({ total, done, exitTo = '/kart' }: Props) {
  const navigate = useNavigate();

  return (
    // The world owns the pointer underneath, so the bar itself must not take
    // taps; only the controls opt back in. Same rule that left the Læreøya
    // canvas completely inert for three commits.
    <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4">
      <button
        onClick={() => navigate('/dagbok')}
        aria-label="Dagbok"
        className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-xl bg-snow/95 shadow-soft"
      >
        <img src={ICON.journal} alt="" aria-hidden className="h-7 w-7 object-contain" />
      </button>

      <div
        className="flex items-center gap-2 rounded-full bg-snow/95 px-4 py-2 shadow-soft"
        role="status"
        aria-label={`${done} av ${total} skjell`}
      >
        {Array.from({ length: total }, (_, i) => (
          <img
            key={i}
            src={i < done ? ICON.shellFull : ICON.shellEmpty}
            alt=""
            aria-hidden
            className="h-7 w-7 object-contain"
          />
        ))}
      </div>

      <button
        onClick={() => navigate(exitTo)}
        aria-label="Pause"
        className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-xl bg-snow/95 shadow-soft"
      >
        <img src={ICON.pause} alt="" aria-hidden className="h-6 w-6 object-contain" />
      </button>
    </div>
  );
}
