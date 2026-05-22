import type { EmbeddingProvider } from "./interface";

// Skeleton Replicate CLIP implementation. Use krthr/clip-embeddings or any
// model that returns a 512-d float array. Replace MODEL_VERSION when wiring up.
const MODEL_VERSION =
  "krthr/clip-embeddings:1c0371070cb827ec3c7f2f28adcdde54b50dcd239aa6faea0bc98b174ef03fb4";

export const embeddingReplicate: EmbeddingProvider = {
  async embedImage(imageUrl: string): Promise<number[]> {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      throw new Error("Missing REPLICATE_API_TOKEN (PROVIDER_MODE=real)");
    }

    const createRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: MODEL_VERSION,
        input: { image: imageUrl },
      }),
    });
    if (!createRes.ok) {
      throw new Error(`Replicate create failed: ${createRes.status}`);
    }
    const created = (await createRes.json()) as {
      id: string;
      urls: { get: string };
    };

    // Simple polling loop. For production move to webhooks.
    for (let attempt = 0; attempt < 60; attempt++) {
      await new Promise((r) => setTimeout(r, 1000));
      const r = await fetch(created.urls.get, {
        headers: { Authorization: `Token ${token}` },
      });
      const j = (await r.json()) as {
        status: string;
        output?: { embedding: number[] };
        error?: string;
      };
      if (j.status === "succeeded" && j.output?.embedding) {
        return j.output.embedding;
      }
      if (j.status === "failed" || j.status === "canceled") {
        throw new Error(`Replicate prediction failed: ${j.error ?? j.status}`);
      }
    }
    throw new Error("Replicate prediction timed out");
  },
};
