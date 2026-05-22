import { createSupabaseServiceClient } from "@/lib/supabase/server";

export interface NeighborPin {
  id: string;
  pinterest_pin_id: string;
  image_url: string;
  pinterest_description: string | null;
  pinterest_board_name: string | null;
  distance: number; // cosine distance, 0 = identical, 2 = opposite
}

// Finds up to `limit` un-projected pins for `userId` closest to `seedPinId`
// in CLIP embedding space. Filters to similarity > 0.65, i.e. distance < 0.35.
export async function findNeighbors(
  userId: string,
  seedPinId: string,
  limit = 30
): Promise<NeighborPin[]> {
  const supabase = createSupabaseServiceClient();

  // Look up the seed embedding.
  const { data: seed, error: seedErr } = await supabase
    .from("pins")
    .select("id, clip_embedding")
    .eq("id", seedPinId)
    .eq("user_id", userId)
    .maybeSingle();

  if (seedErr) throw seedErr;
  if (!seed?.clip_embedding) {
    throw new Error("Seed pin has no embedding yet");
  }

  // pgvector returns the embedding as the bracketed string format.
  // The RPC below does the heavy lifting; we ship it as inline SQL via
  // the supabase-js raw query helper.
  const seedVec = Array.isArray(seed.clip_embedding)
    ? `[${seed.clip_embedding.join(",")}]`
    : (seed.clip_embedding as unknown as string);

  // Use a SECURITY DEFINER function would be cleaner, but for foundation
  // we run the query directly against the table.
  const { data, error } = await supabase.rpc("find_pin_neighbors", {
    p_user_id: userId,
    p_seed_id: seedPinId,
    p_seed_vec: seedVec,
    p_limit: limit,
  });

  if (error) throw error;

  return (data ?? []).filter((row: NeighborPin) => row.distance < 0.35);
}
