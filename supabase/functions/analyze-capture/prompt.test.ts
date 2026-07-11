import { buildBytteplanContext, buildSystemPrompt, buildUserMessage } from "./prompt.ts";
import type { CustodyPattern } from "../../../lib/custody/resolveHome.ts";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// Mon-Thu pappa, Fri-Sun mamma, handover 16:00. Anchor 2026-07-06 is a Monday.
const DEMO_PATTERN: CustodyPattern = {
  pattern: ["pappa", "pappa", "pappa", "pappa", "mamma", "mamma", "mamma"],
  anchorDate: "2026-07-06",
  handoverTime: "16:00",
};

Deno.test("buildBytteplanContext lists 14 days by default, grounded in resolveHome", () => {
  const context = buildBytteplanContext(DEMO_PATTERN, [], "2026-07-06", 14);
  const lines = context.split("\n");
  assert(lines.length === 14, `expected 14 lines, got ${lines.length}`);
  assert(lines[0] === "2026-07-06 (mandag): Pappa", `unexpected first line: ${lines[0]}`);
  assert(lines[4] === "2026-07-10 (fredag): Mamma", `unexpected day-5 line: ${lines[4]}`);
});

Deno.test("buildBytteplanContext respects overrides over the pattern", () => {
  const context = buildBytteplanContext(
    DEMO_PATTERN,
    [{ date: "2026-07-07", home: "mamma" }],
    "2026-07-06",
    2
  );
  const lines = context.split("\n");
  assert(lines[1] === "2026-07-07 (tirsdag): Mamma", `override did not win: ${lines[1]}`);
});

Deno.test("buildSystemPrompt embeds the bytteplan context and kid names verbatim", () => {
  const context = buildBytteplanContext(DEMO_PATTERN, [], "2026-07-06", 3);
  const prompt = buildSystemPrompt(context, ["Ellie", "Eliyah"]);
  assert(prompt.includes("Ellie, Eliyah"), "kid names missing from prompt");
  assert(prompt.includes(context), "bytteplan context missing from prompt");
  assert(prompt.includes("UTELUKKENDE gyldig JSON"), "JSON-only instruction missing");
  assert(prompt.includes("home_suggestion"), "schema description missing home_suggestion");
});

Deno.test("buildSystemPrompt handles an empty kid list without crashing", () => {
  const prompt = buildSystemPrompt("2026-07-06 (mandag): Pappa", []);
  assert(prompt.includes("ukjent"), "should fall back to 'ukjent' with no kids");
});

Deno.test("buildUserMessage covers text-only, image-only, and text+image cases", () => {
  assert(
    buildUserMessage("Fotballtrening kl 17", false) ===
      "Her er teksten som skal analyseres:\n\nFotballtrening kl 17",
    "text-only case wrong"
  );
  assert(
    buildUserMessage(null, true).includes("skjermbilde"),
    "image-only case should mention skjermbilde"
  );
  assert(
    buildUserMessage("ekstra tekst", true).includes("ekstra tekst"),
    "text+image case should include the raw text"
  );
});
