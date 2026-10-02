/**
 * Pathfinding on the real harbour.
 *
 * The property that matters is one sentence: a route never leaves walkable
 * ground. The rest — reaching the goal, refusing water, not cutting corners —
 * follows from or guards it. Each test is checked against a case where the
 * naive behaviour fails, so a pass means something: the straight line from
 * the jetty to the meadow does leave the path, and the route does not.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { bryggaScene, BRYGGA_ANCHORS } from '../src/world/scenes/brygga.scene';
import {
  buildNavGrid,
  findPath,
  inAreas,
  type Point,
} from '../src/world/engine/navGrid';

const areas = bryggaScene.walkable ?? [];
const grid = buildNavGrid(areas, bryggaScene.world);

/** Every point along a polyline, two units apart. */
function along(points: Point[]): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2));
    for (let s = 0; s <= steps; s += 1) {
      out.push({ x: a.x + ((b.x - a.x) * s) / steps, y: a.y + ((b.y - a.y) * s) / steps });
    }
  }
  return out;
}

const offPath = (points: Point[]) => along(points).filter((p) => !inAreas(areas, p.x, p.y));

test('pathfinding on Brygga', async (t) => {
  const from = BRYGGA_ANCHORS.ellieSpawn;

  /**
   * Walks where the straight line goes wrong, measured rather than assumed.
   *
   * The scripted errands mostly don't: the path's bends happen to line up
   * along x ≈ 230, so the shore-to-meadow line stays on it. Free taps are
   * another matter — about a third of random pairs of walkable points leave
   * the path in a straight line, the worst by hundreds of units, and the
   * jetty ones wade straight through the sea.
   */
  const wrongWays: [string, Point, Point][] = [
    ['the end of the jetty to the far end of its crossbar', { x: 236, y: 820 }, { x: 80, y: 550 }],
    ['the far end of the crossbar to the end of the jetty', { x: 390, y: 552 }, { x: 236, y: 820 }],
    ['the meadow back down to the first shell', BRYGGA_ANCHORS.meadowExit, { x: 205, y: 452 }],
  ];

  await t.test('these walks leave the path in a straight line', () => {
    // The precondition for everything below. If a repaint ever makes these
    // straight, the route test would pass without proving anything.
    for (const [name, a, b] of wrongWays) {
      assert.ok(offPath([a, b]).length > 0, `${name}: the straight line stays on the path`);
    }
  });

  await t.test('their routes never do, and end where she was sent', () => {
    for (const [name, a, b] of wrongWays) {
      const route = findPath(grid, a, b);
      assert.ok(route, `${name}: no route found`);
      const off = offPath([a, ...route]);
      assert.equal(off.length, 0, `${name}: ${off.length} points of the route are off the path`);
      const end = route.at(-1)!;
      assert.ok(Math.hypot(end.x - b.x, end.y - b.y) < 0.5, `${name}: ends somewhere else`);
    }
  });

  await t.test('it is a walk, not a staircase', () => {
    const [, a, b] = wrongWays[0]!;
    const route = findPath(grid, a, b)!;
    // Dozens of grid cells; smoothing should leave a few long strokes that
    // still turn where the jetty meets its crossbar.
    assert.ok(route.length >= 2, 'a single stroke cannot turn the corner');
    assert.ok(route.length <= 8, `${route.length} waypoints — the smoothing is not working`);
  });

  await t.test('a thousand random walks stay on the path', () => {
    // The measured failure, turned into the test: random pairs of walkable
    // points, every route checked along its whole length.
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const pick = (): Point => {
      for (;;) {
        const p = { x: rnd() * bryggaScene.world.width, y: rnd() * bryggaScene.world.height };
        if (inAreas(areas, p.x, p.y)) return p;
      }
    };
    let routed = 0;
    for (let i = 0; i < 1000; i += 1) {
      const a = pick();
      const b = pick();
      const route = findPath(grid, a, b);
      if (!route) continue;
      routed += 1;
      const off = offPath([a, ...route]);
      assert.equal(off.length, 0, `(${a.x.toFixed(0)},${a.y.toFixed(0)}) → (${b.x.toFixed(0)},${b.y.toFixed(0)}) leaves the path`);
    }
    // Walkable ground is one connected piece, so nearly every pair routes.
    assert.ok(routed >= 980, `only ${routed} of 1000 walkable pairs found a route`);
  });

  await t.test('every chapter errand has a route that stays on the path', () => {
    const errands: Point[] = [
      BRYGGA_ANCHORS.millaApproach,
      ...['shell-1', 'shell-2', 'shell-3'].map((id) => {
        const s = bryggaScene.interactables.find((i) => i.id === id)!;
        return { x: s.x, y: s.y + 12 };
      }),
      BRYGGA_ANCHORS.meadowExit,
    ];
    let here: Point = from;
    for (const goal of errands) {
      const route = findPath(grid, here, goal);
      assert.ok(route, `no route to (${goal.x}, ${goal.y})`);
      assert.equal(offPath([here, ...route]).length, 0, `off the path on the way to (${goal.x}, ${goal.y})`);
      here = goal;
    }
  });

  await t.test('open water has no route', () => {
    assert.equal(findPath(grid, from, { x: 20, y: 700 }), null);
    assert.equal(findPath(grid, from, { x: 450, y: 700 }), null);
  });

  await t.test('a short hop with nothing in the way is one straight stroke', () => {
    const near = { x: from.x + 20, y: from.y };
    assert.deepEqual(findPath(grid, from, near), [near]);
  });

  await t.test('no diagonal squeezes between two blocked cells', () => {
    // Reconstruct the raw grid walk the router would take and check every
    // diagonal step has both of its orthogonal neighbours open.
    const { cols, open } = grid;
    for (let i = 0; i < open.length; i += 1) {
      if (!open[i]) continue;
      const c = i % cols;
      const r = Math.floor(i / cols);
      for (const [dx, dy] of [[1, 1], [1, -1]] as const) {
        const j = (r + dy) * cols + (c + dx);
        if (r + dy < 0 || r + dy >= grid.rows || c + dx >= cols) continue;
        if (!open[j]) continue;
        const pinched = !open[r * cols + c + dx] || !open[(r + dy) * cols + c];
        if (!pinched) continue;
        // A pinched diagonal exists in the grid: make sure a route across it
        // goes round rather than through.
        const a = { x: (c + 0.5) * grid.cell, y: (r + 0.5) * grid.cell };
        const b = { x: (c + dx + 0.5) * grid.cell, y: (r + dy + 0.5) * grid.cell };
        const route = findPath(grid, a, b);
        if (route) assert.equal(offPath([a, ...route]).length, 0);
      }
    }
  });
});
