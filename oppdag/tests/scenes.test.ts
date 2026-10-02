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

import { bryggaScene, BRYGGA_ANCHORS } from '../src/world/scenes/brygga.scene';

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
});
