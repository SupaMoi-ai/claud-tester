/**
 * Milla's basket: the arithmetic a child is asked to do has to be right.
 *
 * Everything about the task — the question, the three cards, every hint and
 * Milla's praise — is generated from two numbers. That makes it impossible to
 * mistype one card, and possible to get the generator wrong for every card at
 * once. These pin the generator down.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BASKET,
  basketOptions,
  chapterTask,
  gradeOf,
} from '../src/world/scenes/brygga.chapter';
import { getConcept } from '../src/data/concepts';
import type { Difficulty } from '../src/learning/types';

const LEVELS: Difficulty[] = ['easy', 'base', 'hard'];

test('Milla’s basket', async (t) => {
  await t.test('every level asks groups × each, and the answer is a card exactly once', () => {
    for (const level of LEVELS) {
      const { groups, each } = BASKET[level];
      const { stage, difficulty } = chapterTask(3, level, false);
      assert.equal(difficulty, level);
      const v = stage.variants[level];
      assert.equal(v.answer, groups * each, `${level}: answer`);
      assert.equal(v.options.filter((o) => o === v.answer).length, 1, `${level}: answer once`);
      assert.match(v.prompt, new RegExp(`${groups} rom`), `${level}: prompt names the groups`);
      assert.match(v.prompt, new RegExp(`${each} skjell i hvert`), `${level}: prompt names each`);
    }
  });

  await t.test('three distinct cards, in ascending order, all of them plausible slips', () => {
    for (const level of LEVELS) {
      const { groups, each } = BASKET[level];
      const options = basketOptions(groups, each);
      assert.equal(new Set(options).size, 3, `${level}: three different cards`);
      assert.deepEqual(options, [...options].sort((a, b) => a - b), `${level}: ascending`);
      // Adding instead of multiplying is the slip the task exists to catch.
      assert.ok(options.includes(groups + each), `${level}: the add-instead slip is offered`);
    }
  });

  await t.test('the hints describe the same basket as the question', () => {
    for (const level of LEVELS) {
      const { groups, each } = BASKET[level];
      const { stage } = chapterTask(3, level, false);
      const [, visual, guided] = stage.hints;
      for (const hint of [visual, guided]) {
        assert.equal(hint.visual?.kind, 'equalGroups');
        if (hint.visual?.kind !== 'equalGroups') continue;
        assert.equal(hint.visual.groups, groups, `${level}: picture shows the right number of compartments`);
        assert.equal(hint.visual.each, each, `${level}: and the right number in each`);
      }
      assert.ok(guided.text.includes(`= ${groups * each}`), `${level}: guided hint states the product`);
    }
  });

  await t.test('Milla counts in steps that end on the answer', () => {
    assert.equal(chapterTask(3, 'base', false).praise, 'Tolv! Fire, åtte, tolv.');
    assert.equal(chapterTask(3, 'easy', false).praise, 'Seks! Tre, seks.');
    assert.equal(chapterTask(3, 'hard', false).praise, 'Tjue! Fem, ti, femten, tjue.');
  });

  await t.test('the task fits the player, not the demo child', () => {
    // Ellie: 3rd grade, multiplication at whatever level the engine picked.
    assert.equal(chapterTask(3, 'base', true).stage.conceptId, 'ganging-enkel');
    assert.equal(chapterTask(3, 'base', true).difficulty, 'base');
    // A 2nd grader meeting it for the first time starts at the bottom.
    assert.equal(chapterTask(2, 'base', true).difficulty, 'easy');
    assert.equal(chapterTask(2, 'base', false).difficulty, 'base');
    // 1st grade and below count the shells they found instead.
    for (const grade of [0, 1]) {
      const { stage, praise } = chapterTask(grade, 'hard', false);
      assert.equal(stage.conceptId, 'tall-1-20');
      assert.equal(stage.variants.base.answer, 3);
      assert.match(praise, /^Tre!/);
    }
  });

  await t.test('"not in school yet" is year 0, not a guess', () => {
    assert.equal(gradeOf({ grade: 3 }), 3);
    assert.equal(gradeOf({ grade: null }), 0);
    assert.equal(gradeOf(null), 0);
  });

  await t.test('both concepts exist and suit the grades that get them', () => {
    const groups = getConcept('ganging-enkel');
    const counting = getConcept('tall-1-20');
    assert.ok(groups && counting, 'a task practising a concept the graph does not know is invisible to the parent');
    assert.ok(groups.gradeRange[0] <= 2 && groups.gradeRange[1] >= 3);
    assert.ok(counting.gradeRange[0] <= 1);
  });
});
