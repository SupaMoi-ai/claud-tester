import type { EmbeddingProvider } from "./interface";

// Deterministic pseudo-random 512-vector seeded by the image URL.
// Pins built from the same Unsplash tag (mock data) cluster naturally,
// so cosine similarity on these vectors produces a meaningful nearest-
// neighbour set without calling Replicate.

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Strip the trailing `&sig=N` and `-v\d+` so visual cousins share a base
// embedding. Then add a small jitter so they aren't identical.
function tagOf(imageUrl: string): { base: string; sig: number } {
  const u = new URL(imageUrl);
  const q = u.searchParams.get("?") ?? u.search;
  const sig = parseInt(u.searchParams.get("sig") ?? "0", 10) || 0;
  const base = (u.searchParams.get("query") ?? u.pathname + q)
    .replace(/-v\d+$/, "")
    .replace(/\s+/g, "_");
  return { base, sig };
}

export const embeddingMock: EmbeddingProvider = {
  async embedImage(imageUrl: string): Promise<number[]> {
    let base: string;
    let sig: number;
    try {
      const t = tagOf(imageUrl);
      base = t.base;
      sig = t.sig;
    } catch {
      base = imageUrl;
      sig = 0;
    }

    // Two streams of randomness: a stable one per "tag" (defines the cluster
    // direction) and a small jitter per pin (so vectors aren't identical).
    const baseRand = mulberry32(hashString(base));
    const jitterRand = mulberry32(hashString(imageUrl) ^ (sig + 1));

    const v = new Array<number>(512);
    for (let i = 0; i < 512; i++) {
      // Most of the vector comes from the cluster signature; a small share
      // from per-pin jitter.
      v[i] = (baseRand() - 0.5) * 0.95 + (jitterRand() - 0.5) * 0.1;
    }

    // L2 normalise so cosine similarity behaves nicely with ivfflat cosine ops.
    let norm = 0;
    for (let i = 0; i < 512; i++) norm += v[i] * v[i];
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < 512; i++) v[i] /= norm;

    // Tiny artificial latency so the sync animation has rhythm.
    await new Promise((r) => setTimeout(r, 25));
    return v;
  },
};
