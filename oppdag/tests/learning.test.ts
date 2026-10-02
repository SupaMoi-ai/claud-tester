/**
 * Unit tests for the learning model and the concept graph.
 *
 * Plain node:test — no framework to install, and the modules under test are
 * pure by design so nothing needs mocking. Run with `npm test`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyOutcome,
  emptyMastery,
  stateFor,
  withDecay,
} from '../src/learning/masteryEngine.ts';
import {
  emptyMomentum,
  hasMoreSupport,
  nextSupport,
  pickDifficulty,
  pushMomentum,
  wasEffortless,
} from '../src/learning/adaptive.ts';
import { validateGraph, conceptDepth, prerequisitesOf } from '../src/learning/selectors.ts';
import { CONCEPTS } from '../src/data/concepts.ts';
import { ADVENTURES } from '../src/data/adventures/index.ts';
import { sanitizeForChild } from '../src/safety/childSafety.ts';

const outcome = (over: Partial<Parameters<typeof applyOutcome>[1]> = {}) => ({
  conceptId: 'tall-1-20',
  correct: true,
  attempts: 1,
  support: 'none' as const,
  difficulty: 'base' as const,
  at: Date.now(),
  ...over,
});

/* -------------------------------------------------------------- mastery */

test('a clean first-try answer moves a new concept off zero', () => {
  const after = applyOutcome(emptyMastery('c', 'tall-1-20'), outcome());
  assert.ok(after.confidence > 0);
  assert.equal(after.attempts, 1);
  assert.equal(after.successes, 1);
  assert.notEqual(after.state, 'new');
});

test('help reduces the confidence gained, in ladder order', () => {
  const base = emptyMastery('c', 'tall-1-20');
  const none = applyOutcome(base, outcome({ support: 'none' })).confidence;
  const hint = applyOutcome(base, outcome({ support: 'hint' })).confidence;
  const visual = applyOutcome(base, outcome({ support: 'visual' })).confidence;
  const guided = applyOutcome(base, outcome({ support: 'guided' })).confidence;

  assert.ok(none > hint, 'unaided beats hinted');
  assert.ok(hint > visual, 'hinted beats visual');
  assert.ok(visual > guided, 'visual beats guided');
  assert.ok(guided > 0, 'even a guided solution earns something');
});

test('a wrong answer nudges down but never below zero', () => {
  const fresh = applyOutcome(emptyMastery('c', 'tall-1-20'), outcome({ correct: false }));
  assert.equal(fresh.confidence, 0, 'floors at zero rather than going negative');
  assert.equal(fresh.successes, 0);
  assert.equal(fresh.attempts, 1, 'the attempt still counts');
});

test('harder variants are worth more than easier ones', () => {
  const base = emptyMastery('c', 'tall-1-20');
  const easy = applyOutcome(base, outcome({ difficulty: 'easy' })).confidence;
  const hard = applyOutcome(base, outcome({ difficulty: 'hard' })).confidence;
  assert.ok(hard > easy);
});

test('expressive stages count as engagement, never as a score', () => {
  const base = emptyMastery('c', 'leveomraader');
  const drew = applyOutcome(base, outcome({ conceptId: 'leveomraader', expressive: true }));
  const solved = applyOutcome(base, outcome({ conceptId: 'leveomraader' }));
  assert.ok(drew.confidence > 0, 'drawing moves the needle');
  assert.ok(drew.confidence < solved.confidence, 'but less than solving a task');
});

test('"secure" needs evidence, not one lucky tap', () => {
  assert.equal(stateFor(0.95, 1), 'developing', 'high confidence, too few attempts');
  assert.equal(stateFor(0.95, 3), 'secure');
  assert.equal(stateFor(0.4, 5), 'developing');
  assert.equal(stateFor(0.1, 5), 'exploring');
  assert.equal(stateFor(0, 0), 'new');
});

test('confidence decays after a grace period, not before', () => {
  const day = 86_400_000;
  const now = Date.now();
  const m = { ...emptyMastery('c', 'tall-1-20'), confidence: 0.8, attempts: 4, lastSeen: now };

  assert.equal(withDecay(m, now + 3 * day).confidence, 0.8, 'no decay inside the grace period');
  assert.ok(withDecay(m, now + 40 * day).confidence < 0.8, 'decays once left alone');
  assert.ok(withDecay(m, now + 4000 * day).confidence >= 0, 'never goes negative');
});

test('reaching "secure" takes a realistic run of good answers', () => {
  let m = emptyMastery('c', 'tall-1-20');
  for (let i = 0; i < 4; i += 1) m = applyOutcome(m, outcome({ at: Date.now() }));
  assert.equal(m.state, 'secure');
});

/* ------------------------------------------------------------- adaptive */

test('the support ladder climbs once and then stops', () => {
  assert.equal(nextSupport('none'), 'hint');
  assert.equal(nextSupport('hint'), 'visual');
  assert.equal(nextSupport('visual'), 'guided');
  assert.equal(nextSupport('guided'), 'guided', 'guided is the last rung');
  assert.equal(hasMoreSupport('guided'), false);
  assert.equal(hasMoreSupport('none'), true);
});

test('difficulty escalates after two effortless answers and backs off after two struggles', () => {
  let up = emptyMomentum();
  up = pushMomentum(up, true);
  up = pushMomentum(up, true);
  assert.equal(pickDifficulty(up, undefined), 'hard');

  let down = emptyMomentum();
  down = pushMomentum(down, false);
  down = pushMomentum(down, false);
  assert.equal(pickDifficulty(down, undefined), 'easy');

  assert.equal(pickDifficulty(emptyMomentum(), undefined), 'base', 'starts in the middle');
});

test('a child who already knows the concept is not re-taught the basics', () => {
  const strong = { ...emptyMastery('c', 'tall-1-20'), confidence: 0.8, attempts: 5, state: 'secure' as const };
  assert.equal(pickDifficulty(emptyMomentum(), strong), 'hard');
});

test('effortless means first try, unaided, correct', () => {
  assert.equal(wasEffortless(true, 1, 'none'), true);
  assert.equal(wasEffortless(true, 2, 'none'), false);
  assert.equal(wasEffortless(true, 1, 'hint'), false);
  assert.equal(wasEffortless(false, 1, 'none'), false);
});

/* ---------------------------------------------------------------- graph */

test('the concept graph has no cycles and no dangling prerequisites', () => {
  assert.deepEqual(validateGraph(), []);
});

test('the graph is big enough to be a graph', () => {
  assert.ok(CONCEPTS.length >= 30, `expected 30+ concepts, got ${CONCEPTS.length}`);
  const withPrereqs = CONCEPTS.filter((c) => c.prerequisites.length > 0);
  assert.ok(withPrereqs.length >= 20, 'most concepts should build on something');
});

test('the maths spine is ordered the way the brief describes', () => {
  assert.ok(
    conceptDepth('subtraksjon-under-20') > conceptDepth('addisjon-under-20'),
    'subtraction comes after addition',
  );
  assert.ok(
    conceptDepth('addisjon-under-20') > conceptDepth('tall-1-20'),
    'addition comes after knowing the numbers',
  );
  assert.ok(
    prerequisitesOf('addisjon-over-20').some((c) => c.id === 'subtraksjon-under-20'),
  );
});

/* ------------------------------------------------------------ adventure */

test('every concept an adventure claims to touch actually exists', () => {
  const ids = new Set(CONCEPTS.map((c) => c.id));
  for (const adventure of ADVENTURES) {
    for (const conceptId of adventure.concepts) {
      assert.ok(ids.has(conceptId), `${adventure.id} references unknown concept ${conceptId}`);
    }
    for (const stage of adventure.stages) {
      if (stage.kind === 'story') continue;
      assert.ok(ids.has(stage.conceptId), `stage ${stage.id} references unknown concept ${stage.conceptId}`);
    }
  }
});

test('the Svalbard adventure has the six tasks the brief asks for', () => {
  const svalbard = ADVENTURES.find((a) => a.id === 'isbjornen');
  assert.ok(svalbard, 'isbjornen exists');
  const tasks = svalbard!.stages.filter((s) => s.kind !== 'story');
  assert.equal(tasks.length, 6);
  const kinds = tasks.map((t) => t.kind);
  for (const kind of ['numberChoice', 'guessReveal', 'reading', 'mapFind', 'drawing', 'reflection']) {
    assert.ok(kinds.includes(kind as never), `missing a ${kind} stage`);
  }
});

test('every graded task offers the full three-rung support ladder', () => {
  for (const adventure of ADVENTURES) {
    for (const stage of adventure.stages) {
      if (stage.kind === 'numberChoice' || stage.kind === 'reading' || stage.kind === 'mapFind') {
        assert.equal(stage.hints.length, 3, `${stage.id} needs hint, visual, guided`);
        for (const hint of stage.hints) {
          assert.ok(hint.text.trim().length > 0, `${stage.id} has an empty hint`);
        }
      }
    }
  }
});

test('each numberChoice variant lists its own answer among its options', () => {
  for (const adventure of ADVENTURES) {
    for (const stage of adventure.stages) {
      if (stage.kind !== 'numberChoice') continue;
      for (const [level, variant] of Object.entries(stage.variants)) {
        assert.ok(
          variant.options.includes(variant.answer),
          `${stage.id}/${level}: answer ${variant.answer} is not among the options`,
        );
      }
    }
  }
});

/* --------------------------------------------------------------- safety */

test('the child-safety layer strips contact routes out of free text', () => {
  assert.ok(!sanitizeForChild('se www.example.com').text.includes('example.com'));
  assert.ok(!sanitizeForChild('skriv til meg@example.com').text.includes('@'));
  assert.ok(!sanitizeForChild('ring 912 34 567').text.includes('912'));
});

test('sanitising never returns an empty string to the UI', () => {
  const result = sanitizeForChild('https://example.com');
  assert.ok(result.text.length > 0);
  assert.equal(result.changed, true);
});

test('ordinary Norwegian passes through untouched', () => {
  const text = 'Det kuleste var at isbjørnen ikke er hvit egentlig!';
  const result = sanitizeForChild(text);
  assert.equal(result.text, text);
  assert.equal(result.changed, false);
});
