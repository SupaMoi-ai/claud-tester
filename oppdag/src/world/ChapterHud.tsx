import { useNavigate } from 'react-router-dom';

/**
 * The interface over a chapter.
 *
 * Specification section 5.1, and the visual target for "Velkommen til
 * Læreøya": a journal at top left, the task's progress at top centre, pause at
 * top right, and nothing else. The prompt that produced the target spells out
 * the absences — "no health, XP, coins, timer, or joystick in default
 * tap-to-walk mode" — and they matter more than the presences. A child who is
 * counting shells should see how many shells are left, not a score.
 *
 * Progress is drawn as the thing being collected rather than as a number:
 * three shell outlines that fill in. A child who cannot yet read a numeral can
 * still see two empty shells and know what remains.
 */

interface Props {
  /** How many of the task's pieces exist in total. */
  total: number;
  /** How many are done. Outlines fill left to right. */
  done: number;
  /** Where the pause button goes back to. */
  exitTo?: string;
}

function Shell({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      aria-hidden
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    >
      {/* A scallop. The bumped top edge is what makes it read as a shell: a
          plain arc from a base point draws an umbrella instead. */}
      <path
        d="M12 20.4C6.6 20.4 3.2 16.2 3.2 12.2c0-2.4 1.5-3.3 2.6-2.1
           C6.5 7.4 8.8 7.4 9.5 9.6 10.2 7 13.8 7 14.5 9.6c0.7-2.2 3-2.2 3.7
           0.5 1.1-1.2 2.6-0.3 2.6 2.1 0 4-3.4 8.2-8.8 8.2Z"
      />
      <path d="M12 20.1 8.9 10.6" strokeWidth="0.9" />
      <path d="M12 20.1V9.8" strokeWidth="0.9" />
      <path d="M12 20.1 15.1 10.6" strokeWidth="0.9" />
    </svg>
  );
}

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
        className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-xl bg-snow/95 text-ink shadow-soft"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden fill="none"
          stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 5.5A1.5 1.5 0 0 1 4.5 4H10a2 2 0 0 1 2 2v13a1.6 1.6 0 0 0-1.6-1.6H4.5A1.5 1.5 0 0 1 3 16V5.5Z" />
          <path d="M21 5.5A1.5 1.5 0 0 0 19.5 4H14a2 2 0 0 0-2 2v13a1.6 1.6 0 0 1 1.6-1.6h5.9A1.5 1.5 0 0 0 21 16V5.5Z" />
        </svg>
      </button>

      <div
        className="flex items-center gap-2 rounded-full bg-snow/95 px-4 py-2 text-ink shadow-soft"
        role="status"
        aria-label={`${done} av ${total} skjell`}
      >
        {Array.from({ length: total }, (_, i) => (
          <Shell key={i} filled={i < done} />
        ))}
      </div>

      <button
        onClick={() => navigate(exitTo)}
        aria-label="Pause"
        className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-xl bg-snow/95 text-ink shadow-soft"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden fill="currentColor">
          <rect x="6.5" y="4.5" width="3.8" height="15" rx="1.6" />
          <rect x="13.7" y="4.5" width="3.8" height="15" rx="1.6" />
        </svg>
      </button>
    </div>
  );
}
