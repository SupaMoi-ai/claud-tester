/**
 * Pseudonym generation.
 *
 * PURE MODULE.
 *
 * Nobody should ever be shown as "ANON". The brief asks for pseudonymous
 * identity with no real names, and the way to get that without a signup wall is
 * to hand people a usable handle immediately and let them change it later.
 * A generated name also gives a crew roster something to read on day one.
 *
 * The vocabulary is commuter-shaped and faintly underground — it should sound
 * like something a person would pick, not like a serial number.
 */

const FIRST = [
  'NIGHT', 'RUST', 'GREY', 'SALT', 'IRON', 'COLD', 'LATE', 'DARK',
  'WIND', 'RAIN', 'FOG', 'STORM', 'DUSK', 'QUIET', 'SLOW', 'LAST',
];

const SECOND = [
  'OWL', 'GULL', 'RAIL', 'TRACK', 'SIGNAL', 'PLATFORM', 'CARRIAGE',
  'SLEEPER', 'JUNCTION', 'CROSSING', 'TUNNEL', 'SIDING', 'HALT',
  'DIESEL', 'WIRE', 'BELL',
];

/**
 * A handle like "NIGHTOWL_04".
 *
 * Matches the handle_shape constraint in schema.sql: 2-20 characters, letters,
 * digits, underscore and hyphen only.
 */
export function generateHandle(rand = Math.random) {
  const a = FIRST[Math.floor(rand() * FIRST.length)];
  const b = SECOND[Math.floor(rand() * SECOND.length)];
  const n = String(Math.floor(rand() * 100)).padStart(2, '0');
  return `${a}${b}_${n}`.slice(0, 20);
}

/** Same rule the database enforces, so the UI can reject before a round trip. */
export function isValidHandle(handle) {
  return typeof handle === 'string'
    && handle.length >= 2
    && handle.length <= 20
    && /^[A-Za-z0-9_-]+$/.test(handle);
}

/**
 * Clean user input into something acceptable, or null if nothing usable is
 * left. Spaces become underscores rather than being rejected, because typing a
 * space in a name is a reasonable thing to do.
 */
export function normaliseHandle(input) {
  const cleaned = String(input ?? '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9_-]/g, '')
    .slice(0, 20);
  return isValidHandle(cleaned) ? cleaned : null;
}
