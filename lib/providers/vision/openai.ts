import { ENRICHMENT_PROMPT } from "@/lib/prompts/enrichment";
import type { EnrichedPin, PinForEnrichment, VisionProvider } from "./interface";

// Skeleton GPT-4o vision implementation. Activated when PROVIDER_MODE=real.
export const visionOpenAI: VisionProvider = {
  async enrichPin(pin: PinForEnrichment): Promise<EnrichedPin> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("Missing OPENAI_API_KEY (PROVIDER_MODE=real)");

    const userPayload = JSON.stringify({
      pinterest_description: pin.pinterest_description,
      pinterest_board_name: pin.pinterest_board_name,
    });

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: ENRICHMENT_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: userPayload },
              { type: "image_url", image_url: { url: pin.image_url } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) throw new Error(`OpenAI enrichment failed: ${res.status}`);
    const json = (await res.json()) as {
      choices: { message: { content: string } }[];
    };
    return JSON.parse(json.choices[0].message.content) as EnrichedPin;
  },
};
