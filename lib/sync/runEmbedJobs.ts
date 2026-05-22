import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { embedding } from "@/lib/providers";

const BATCH_SIZE = 10;

// Drains pending embed jobs for a user. Called from the sync route after
// upsert; safe to call repeatedly. Yields progress.
export async function* runEmbedJobs(
  userId: string
): AsyncGenerator<{ embedded: number; remaining: number }> {
  const supabase = createSupabaseServiceClient();
  const embed = embedding();

  let totalEmbedded = 0;

  while (true) {
    const { data: jobs, error } = await supabase
      .from("sync_jobs")
      .select("id, payload")
      .eq("user_id", userId)
      .eq("kind", "embed")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE);

    if (error) throw error;
    if (!jobs || jobs.length === 0) {
      yield { embedded: totalEmbedded, remaining: 0 };
      return;
    }

    // Mark batch as running
    const ids = jobs.map((j) => j.id);
    await supabase
      .from("sync_jobs")
      .update({ status: "running", updated_at: new Date().toISOString() })
      .in("id", ids);

    // Load the pins for the job payloads
    const pinIds = jobs.map((j) => (j.payload as { pin_id: string }).pin_id);
    const { data: pins } = await supabase
      .from("pins")
      .select("id, image_url")
      .in("id", pinIds);
    const pinMap = new Map((pins ?? []).map((p) => [p.id, p.image_url]));

    // Process the batch in parallel.
    const results = await Promise.allSettled(
      jobs.map(async (job) => {
        const pinId = (job.payload as { pin_id: string }).pin_id;
        const url = pinMap.get(pinId);
        if (!url) throw new Error(`Pin ${pinId} not found`);
        const vec = await embed.embedImage(url);
        return { jobId: job.id, pinId, vec };
      })
    );

    const okUpdates: Array<{ pinId: string; vec: number[] }> = [];
    const failJobs: Array<{ jobId: string; err: string }> = [];
    const doneJobs: string[] = [];

    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        okUpdates.push({ pinId: r.value.pinId, vec: r.value.vec });
        doneJobs.push(r.value.jobId);
      } else {
        failJobs.push({
          jobId: jobs[i].id,
          err: r.reason instanceof Error ? r.reason.message : String(r.reason),
        });
      }
    });

    // Persist embeddings. pgvector accepts the JS array via the bracketed
    // string format when sent through the JSON API.
    for (const { pinId, vec } of okUpdates) {
      await supabase
        .from("pins")
        .update({ clip_embedding: vectorLiteral(vec) })
        .eq("id", pinId);
    }

    if (doneJobs.length > 0) {
      await supabase
        .from("sync_jobs")
        .update({ status: "done", updated_at: new Date().toISOString() })
        .in("id", doneJobs);
    }

    for (const f of failJobs) {
      await supabase
        .from("sync_jobs")
        .update({
          status: "failed",
          last_error: f.err,
          attempts: 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", f.jobId);
    }

    totalEmbedded += okUpdates.length;

    const { count } = await supabase
      .from("sync_jobs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("kind", "embed")
      .eq("status", "pending");

    yield { embedded: totalEmbedded, remaining: count ?? 0 };
  }
}

// pgvector accepts vectors as the bracketed string `[0.1,0.2,...]`. Sending
// a plain JS array via PostgREST doesn't always work, but this string does.
export function vectorLiteral(vec: number[]): string {
  return `[${vec.map((n) => n.toFixed(6)).join(",")}]`;
}
