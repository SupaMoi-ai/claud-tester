import {
  captureResultSchema,
  CaptureResult,
} from "../../../lib/ai/captureResultSchema.ts";

/**
 * Claude is instructed to return JSON only, but models sometimes wrap it in a
 * markdown code fence anyway — strip that defensively before parsing.
 */
function extractJsonText(text: string): string {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  if (fenced && fenced[1]) {
    return fenced[1].trim();
  }
  return text.trim();
}

/** Parses and validates Claude's raw text response against captureResultSchema. */
export function parseCaptureResponse(text: string): CaptureResult {
  const jsonText = extractJsonText(text);

  let raw: unknown;
  try {
    raw = JSON.parse(jsonText);
  } catch (err) {
    throw new Error(
      `Klarte ikke å tolke svaret fra Claude som JSON: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  const result = captureResultSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `Svaret fra Claude matchet ikke forventet format: ${result.error.message}`
    );
  }
  return result.data;
}
