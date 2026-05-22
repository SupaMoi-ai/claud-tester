import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { pinterest } from "@/lib/providers";

export interface SyncProgress {
  fetched: number;
  upserted: number;
  embedded: number;
  total?: number;
}

// Pulls all pins from Pinterest (mock or real), upserts them, enqueues
// embed jobs for any pin without an embedding. Yields progress so the
// onboarding sync animation can stream updates.
export async function* syncPinsForUser(
  userId: string,
  accessToken: string
): AsyncGenerator<SyncProgress> {
  const supabase = createSupabaseServiceClient();
  const pin = pinterest();

  let fetched = 0;
  let upserted = 0;

  for await (const page of pin.fetchAllPins(accessToken)) {
    fetched += page.length;

    const rows = page.map((p) => ({
      user_id: userId,
      pinterest_pin_id: p.pinterest_pin_id,
      image_url: p.image_url,
      source_url: p.source_url ?? null,
      pinterest_description: p.pinterest_description ?? null,
      pinterest_board_name: p.pinterest_board_name ?? null,
      saved_at: p.saved_at ?? null,
    }));

    const { data, error } = await supabase
      .from("pins")
      .upsert(rows, {
        onConflict: "user_id,pinterest_pin_id",
        ignoreDuplicates: false,
      })
      .select("id, clip_embedding");

    if (error) throw error;
    upserted += data?.length ?? 0;

    // Enqueue embed jobs for any pin that doesn't have an embedding yet.
    const needsEmbedding = (data ?? []).filter((r) => !r.clip_embedding);
    if (needsEmbedding.length > 0) {
      const jobs = needsEmbedding.map((r) => ({
        user_id: userId,
        kind: "embed" as const,
        payload: { pin_id: r.id },
      }));
      await supabase.from("sync_jobs").insert(jobs);
    }

    yield { fetched, upserted, embedded: 0 };
  }

  await supabase
    .from("pinterest_connections")
    .update({ last_pin_sync_at: new Date().toISOString() })
    .eq("user_id", userId);
}
