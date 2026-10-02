/**
 * Finding a way along the path, rather than straight at the target.
 *
 * Specification section 2.2: a 12-unit grid, obstacles inflated by the
 * walker's radius, eight directions, no cutting corners. Before this, Ellie
 * walked in a straight line to wherever she was sent, which on Brygga's
 * winding path meant striding across the grass on every bend — and the
 * chapter sends her up and down that bend three times.
 *
 * Plain data and arithmetic, no Pixi: the renderer builds one of these from
 * the scene's walkable rectangles, and the tests can build the same one.
 *
 * Three steps:
 *   1. GRID — a cell is open when a disc of the walker's radius around its
 *      centre is entirely on walkable ground. That is the "inflation": the
 *      walker's centre stays far enough from the edge that her body does too.
 *   2. SEARCH — A* over the open cells, octile distance, diagonals only when
 *      both cells they pass between are open.
 *   3. SMOOTHING — the grid path is a staircase, and a staircase walk looks
 *      robotic. Waypoints are dropped wherever a straight line to a later one
 *      stays on open ground, so she walks in long natural strokes and still
 *      turns where the path does.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface NavGrid {
  cell: number;
  radius: number;
  cols: number;
  rows: number;
  /** 1 = open. Row-major. */
  open: Uint8Array;
  areas: Rect[];
}

/** Section 2.2's numbers. */
export const NAV_CELL = 12;
export const NAV_RADIUS = 10;

/** Directions around a disc's edge that must all be on walkable ground. */
const RING = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2;
  return { x: Math.cos(a), y: Math.sin(a) };
});

export function inAreas(areas: Rect[], x: number, y: number): boolean {
  if (areas.length === 0) return true;
  return areas.some(
    (a) => x >= a.x && x <= a.x + a.width && y >= a.y && y <= a.y + a.height,
  );
}

/** Is a walker of `radius` able to stand with its centre here? */
export function fits(areas: Rect[], x: number, y: number, radius: number): boolean {
  if (!inAreas(areas, x, y)) return false;
  // Two rings, so a narrow notch between the centre and the rim cannot hide.
  for (const r of [radius, radius / 2]) {
    for (const d of RING) {
      if (!inAreas(areas, x + d.x * r, y + d.y * r)) return false;
    }
  }
  return true;
}

export function buildNavGrid(
  areas: Rect[],
  world: { width: number; height: number },
  cell = NAV_CELL,
  radius = NAV_RADIUS,
): NavGrid {
  const cols = Math.ceil(world.width / cell);
  const rows = Math.ceil(world.height / cell);
  const open = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const x = (c + 0.5) * cell;
      const y = (r + 0.5) * cell;
      if (fits(areas, x, y, radius)) open[r * cols + c] = 1;
    }
  }
  return { cell, radius, cols, rows, open, areas };
}

const centre = (g: NavGrid, i: number): Point => ({
  x: ((i % g.cols) + 0.5) * g.cell,
  y: (Math.floor(i / g.cols) + 0.5) * g.cell,
});

/** Is every point of a straight line on walkable ground? No radius. */
function onGround(areas: Rect[], a: Point, b: Point): boolean {
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2));
  for (let s = 0; s <= steps; s += 1) {
    const t = s / steps;
    if (!inAreas(areas, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) return false;
  }
  return true;
}

/**
 * The nearest open cell that can be reached from a point without leaving
 * walkable ground, searched outward ring by ring.
 *
 * Needed because a point can be walkable yet closer to the edge than the
 * walker's radius — a shell at the side of the path, or Ellie herself having
 * stopped there. Refusing that would refuse a perfectly reasonable tap.
 *
 * "Nearest" alone was not enough. Where two traced bands of the path meet at
 * a step, the nearest open cell can sit round the corner, and the straight
 * hop to it crossed the corner off the path — found by the random-walk test,
 * from the very top of the harbour path. So a cell only counts if the hop to
 * it stays on the ground; this also makes a tap in the water find nothing.
 */
function nearestOpen(g: NavGrid, p: Point, maxRings = 4): number | null {
  const c0 = Math.floor(p.x / g.cell);
  const r0 = Math.floor(p.y / g.cell);
  for (let ring = 0; ring <= maxRings; ring += 1) {
    let best: number | null = null;
    let bestD = Infinity;
    for (let r = r0 - ring; r <= r0 + ring; r += 1) {
      for (let c = c0 - ring; c <= c0 + ring; c += 1) {
        if (Math.max(Math.abs(r - r0), Math.abs(c - c0)) !== ring) continue;
        if (r < 0 || c < 0 || r >= g.rows || c >= g.cols) continue;
        const i = r * g.cols + c;
        if (!g.open[i]) continue;
        const q = centre(g, i);
        const d = Math.hypot(q.x - p.x, q.y - p.y);
        if (d < bestD && onGround(g.areas, p, q)) {
          bestD = d;
          best = i;
        }
      }
    }
    if (best !== null) return best;
  }
  return null;
}

/** Does a straight walk between two points keep the walker on open ground? */
export function clearLine(g: NavGrid, a: Point, b: Point): boolean {
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  const steps = Math.max(1, Math.ceil(length / 3));
  for (let s = 0; s <= steps; s += 1) {
    const t = s / steps;
    if (!fits(g.areas, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, g.radius)) {
      return false;
    }
  }
  return true;
}

const SQRT2 = Math.SQRT2;
const NEIGHBOURS = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, SQRT2], [1, -1, SQRT2], [-1, 1, SQRT2], [-1, -1, SQRT2],
] as const;

/**
 * A walkable route from one point to another, or null when there is none.
 *
 * Null is an answer, not an error: a tap on an island across the water has
 * no route, and the right response is to stay put rather than wade in.
 */
export function findPath(g: NavGrid, from: Point, to: Point): Point[] | null {
  const start = nearestOpen(g, from);
  const goal = nearestOpen(g, to);
  if (start === null || goal === null) return null;

  // Already within reach in one straight, safe line: no search needed.
  if (clearLine(g, from, to)) return [{ x: to.x, y: to.y }];

  const n = g.cols * g.rows;
  const gScore = new Float64Array(n).fill(Infinity);
  const came = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const gc = goal % g.cols;
  const gr = Math.floor(goal / g.cols);
  const h = (i: number) => {
    const dx = Math.abs((i % g.cols) - gc);
    const dy = Math.abs(Math.floor(i / g.cols) - gr);
    return dx + dy + (SQRT2 - 2) * Math.min(dx, dy);
  };

  // A binary heap on f-score. The grids here are a few thousand cells, but a
  // linear scan would still be the slowest thing in a tap's response.
  const heap: [number, number][] = [];
  const push = (f: number, i: number) => {
    heap.push([f, i]);
    let k = heap.length - 1;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (heap[p]![0] <= heap[k]![0]) break;
      [heap[p], heap[k]] = [heap[k]!, heap[p]!];
      k = p;
    }
  };
  const pop = (): number => {
    const top = heap[0]![1];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let k = 0;
      for (;;) {
        const l = k * 2 + 1;
        const r = l + 1;
        let m = k;
        if (l < heap.length && heap[l]![0] < heap[m]![0]) m = l;
        if (r < heap.length && heap[r]![0] < heap[m]![0]) m = r;
        if (m === k) break;
        [heap[m], heap[k]] = [heap[k]!, heap[m]!];
        k = m;
      }
    }
    return top;
  };

  gScore[start] = 0;
  push(h(start), start);

  while (heap.length) {
    const cur = pop();
    if (closed[cur]) continue;
    if (cur === goal) break;
    closed[cur] = 1;
    const cc = cur % g.cols;
    const cr = Math.floor(cur / g.cols);

    for (const [dx, dy, cost] of NEIGHBOURS) {
      const nc = cc + dx;
      const nr = cr + dy;
      if (nc < 0 || nr < 0 || nc >= g.cols || nr >= g.rows) continue;
      const ni = nr * g.cols + nc;
      if (!g.open[ni] || closed[ni]) continue;
      // No cutting corners: a diagonal step needs both cells it squeezes
      // between to be open, or the walker clips the obstacle's corner.
      if (dx !== 0 && dy !== 0) {
        if (!g.open[cr * g.cols + nc] || !g.open[nr * g.cols + cc]) continue;
      }
      const tentative = gScore[cur]! + cost;
      if (tentative < gScore[ni]!) {
        gScore[ni] = tentative;
        came[ni] = cur;
        push(tentative + h(ni), ni);
      }
    }
  }

  if (start !== goal && came[goal] === -1) return null;

  const cells: number[] = [];
  for (let i = goal; i !== -1; i = came[i]!) {
    cells.push(i);
    if (i === start) break;
  }
  cells.reverse();

  // Start from where the walker actually is, end where she was sent.
  const raw: Point[] = [{ x: from.x, y: from.y }, ...cells.map((i) => centre(g, i)), {
    x: to.x,
    y: to.y,
  }];
  return smooth(g, raw).slice(1);
}

/**
 * Drop every waypoint a straight, safe line can skip.
 *
 * Greedy from each kept point to the furthest one it can see. When nothing
 * further is visible it always takes the very next point, which is what lets
 * a walker standing closer to an edge than her radius (spawned there, or
 * stopped at a shell) still set off: the first and last short hops are
 * exactly the grid's own, never invented.
 */
function smooth(g: NavGrid, points: Point[]): Point[] {
  if (points.length <= 2) return points;
  const out: Point[] = [points[0]!];
  let i = 0;
  while (i < points.length - 1) {
    let j = points.length - 1;
    while (j > i + 1 && !clearLine(g, points[i]!, points[j]!)) j -= 1;
    out.push(points[j]!);
    i = j;
  }
  return out;
}
