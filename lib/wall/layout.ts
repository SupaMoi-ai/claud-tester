// Deterministic scatter layout for pins on The Wall.
// Hash the pin id so the same pin lands in the same place every time —
// no need to write positions back to the DB on first load.

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const COLUMN_WIDTH = 220;
const ROW_HEIGHT = 280;
const COLUMNS = 6;

export function layoutPin(
  id: string,
  index: number
): { x: number; y: number; rotation: number } {
  const h = hash(id);
  const col = index % COLUMNS;
  const row = Math.floor(index / COLUMNS);

  // Add a small per-pin jitter so the grid feels handmade.
  const jitterX = ((h & 0xff) / 255 - 0.5) * 40;
  const jitterY = (((h >> 8) & 0xff) / 255 - 0.5) * 40;
  const rotation = (((h >> 16) & 0xff) / 255 - 0.5) * 3; // ±1.5°

  return {
    x: col * COLUMN_WIDTH + jitterX,
    y: row * ROW_HEIGHT + jitterY,
    rotation,
  };
}
