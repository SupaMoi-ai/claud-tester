import type {
  PinterestProvider,
  PinterestTokens,
  RemoteBoard,
  RemotePin,
} from "./interface";

// A fixed roster of ~80 royalty-free image URLs across the 14 intent_type
// values. Used so the rest of the app can be built without a real Pinterest
// developer app. Image URLs are Unsplash CDN; descriptions are synthetic
// but plausible for the spec's enrichment prompt.

interface Seed {
  tag: string;
  description: string;
  board: string;
}

const SEEDS: Seed[] = [
  // warm beige / outfit
  { tag: "beige-linen", description: "warm beige linen blazer hanging in soft light", board: "soft wardrobe" },
  { tag: "neutral-outfit", description: "neutral wide-leg trousers and a cream knit", board: "soft wardrobe" },
  { tag: "linen-shirt", description: "rumpled white linen shirt on a chair", board: "soft wardrobe" },
  { tag: "wool-coat", description: "long camel wool coat on cobblestone", board: "soft wardrobe" },
  { tag: "knit-sweater", description: "oatmeal cable knit folded on a wooden bench", board: "soft wardrobe" },
  { tag: "trench-coat", description: "classic trench coat over jeans", board: "soft wardrobe" },
  // fabric / material
  { tag: "linen-fabric", description: "swatch of natural linen with selvage edge", board: "fabric library" },
  { tag: "wool-felt", description: "stacked wool felt pieces in earth tones", board: "fabric library" },
  { tag: "cotton-thread", description: "bobbin of unbleached cotton thread", board: "fabric library" },
  { tag: "silk-organza", description: "translucent silk organza catching window light", board: "fabric library" },
  { tag: "denim", description: "raw selvage denim folded", board: "fabric library" },
  // garment construction
  { tag: "sewing-pattern", description: "tissue sewing pattern laid out on a cutting table", board: "sewing" },
  { tag: "french-seam", description: "close-up of a finished french seam", board: "sewing" },
  { tag: "buttonhole", description: "hand-stitched buttonhole detail on linen", board: "sewing" },
  { tag: "pleated-skirt", description: "knife pleats pressed on a mid-length skirt", board: "sewing" },
  { tag: "pocket-detail", description: "patch pocket sewn onto a chambray apron", board: "sewing" },
  // interior styling
  { tag: "brass-lamp", description: "small brass lamp on a stack of art books", board: "home" },
  { tag: "linen-curtain", description: "natural linen curtain filtering afternoon light", board: "home" },
  { tag: "open-shelving", description: "open kitchen shelving with stoneware mugs", board: "home" },
  { tag: "wood-floor", description: "wide plank oak floor near a window", board: "home" },
  { tag: "reading-corner", description: "armchair beside a stack of paperbacks", board: "home" },
  { tag: "bedside-table", description: "ceramic bedside lamp and a worn novel", board: "home" },
  { tag: "rug-textured", description: "hand-woven jute rug on terracotta tile", board: "home" },
  // diy / craft
  { tag: "shibori", description: "indigo shibori dyed cotton drying on a line", board: "making things" },
  { tag: "macrame", description: "small macrame wall hanging in natural cotton", board: "making things" },
  { tag: "ceramic-pinch", description: "hand-pinched stoneware bowl drying", board: "making things" },
  { tag: "block-printing", description: "carved linoleum block beside printed cards", board: "making things" },
  { tag: "natural-dye", description: "avocado pit natural dye pot on a stove", board: "making things" },
  // color palette
  { tag: "palette-warm", description: "swatch card of warm terracotta and clay tones", board: "color" },
  { tag: "palette-cool", description: "soft cool grey and slate paint chips", board: "color" },
  { tag: "palette-green", description: "sage and olive paint sample arrangement", board: "color" },
  // food
  { tag: "sourdough", description: "deeply scored sourdough loaf cooling on a rack", board: "kitchen" },
  { tag: "soup-bowl", description: "ceramic bowl of root vegetable soup", board: "kitchen" },
  { tag: "tart", description: "rustic galette with stone fruit", board: "kitchen" },
  { tag: "salad-grain", description: "warm grain salad with herbs and lemon", board: "kitchen" },
  // kid project
  { tag: "kid-corner", description: "soft kid reading corner with low shelves", board: "kid room" },
  { tag: "wooden-toy", description: "carved wooden animal on a small rug", board: "kid room" },
  { tag: "kid-art", description: "child's painting taped to a wall", board: "kid room" },
  { tag: "felt-mobile", description: "felt mobile turning gently above a crib", board: "kid room" },
  // beauty
  { tag: "skincare-shelf", description: "minimal bathroom shelf with amber bottles", board: "self" },
  { tag: "hair-natural", description: "natural air-dried wavy hair in window light", board: "self" },
  // art
  { tag: "ink-sketch", description: "loose ink sketch of a still life", board: "art" },
  { tag: "watercolor", description: "watercolor study of pears on cream paper", board: "art" },
  { tag: "ceramic-vase", description: "tall hand-thrown vase with matte glaze", board: "art" },
  // photography
  { tag: "morning-light", description: "soft morning light across a kitchen table", board: "moodboard" },
  { tag: "shadows", description: "long window shadows on a white wall", board: "moodboard" },
  // travel
  { tag: "stone-village", description: "stone village street in soft afternoon light", board: "places" },
  { tag: "olive-grove", description: "olive grove on a hillside", board: "places" },
  // general aesthetic
  { tag: "still-life", description: "still life with bread, lemon, and linen", board: "everyday" },
  { tag: "garden-cut", description: "freshly cut garden flowers on a sink", board: "everyday" },
];

// Build out to ~80 by repeating with variation suffixes.
function expandSeeds(): Seed[] {
  const out: Seed[] = [];
  for (let i = 0; i < SEEDS.length; i++) {
    out.push(SEEDS[i]);
  }
  // ~30 extra variations
  for (let i = 0; i < 30; i++) {
    const base = SEEDS[i % SEEDS.length];
    out.push({
      ...base,
      tag: `${base.tag}-v${i}`,
      description: `${base.description}, again`,
    });
  }
  return out;
}

function imageUrlFor(seed: Seed, idx: number): string {
  // Unsplash Source returns a stable image for a given query+seed.
  // It serves a redirect to images.unsplash.com which Next/Image is configured to allow.
  const q = encodeURIComponent(seed.tag.replace(/-v\d+$/, "").replace(/-/g, " "));
  return `https://source.unsplash.com/600x800/?${q}&sig=${idx}`;
}

export const pinterestMock: PinterestProvider = {
  async exchangeCode(_code, _redirectUri): Promise<PinterestTokens> {
    return {
      access_token: "mock-access-token",
      refresh_token: "mock-refresh-token",
      pinterest_user_id: "mock-user",
      expires_at: null,
    };
  },

  async fetchBoards(_accessToken): Promise<RemoteBoard[]> {
    const seeds = expandSeeds();
    const boardSet = new Set(seeds.map((s) => s.board));
    return Array.from(boardSet).map((name, i) => ({
      pinterest_board_id: `mock-board-${i}`,
      name,
    }));
  },

  async *fetchAllPins(_accessToken): AsyncIterable<RemotePin[]> {
    const seeds = expandSeeds();
    const pageSize = 20;
    for (let i = 0; i < seeds.length; i += pageSize) {
      const page = seeds.slice(i, i + pageSize).map((seed, j) => {
        const idx = i + j;
        return {
          pinterest_pin_id: `mock-pin-${idx}`,
          image_url: imageUrlFor(seed, idx),
          source_url: `https://www.pinterest.com/pin/mock-${idx}`,
          pinterest_description: seed.description,
          pinterest_board_name: seed.board,
          saved_at: new Date(Date.now() - idx * 86_400_000).toISOString(),
        };
      });
      // Simulate API latency so the soft sync animation has time to breathe.
      await new Promise((r) => setTimeout(r, 150));
      yield page;
    }
  },

  async revoke(_accessToken): Promise<void> {
    // no-op for mock
  },
};
