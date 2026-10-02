/**
 * The five interactive tones.
 *
 * Screens pick a tone, never a colour. That is what keeps the palette coherent
 * and what makes a future re-theme a one-file change.
 */
export type Tone = 'butter' | 'sky' | 'moss' | 'coral' | 'lavender';

interface ToneClasses {
  /** Saturated fill — reserved for the one primary action on a screen. */
  solid: string;
  /** Pale fill for cards, chips and resting states. */
  soft: string;
  /** Border companion to `soft`. */
  ring: string;
  /** Text/icon colour that sits on a soft fill. */
  deep: string;
  /** Raw hex for SVG and framer-motion, where classes don't reach. */
  hex: string;
  softHex: string;
}

export const TONES: Record<Tone, ToneClasses> = {
  butter: {
    solid: 'bg-butter text-ink',
    soft: 'bg-butter-soft',
    ring: 'ring-butter',
    deep: 'text-butter-deep',
    hex: '#FFCF76',
    softHex: '#FFE9BD',
  },
  sky: {
    solid: 'bg-sky text-ink',
    soft: 'bg-sky-soft',
    ring: 'ring-sky',
    deep: 'text-sky-deep',
    hex: '#8CCDEE',
    softHex: '#D8EEFA',
  },
  moss: {
    solid: 'bg-moss text-ink',
    soft: 'bg-moss-soft',
    ring: 'ring-moss',
    deep: 'text-moss-deep',
    hex: '#84CFA6',
    softHex: '#D4EFE0',
  },
  coral: {
    solid: 'bg-coral text-ink',
    soft: 'bg-coral-soft',
    ring: 'ring-coral',
    deep: 'text-coral-deep',
    hex: '#F78A77',
    softHex: '#FCDAD2',
  },
  lavender: {
    solid: 'bg-lavender text-ink',
    soft: 'bg-lavender-soft',
    ring: 'ring-lavender',
    deep: 'text-lavender-deep',
    hex: '#B8A5E4',
    softHex: '#E7DEFA',
  },
};

export const TONE_ORDER: Tone[] = ['butter', 'sky', 'moss', 'coral', 'lavender'];

/** Stable tone for a given id, so the same thing is always the same colour. */
export function toneFor(seed: string): Tone {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return TONE_ORDER[hash % TONE_ORDER.length] as Tone;
}
