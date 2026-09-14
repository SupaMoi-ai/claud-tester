/* Minimal QR encoder — byte mode, error correction level M, versions 1-10.
   Inline rather than from a CDN: the prop has to work with no signal.
   VBQR.encode(text) -> { size, modules } where modules[row][col] is boolean. */
window.VBQR = (function () {
  "use strict";

  /* ---- GF(256), primitive polynomial 0x11D ---- */
  const EXP = new Array(512), LOG = new Array(256);
  (function () {
    let x = 1;
    for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
    for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  })();
  const mul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

  function genPoly(n) {
    let p = [1];
    for (let i = 0; i < n; i++) {
      const q = new Array(p.length + 1).fill(0);
      for (let j = 0; j < p.length; j++) {
        q[j] ^= p[j];                       // × x
        q[j + 1] ^= mul(p[j], EXP[i]);      // × α^i
      }
      p = q;
    }
    return p;
  }

  function ecBytes(data, n) {
    const gen = genPoly(n);
    const res = data.concat(new Array(n).fill(0));
    for (let i = 0; i < data.length; i++) {
      const c = res[i];
      if (c === 0) continue;
      for (let j = 0; j < gen.length; j++) res[i + j] ^= mul(gen[j], c);
    }
    return res.slice(data.length);
  }

  /* ---- block structure, level M ---- */
  const RS = {
    1:  { ec: 10, g: [[1, 16]] },
    2:  { ec: 16, g: [[1, 28]] },
    3:  { ec: 26, g: [[1, 44]] },
    4:  { ec: 18, g: [[2, 32]] },
    5:  { ec: 24, g: [[2, 43]] },
    6:  { ec: 16, g: [[4, 27]] },
    7:  { ec: 18, g: [[4, 31]] },
    8:  { ec: 22, g: [[2, 38], [2, 39]] },
    9:  { ec: 22, g: [[3, 36], [2, 37]] },
    10: { ec: 26, g: [[4, 43], [1, 44]] },
  };
  const ALIGN = {
    1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
    6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
  };
  // bits appended after the interleaved codewords
  const REMAINDER = { 1: 0, 2: 7, 3: 7, 4: 7, 5: 7, 6: 7, 7: 0, 8: 0, 9: 0, 10: 0 };

  const dataCwOf = (v) => RS[v].g.reduce((n, [b, d]) => n + b * d, 0);
  const capacityOf = (v) => dataCwOf(v) - (v < 10 ? 2 : 3);

  function utf8(text) {
    const out = [];
    for (const ch of unescape(encodeURIComponent(text))) out.push(ch.charCodeAt(0) & 0xff);
    return out;
  }

  /* ---- matrix scaffolding ---- */
  function blank(size) {
    const m = [], fn = [];
    for (let i = 0; i < size; i++) { m.push(new Array(size).fill(false)); fn.push(new Array(size).fill(false)); }
    return { m, fn };
  }

  function setFinder(m, fn, r, c, size) {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
        const inRing = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6 &&
          (dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4));
        m[rr][cc] = inRing;
        fn[rr][cc] = true;
      }
    }
  }

  function buildFunctions(version) {
    const size = 17 + 4 * version;
    const { m, fn } = blank(size);

    setFinder(m, fn, 0, 0, size);
    setFinder(m, fn, 0, size - 7, size);
    setFinder(m, fn, size - 7, 0, size);

    // timing patterns
    for (let i = 0; i < size; i++) {
      if (!fn[6][i]) { m[6][i] = i % 2 === 0; fn[6][i] = true; }
      if (!fn[i][6]) { m[i][6] = i % 2 === 0; fn[i][6] = true; }
    }

    // alignment patterns
    const centers = ALIGN[version];
    const first = centers[0], last = centers[centers.length - 1];
    for (const r of centers) {
      for (const c of centers) {
        // the three positions sitting on finder patterns are omitted
        if ((r === first && c === first) || (r === first && c === last) || (r === last && c === first)) continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            m[r + dr][c + dc] = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
            fn[r + dr][c + dc] = true;
          }
        }
      }
    }

    // format information areas + the always-dark module
    for (let i = 0; i < 9; i++) { fn[8][i] = true; fn[i][8] = true; }
    for (let i = 0; i < 8; i++) { fn[8][size - 1 - i] = true; fn[size - 1 - i][8] = true; }
    m[size - 8][8] = true;
    fn[size - 8][8] = true;

    // version information, v7 and up
    if (version >= 7) {
      let rem = version;
      for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
      const bits = ((version << 12) | rem) >>> 0;
      for (let i = 0; i < 18; i++) {
        const bit = ((bits >>> i) & 1) === 1;
        const a = size - 11 + (i % 3), b = Math.floor(i / 3);
        m[a][b] = bit; fn[a][b] = true;
        m[b][a] = bit; fn[b][a] = true;
      }
    }
    return { size, m, fn };
  }

  function placeFormat(m, size, mask) {
    // level M = 0b00
    const data = (0 << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = (((data << 10) | rem) ^ 0x5412) >>> 0;

    // bit index 0 is the most significant of the 15
    const fb = (i) => ((bits >>> (14 - i)) & 1) === 1;

    for (let i = 0; i <= 5; i++) m[8][i] = fb(i);
    m[8][7] = fb(6);
    m[8][8] = fb(7);
    m[7][8] = fb(8);
    for (let i = 9; i < 15; i++) m[14 - i][8] = fb(i);

    for (let i = 0; i < 8; i++) m[size - 1 - i][8] = fb(i);
    for (let i = 8; i < 15; i++) m[8][size - 15 + i] = fb(i);

    // the dark module sits inside the second copy's run and always wins
    m[size - 8][8] = true;
  }

  const MASKS = [
    (r, c) => (r + c) % 2 === 0,
    (r) => r % 2 === 0,
    (r, c) => c % 3 === 0,
    (r, c) => (r + c) % 3 === 0,
    (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
    (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
    (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
  ];

  function penalty(m, size) {
    let score = 0;

    // rule 1 — runs of five or more
    for (let pass = 0; pass < 2; pass++) {
      for (let a = 0; a < size; a++) {
        let run = 1, prev = pass ? m[0][a] : m[a][0];
        for (let b = 1; b < size; b++) {
          const v = pass ? m[b][a] : m[a][b];
          if (v === prev) { run++; if (run === 5) score += 3; else if (run > 5) score += 1; }
          else { run = 1; prev = v; }
        }
      }
    }

    // rule 2 — 2×2 blocks of one colour
    for (let r = 0; r < size - 1; r++)
      for (let c = 0; c < size - 1; c++)
        if (m[r][c] === m[r][c + 1] && m[r][c] === m[r + 1][c] && m[r][c] === m[r + 1][c + 1]) score += 3;

    // rule 3 — finder-like 1:1:3:1:1 sequences
    const A = [true, false, true, true, true, false, true, false, false, false, false];
    const B = [false, false, false, false, true, false, true, true, true, false, true];
    const match = (get, i) => {
      let okA = true, okB = true;
      for (let k = 0; k < 11; k++) {
        const v = get(i + k);
        if (v !== A[k]) okA = false;
        if (v !== B[k]) okB = false;
      }
      return okA || okB;
    };
    for (let r = 0; r < size; r++)
      for (let c = 0; c + 11 <= size; c++)
        if (match((i) => m[r][i], c)) score += 40;
    for (let c = 0; c < size; c++)
      for (let r = 0; r + 11 <= size; r++)
        if (match((i) => m[i][c], r)) score += 40;

    // rule 4 — deviation from an even split of dark and light
    let dark = 0;
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (m[r][c]) dark++;
    const pct = (dark * 100) / (size * size);
    score += Math.floor(Math.abs(pct - 50) / 5) * 10;

    return score;
  }

  function encode(text) {
    const bytes = utf8(text);
    let version = 0;
    for (let v = 1; v <= 10; v++) if (capacityOf(v) >= bytes.length) { version = v; break; }
    if (!version) throw new Error("QR payload too long");

    const totalData = dataCwOf(version);
    const bits = [];
    const push = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };

    push(0b0100, 4);
    push(bytes.length, version < 10 ? 8 : 16);
    for (const b of bytes) push(b, 8);
    for (let i = 0; i < 4 && bits.length < totalData * 8; i++) bits.push(0);
    while (bits.length % 8 !== 0) bits.push(0);

    const cw = [];
    for (let i = 0; i < bits.length; i += 8) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
      cw.push(b);
    }
    for (let i = 0; cw.length < totalData; i++) cw.push(i % 2 === 0 ? 0xec : 0x11);

    // split into blocks, then interleave data and error correction
    const blocks = [], ecs = [];
    let at = 0;
    for (const [count, dataLen] of RS[version].g) {
      for (let i = 0; i < count; i++) {
        const chunk = cw.slice(at, at + dataLen);
        at += dataLen;
        blocks.push(chunk);
        ecs.push(ecBytes(chunk, RS[version].ec));
      }
    }
    const out = [];
    const maxData = Math.max(...blocks.map((b) => b.length));
    for (let i = 0; i < maxData; i++) for (const b of blocks) if (i < b.length) out.push(b[i]);
    for (let i = 0; i < RS[version].ec; i++) for (const e of ecs) out.push(e[i]);

    const stream = [];
    for (const b of out) for (let i = 7; i >= 0; i--) stream.push((b >>> i) & 1);
    for (let i = 0; i < REMAINDER[version]; i++) stream.push(0);

    // zigzag placement, right to left, skipping the vertical timing column
    const base = buildFunctions(version);
    const size = base.size;
    let idx = 0, upward = true;
    const filled = base.m.map((row) => row.slice());
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let step = 0; step < size; step++) {
        const r = upward ? size - 1 - step : step;
        for (const c of [right, right - 1]) {
          if (base.fn[r][c]) continue;
          filled[r][c] = idx < stream.length ? stream[idx] === 1 : false;
          idx++;
        }
      }
      upward = !upward;
    }

    // pick the mask that scores lowest
    let best = null, bestScore = Infinity;
    for (let mask = 0; mask < 8; mask++) {
      const m = filled.map((row) => row.slice());
      for (let r = 0; r < size; r++)
        for (let c = 0; c < size; c++)
          if (!base.fn[r][c] && MASKS[mask](r, c)) m[r][c] = !m[r][c];
      placeFormat(m, size, mask);
      const s = penalty(m, size);
      if (s < bestScore) { bestScore = s; best = m; }
    }

    return { size, modules: best, version };
  }

  return { encode };
})();
