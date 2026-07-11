import { z } from "zod";

/**
 * Mirrors the CaptureResult contract the analyze-capture Edge Function must
 * return. Shared by the client (validating captures.ai_result before
 * rendering the review screen) and the Edge Function (validating Claude's
 * JSON output before writing to the DB) so the two can never drift apart.
 */
export const captureSourceSchema = z.enum([
  "spond",
  "vigilo",
  "mykid",
  "kidplan",
  "skole",
  "vipps",
  "annet",
]);

export const homeSuggestionSchema = z.enum(["mamma", "pappa", "begge", "ukjent"]);

export const captureEventSchema = z.object({
  title: z.string().min(1),
  starts_at: z.string(),
  ends_at: z.string().optional(),
  location: z.string().optional(),
  kid_names: z.array(z.string()).optional(),
  home_suggestion: homeSuggestionSchema,
  home_reason: z.string(),
});

export const captureBagItemSchema = z.object({
  name: z.string().min(1),
  for_kid: z.string().optional(),
  due_date: z.string().optional(),
  travels_to: z.enum(["mamma", "pappa"]).optional(),
});

export const captureMoneyItemSchema = z.object({
  title: z.string().min(1),
  amount_nok: z.number().int().nonnegative(),
  vipps_number: z.string().optional(),
  due_date: z.string().optional(),
});

export const captureChoreSuggestionSchema = z.object({
  kid_name: z.string().min(1),
  title: z.string().min(1),
  hint: z.string().optional(),
});

export const captureResultSchema = z.object({
  summary: z.string().min(1),
  source_guess: captureSourceSchema,
  events: z.array(captureEventSchema),
  bag_items: z.array(captureBagItemSchema),
  money_items: z.array(captureMoneyItemSchema),
  chore_suggestions: z.array(captureChoreSuggestionSchema),
});

export type CaptureSource = z.infer<typeof captureSourceSchema>;
export type CaptureResult = z.infer<typeof captureResultSchema>;
export type CaptureEvent = z.infer<typeof captureEventSchema>;
export type CaptureBagItem = z.infer<typeof captureBagItemSchema>;
export type CaptureMoneyItem = z.infer<typeof captureMoneyItemSchema>;
export type CaptureChoreSuggestion = z.infer<typeof captureChoreSuggestionSchema>;
