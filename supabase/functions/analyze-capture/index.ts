import { createClient } from "@supabase/supabase-js";
import { toOsloParts } from "../../../lib/custody/osloTime.ts";
import { CustodyOverride, CustodyPattern } from "../../../lib/custody/resolveHome.ts";
import { buildBytteplanContext, buildSystemPrompt, buildUserMessage } from "./prompt.ts";
import { callAnthropic, AnthropicImageSource } from "./anthropic.ts";
import { parseCaptureResponse } from "./parseResponse.ts";

const MEDIA_TYPE_BY_EXTENSION: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

function guessMediaType(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return MEDIA_TYPE_BY_EXTENSION[ext] ?? "image/png";
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Only POST is supported." }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const { capture_id: captureId } = (await req.json()) as { capture_id?: string };
    if (!captureId) {
      throw new Error("Mangler capture_id i forespørselen.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY er ikke satt.");
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: capture, error: captureError } = await supabase
      .from("captures")
      .select("*")
      .eq("id", captureId)
      .single();
    if (captureError || !capture) {
      throw new Error(captureError?.message ?? "Fant ikke fangsten.");
    }

    const [patternRes, overridesRes, membersRes] = await Promise.all([
      supabase
        .from("custody_patterns")
        .select("*")
        .eq("family_id", capture.family_id)
        .limit(1),
      supabase.from("custody_overrides").select("*").eq("family_id", capture.family_id),
      supabase
        .from("members")
        .select("display_name, role")
        .eq("family_id", capture.family_id)
        .eq("role", "child"),
    ]);
    if (patternRes.error) throw patternRes.error;
    if (overridesRes.error) throw overridesRes.error;
    if (membersRes.error) throw membersRes.error;

    const patternRow = patternRes.data?.[0];
    if (!patternRow) {
      throw new Error("Familien har ingen bytteplan (custody_patterns) satt opp ennå.");
    }

    const pattern: CustodyPattern = {
      pattern: patternRow.pattern,
      anchorDate: patternRow.anchor_date,
      handoverTime: patternRow.handover_time,
    };
    const overrides: CustodyOverride[] = (overridesRes.data ?? []).map((o) => ({
      date: o.date,
      home: o.home,
      note: o.note ?? undefined,
    }));
    const kidNames = (membersRes.data ?? []).map((m) => m.display_name);

    const { date: todayIso } = toOsloParts(new Date());
    const bytteplanContext = buildBytteplanContext(pattern, overrides, todayIso, 14);
    const systemPrompt = buildSystemPrompt(bytteplanContext, kidNames);
    const userMessage = buildUserMessage(capture.raw_text, Boolean(capture.image_path));

    let image: AnthropicImageSource | undefined;
    if (capture.image_path) {
      const { data: file, error: downloadError } = await supabase.storage
        .from("captures")
        .download(capture.image_path);
      if (downloadError || !file) {
        throw new Error(downloadError?.message ?? "Kunne ikke laste ned skjermbildet.");
      }
      const buffer = await file.arrayBuffer();
      image = {
        mediaType: guessMediaType(capture.image_path),
        base64Data: arrayBufferToBase64(buffer),
      };
    }

    const responseText = await callAnthropic(systemPrompt, userMessage, image);
    const result = parseCaptureResponse(responseText);

    const { error: updateError } = await supabase
      .from("captures")
      .update({ ai_result: result, status: "analyzed" })
      .eq("id", captureId);
    if (updateError) throw updateError;

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ukjent feil.";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
});
