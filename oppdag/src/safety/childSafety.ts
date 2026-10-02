/**
 * Child-safety layer.
 *
 * This prototype makes no network calls and contains no generated text, so
 * nothing today strictly needs sanitising. It exists anyway, and is wired into
 * the one place free text can enter the app (the child's own spoken/typed
 * reflection), because the architecture decision matters more than the current
 * surface: **when an AI or any third-party string is introduced later, it must
 * pass through `sanitizeForChild` before it can reach a child-facing component.**
 *
 * Product rules this file encodes, per the product's safety stance:
 *   - no advertisements, no purchases
 *   - no public profiles, no child-to-stranger messaging
 *   - no external links reachable from a child screen
 *   - minimal personal data, stored only on this device
 *   - no infinite feed, no streak punishment, no gambling-style rewards
 */

/** Anything that could turn into a tap-out of the app or a contact channel. */
const URL_LIKE = /\b(?:https?:\/\/|www\.)\S+/gi;
const EMAIL_LIKE = /\b[\w.+-]+@[\w-]+\.[\w.]{2,}\b/gi;
/** Norwegian and international-looking phone numbers. */
const PHONE_LIKE = /(?:\+?\d[\d\s-]{6,}\d)/g;

/**
 * Words that should never appear on a child's screen. Deliberately short and
 * conservative — an over-eager filter that mangles innocent Norwegian is worse
 * than a narrow one, because this sits in front of a *child's own words*.
 */
const BLOCKED = [
  'faen', 'helvete', 'jævla', 'jævlig', 'fitte', 'kuk', 'dritt',
  'fuck', 'shit', 'bitch',
];

/** Hard cap so nothing can flood a speech bubble. */
const MAX_LENGTH = 400;

export interface SanitizeResult {
  text: string;
  /** True when anything was removed — callers may want to soften the UI. */
  changed: boolean;
}

const FALLBACK = 'Det der fikk jeg ikke helt med meg. Vil du prøve igjen?';

export function sanitizeForChild(input: string): SanitizeResult {
  const original = input ?? '';
  let text = original;

  text = text.replace(URL_LIKE, '').replace(EMAIL_LIKE, '').replace(PHONE_LIKE, '');

  for (const word of BLOCKED) {
    text = text.replace(new RegExp(`\\b${word}\\w*\\b`, 'gi'), '…');
  }

  text = text.replace(/\s+/g, ' ').trim();

  if (text.length > MAX_LENGTH) {
    text = `${text.slice(0, MAX_LENGTH).trimEnd()}…`;
  }

  if (text.length === 0) {
    return { text: FALLBACK, changed: true };
  }

  return { text, changed: text !== original.trim() };
}

/**
 * Guard for any future AI response. Returns `null` when the content cannot be
 * made safe, so the caller is forced to handle the refusal path rather than
 * rendering a half-filtered string.
 */
export function guardGeneratedText(input: string): string | null {
  const { text } = sanitizeForChild(input);
  return text === FALLBACK ? null : text;
}

/** The only personal data the product stores, documented in one place. */
export const STORED_PERSONAL_DATA = [
  'fornavn (kun fornavn, valgfritt)',
  'alder og trinn',
  'valgte interesser',
  'framgang i eventyr og tegninger',
] as const;
