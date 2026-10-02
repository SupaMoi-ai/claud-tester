/**
 * Character sprites: one figure, nothing underneath it.
 *
 * Model sheets draw a ground rule under each figure, separated from the feet
 * by a small gap. Cut with the figure, it stretches the sprite's bounding box
 * downward — and because characters are anchored at the bottom edge, the
 * figure then stands that far above whatever it is standing on. It has
 * happened twice in this project: first on Ellie and Kiki's walking views,
 * then on all four of Kiki's poses, where it put her hovering above the jetty
 * on the title screen and left a row of specks under her paws in every hint.
 *
 * The check: reading the sprite's alpha row by row, ink must form one
 * unbroken vertical run. A gap followed by more ink is a strip that is not
 * part of the character.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';

const ROOT = join(process.cwd(), 'public', 'assets', 'characters');

/** Opaque-pixel count per row of an 8-bit RGBA PNG. */
function inkRows(path: string): number[] {
  const data = readFileSync(path);
  let i = 8;
  let width = 0;
  let height = 0;
  let colourType = 0;
  const idat: Buffer[] = [];
  while (i < data.length) {
    const length = data.readUInt32BE(i);
    const type = data.toString('ascii', i + 4, i + 8);
    const body = data.subarray(i + 8, i + 8 + length);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      colourType = body[9]!;
    } else if (type === 'IDAT') idat.push(body);
    else if (type === 'IEND') break;
    i += 12 + length;
  }
  assert.equal(colourType, 6, `${path} is not RGBA — a sprite needs real transparency`);

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * 4;
  const rows: number[] = [];
  let prev = new Uint8Array(stride);
  let pos = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[pos]!;
    pos += 1;
    const line = new Uint8Array(raw.subarray(pos, pos + stride));
    pos += stride;
    for (let x = 0; x < stride; x += 1) {
      const a = x >= 4 ? line[x - 4]! : 0;
      const b = prev[x]!;
      const c = x >= 4 ? prev[x - 4]! : 0;
      let add = 0;
      if (filter === 1) add = a;
      else if (filter === 2) add = b;
      else if (filter === 3) add = (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        add = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      line[x] = (line[x]! + add) & 255;
    }
    let ink = 0;
    for (let x = 3; x < stride; x += 4) if (line[x]! > 24) ink += 1;
    rows.push(ink);
    prev = line;
  }
  return rows;
}

/** Vertical runs of rows that contain any ink. */
function bands(rows: number[]): [number, number][] {
  const out: [number, number][] = [];
  let start = -1;
  rows.forEach((n, y) => {
    if (n > 0 && start === -1) start = y;
    if (n === 0 && start !== -1) {
      out.push([start, y - 1]);
      start = -1;
    }
  });
  if (start !== -1) out.push([start, rows.length - 1]);
  return out;
}

test('character sprites', async (t) => {
  const files = readdirSync(ROOT).flatMap((who) =>
    readdirSync(join(ROOT, who))
      .filter((f) => f.endsWith('.png'))
      .map((f) => join(who, f)),
  );
  assert.ok(files.length >= 20, `only ${files.length} sprites found — is this the project root?`);

  await t.test('every one is a single figure with nothing detached beneath it', () => {
    const broken = files.filter((f) => bands(inkRows(join(ROOT, f))).length !== 1);
    assert.deepEqual(broken, [], `detached strips in: ${broken.join(', ')}`);
  });
});
