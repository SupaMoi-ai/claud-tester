import { PROJECT_BUILD_PROMPT } from "@/lib/prompts/projectBuild";
import { WHISPER_DETECT_PROMPT } from "@/lib/prompts/whisperDetect";
import type {
  EnrichedSeed,
  LLMProvider,
  ProjectShape,
  WhisperShape,
} from "./interface";
import { sanitiseLabel } from "./interface";

// Skeleton GPT-4o-mini implementation. Activated when PROVIDER_MODE=real.
export const llmOpenAI: LLMProvider = {
  async buildProject(seed, candidates): Promise<ProjectShape> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("Missing OPENAI_API_KEY (PROVIDER_MODE=real)");

    const payload = JSON.stringify({ seed, candidates });
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: PROJECT_BUILD_PROMPT },
          { role: "user", content: payload },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI buildProject failed: ${res.status}`);
    const json = (await res.json()) as {
      choices: { message: { content: string } }[];
    };
    const parsed = JSON.parse(json.choices[0].message.content) as ProjectShape;
    parsed.label = sanitiseLabel(parsed.label);
    return parsed;
  },

  async detectWhisper(samples): Promise<WhisperShape> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("Missing OPENAI_API_KEY (PROVIDER_MODE=real)");

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: WHISPER_DETECT_PROMPT },
          { role: "user", content: JSON.stringify(samples) },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI whisper failed: ${res.status}`);
    const json = (await res.json()) as {
      choices: { message: { content: string } }[];
    };
    return JSON.parse(json.choices[0].message.content) as WhisperShape;
  },
};
