import { parseCaptureResponse } from "./parseResponse.ts";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertThrows(fn: () => unknown, message: string): void {
  try {
    fn();
  } catch {
    return;
  }
  throw new Error(`Assertion failed (expected throw): ${message}`);
}

const VALID_RESPONSE = JSON.stringify({
  summary: "Fotballtrening for Ellie tirsdag.",
  source_guess: "spond",
  events: [
    {
      title: "Fotballtrening",
      starts_at: "2026-07-14T17:00:00+02:00",
      home_suggestion: "pappa",
      home_reason: "Tirsdag er en Pappa-dag.",
    },
  ],
  bag_items: [],
  money_items: [],
  chore_suggestions: [],
});

Deno.test("parseCaptureResponse parses plain JSON text", () => {
  const result = parseCaptureResponse(VALID_RESPONSE);
  assert(result.summary === "Fotballtrening for Ellie tirsdag.", "summary mismatch");
  assert(result.events.length === 1, "expected one event");
});

Deno.test("parseCaptureResponse strips a markdown JSON code fence", () => {
  const fenced = "Her er resultatet:\n```json\n" + VALID_RESPONSE + "\n```";
  const result = parseCaptureResponse(fenced);
  assert(result.source_guess === "spond", "source_guess mismatch after de-fencing");
});

Deno.test("parseCaptureResponse throws a clear error on invalid JSON", () => {
  assertThrows(() => parseCaptureResponse("not json at all"), "invalid JSON should throw");
});

Deno.test("parseCaptureResponse throws a clear error on JSON that fails schema validation", () => {
  const badShape = JSON.stringify({ summary: "ok" }); // missing required fields
  assertThrows(() => parseCaptureResponse(badShape), "schema-invalid JSON should throw");
});
