export interface AnthropicImageSource {
  mediaType: string;
  base64Data: string;
}

interface AnthropicContentBlock {
  type: string;
  text?: string;
}

interface AnthropicMessagesResponse {
  content?: AnthropicContentBlock[];
}

/** Thin wrapper around the Anthropic Messages API, vision-capable. */
export async function callAnthropic(
  systemPrompt: string,
  userText: string,
  image?: AnthropicImageSource
): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY er ikke satt som Edge Function-hemmelighet.");
  }

  const content: Record<string, unknown>[] = [];
  if (image) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: image.mediaType, data: image.base64Data },
    });
  }
  content.push({ type: "text", text: userText });

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API-feil (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as AnthropicMessagesResponse;
  const textBlock = data.content?.find((block) => block.type === "text");
  if (!textBlock?.text) {
    throw new Error("Anthropic-svaret inneholdt ingen tekst.");
  }
  return textBlock.text;
}
