import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * The tone rules are a product feature, so they get a test rather than a
 * style guide nobody reads.
 *
 * Comments are stripped before scanning: the file's own header names the
 * banned words in order to forbid them, and that is not the app talking.
 */

const COPY_PATH = fileURLToPath(new URL('../copy.ts', import.meta.url));

const source = readFileSync(COPY_PATH, 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

/** Matched on word boundaries, so "later" never trips the ban on "late". */
const BANNED_WORDS = [
  'overdue',
  'failed',
  'failing',
  'behind',
  'streak',
  'streaks',
  'late',
  'missed',
  'lazy',
  'slacking',
  'excuses',
];

/** Matched as written. Pressure, cheerleading, and causal hormone claims. */
const BANNED_PHRASES = [
  'you should',
  'you must',
  'you need to',
  'you got this',
  'keep it up',
  'well done',
  'good job',
  'nice work',
  'crush it',
  'amazing',
  'awesome',
  'congrat',
  'proud of you',
  'because of your hormones',
  'hormones cause',
  'your hormones make',
  'due to your cycle',
  'caused by your cycle',
  'your period is making',
  'estrogen makes',
  'progesterone makes',
  'your cycle is why',
];

describe('copy', () => {
  it('uses no guilt or pressure words', () => {
    const found = BANNED_WORDS.filter((word) =>
      new RegExp(`\\b${word}\\b`, 'i').test(source),
    );
    expect(found).toEqual([]);
  });

  it('uses no cheerleading or causal hormone claims', () => {
    const lower = source.toLowerCase();
    const found = BANNED_PHRASES.filter((phrase) => lower.includes(phrase));
    expect(found).toEqual([]);
  });

  it('has no exclamation marks', () => {
    expect(source.includes('!')).toBe(false);
  });

  it('carries the one disclaimer line verbatim', () => {
    expect(source).toContain('Personal observations, not medical advice.');
  });

  it('calls postponed items moved', () => {
    expect(source).toContain('Moved');
  });
});
