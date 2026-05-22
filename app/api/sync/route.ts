import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { syncPinsForUser } from "@/lib/sync/syncPins";
import { runEmbedJobs } from "@/lib/sync/runEmbedJobs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Streams a Server-Sent Events feed so the onboarding sync animation can
// show progress. Each event is JSON-encoded progress data.
export async function GET() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("unauthorised", { status: 401 });
  }

  const svc = createSupabaseServiceClient();
  const { data: conn } = await svc
    .from("pinterest_connections")
    .select("access_token")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!conn) {
    return new Response("no pinterest connection", { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      }
      try {
        send("start", {});
        for await (const p of syncPinsForUser(user.id, conn.access_token)) {
          send("pins", p);
        }
        for await (const p of runEmbedJobs(user.id)) {
          send("embed", p);
        }
        send("done", {});
      } catch (err) {
        send("error", { message: err instanceof Error ? err.message : String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
