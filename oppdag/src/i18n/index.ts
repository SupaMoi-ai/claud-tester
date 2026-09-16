import { nb } from './nb';

/**
 * Localization entry point.
 *
 * The prototype ships Bokmål only, but every string already goes through here,
 * so adding Nynorsk or English is a matter of writing `nn.ts` / `en.ts` with
 * the same shape and registering it below — no component changes.
 */
export type LocaleId = 'nb' | 'nn' | 'en';

/** The canonical shape every locale file must satisfy. */
export type Copy = typeof nb;

const locales: Partial<Record<LocaleId, Copy>> = {
  nb,
  // nn: nn,
  // en: en,
};

export const DEFAULT_LOCALE: LocaleId = 'nb';

export function getCopy(locale: LocaleId = DEFAULT_LOCALE): Copy {
  return locales[locale] ?? nb;
}

/**
 * Components call this instead of importing `nb` directly. When a locale
 * switcher lands it only has to change what this reads from.
 */
export function useCopy(): Copy {
  return getCopy(DEFAULT_LOCALE);
}

/** Deterministic-per-key pick from a list of interchangeable phrasings, so the
 *  same moment does not reshuffle its wording on every re-render. */
export function pickPhrase(list: readonly string[], seed: number): string {
  if (list.length === 0) return '';
  const i = Math.abs(Math.floor(seed)) % list.length;
  return list[i] as string;
}
