/**
 * Scene geometry: the parts of a scene that can be wrong without anything
 * failing to compile, render or throw.
 *
 * The walkable area is traced out of the painted plate by
 * `scripts/trace-walkable.mjs`, and the named anchors are authored by hand
 * against that trace. Nothing connects the two, so an anchor can sit in open
 * water and the only symptom is a character standing on the sea — which is
 * precisely what happened, twice. First the specification's own coordinates
 * placed Ellie off the end of the jetty, because they were written before the
 * harbour was painted. Then a correction stood her on the jetty's crossbar
 * rather than the sand above it, a miss of about 20 units that reads perfectly
 * fine in a thumbnail.
 *
 * These are cheap and they fail loudly when a plate is repainted and the trace
 * moves underneath the anchors.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { bryggaScene, BRYGGA_ANCHORS } from '../src/world/scenes/brygga.scene';
import { SHELL_IDS, KEEPSAKES } from '../src/world/scenes/brygga.chapter';

/**
 * Relative to the working directory, not to this file: the suite is bundled
 * into `node_modules/.test-build` before it runs, so `import.meta.url` points
 * at the build output and every asset looks missing.
 */
const PUBLIC = join(process.cwd(), 'public');

/** The engine's own rule, restated: no areas declared means anywhere goes. */
function isWalkable(scene: typeof bryggaScene, x: number, y: number): boolean {
  const areas = scene.walkable;
  if (!areas || areas.length === 0) return true;
  return areas.some(
    (a) => x >= a.x && x <= a.x + a.width && y >= a.y && y <= a.y + a.height,
  );
}

test('Brygga', async (t) => {
  await t.test('every named anchor is somewhere a character can stand', () => {
    for (const [name, at] of Object.entries(BRYGGA_ANCHORS)) {
      assert.ok(
        isWalkable(bryggaScene, at.x, at.y),
        `${name} at (${at.x}, ${at.y}) is not on walkable ground — ` +
          `the plate may have been repainted without re-running the tracer`,
      );
    }
  });

  await t.test('both actors spawn on walkable ground', () => {
    for (const actor of bryggaScene.actors ?? []) {
      assert.ok(
        isWalkable(bryggaScene, actor.x, actor.y),
        `${actor.id} spawns at (${actor.x}, ${actor.y}), which is not walkable`,
      );
    }
  });

  await t.test('the open water is refused', () => {
    // Far left and far right at the jetty's depth is sea in any repaint that
    // still shows a jetty. If this ever passes, the trace has swallowed the
    // water and tapping it would walk Ellie out to sea.
    for (const [x, y] of [
      [20, 700],
      [450, 700],
      [30, 800],
    ]) {
      assert.ok(
        !isWalkable(bryggaScene, x, y),
        `(${x}, ${y}) is open water but reads as walkable`,
      );
    }
  });

  await t.test('the main path keeps the authored minimum width', () => {
    // Section 4.2: at least 64 logical units. The narrowest traced band is
    // allowed a pixel of brushwork either side of that.
    const narrowest = Math.min(...(bryggaScene.walkable ?? []).map((a) => a.width));
    assert.ok(
      narrowest >= 48,
      `narrowest walkable band is ${narrowest} LU, which is not a path`,
    );
  });

  await t.test('the world matches the plate it is traced from', () => {
    // 941 x 1672 px of art at the specification's 2 px per logical unit.
    assert.equal(bryggaScene.world.width, 470.5);
    assert.equal(bryggaScene.world.height, 836);
  });

  await t.test('the camera declares the design canvas', () => {
    // Without this the visible world is a property of the handset, and an
    // authored character height stops meaning the same thing on every device.
    assert.equal(bryggaScene.camera.designWidth, 360);
  });

  await t.test('the near layer keeps off the path', () => {
    // Foreground pieces are drawn over everything and take no taps, so one
    // placed across the route is a patch of scene where the child can see the
    // path, tap it, and have nothing happen. Sampled down the middle of every
    // walkable band rather than at its corners, because the middle is where
    // the walking actually happens.
    const fore = bryggaScene.layers.filter((l) => l.layer === 'fore');
    assert.ok(fore.length > 0, 'no near layer — this test is watching nothing');

    for (const piece of fore) {
      for (const band of bryggaScene.walkable ?? []) {
        const cx = band.x + band.width / 2;
        for (let y = band.y; y <= band.y + band.height; y += 12) {
          const over =
            cx >= piece.position.x &&
            cx <= piece.position.x + piece.size.width &&
            y >= piece.position.y &&
            y <= piece.position.y + piece.size.height;
          assert.ok(
            !over,
            `${piece.id} covers the middle of the path at (${cx}, ${y})`,
          );
        }
      }
    }
  });

  await t.test('every piece of artwork the chapter names exists', () => {
    // A path that is merely misspelled renders as a placeholder block in the
    // world and as a broken image in the interface, and both look enough like
    // "not finished yet" to survive a glance.
    // If this is wrong, every path below "fails" for the same uninteresting
    // reason, so say so once and clearly.
    assert.ok(
      existsSync(join(PUBLIC, 'assets')),
      `no assets directory under ${PUBLIC} — run the suite from the project root`,
    );

    const paths = [
      ...bryggaScene.layers.map((l) => l.asset),
      ...bryggaScene.interactables.map((i) => i.asset),
      ...(bryggaScene.actors ?? []).flatMap((a) => Object.values(a.sprites)),
      ...(bryggaScene.preload ?? []),
      'assets/characters/milla/portrait-calm.png',
      'assets/characters/milla/portrait-talk.png',
      'assets/characters/milla/portrait-pleased.png',
      'assets/worlds/brygga/journal/milla.png',
      'assets/worlds/brygga/journal/skjell.png',
    ].filter((p): p is string => Boolean(p));

    for (const path of new Set(paths)) {
      assert.ok(existsSync(join(PUBLIC, path)), `${path} is named but not on disk`);
    }
  });

  await t.test('the chapter names objects the scene actually has', () => {
    const ids = new Set(bryggaScene.interactables.map((i) => i.id));
    for (const id of [...SHELL_IDS, 'milla', 'milla-at-twigs', 'basket', 'twigs']) {
      assert.ok(ids.has(id), `the chapter drives "${id}", which the scene has not got`);
    }
    // Two keepsakes, distinct, or the journal shows one card twice.
    assert.equal(new Set(Object.values(KEEPSAKES)).size, 2);
  });

  await t.test('Milla waits at the twigs, and is not in the scene yet', () => {
    const second = bryggaScene.interactables.find((i) => i.id === 'milla-at-twigs');
    assert.ok(second?.hidden, 'the second Milla must start hidden, or there are two');
    const twigs = bryggaScene.interactables.find((i) => i.id === 'twigs');
    assert.ok(twigs);
    assert.ok(
      Math.hypot(second.x - twigs.x, second.y - twigs.y) < 60,
      'Milla clears twigs she is nowhere near',
    );
  });

  await t.test('side views face right, as the engine assumes', () => {
    // The engine mirrors `side` for walking left. The left-facing drawings are
    // called side.png; one in this slot makes a character walk backwards both
    // ways, which Ellie and Kiki both did until it was caught by eye. A name
    // check is crude, but it is the name that was got wrong.
    for (const actor of bryggaScene.actors ?? []) {
      assert.ok(
        !actor.sprites.side.endsWith('/side.png'),
        `${actor.id} stands in a left-facing drawing (${actor.sprites.side})`,
      );
    }
  });
});
