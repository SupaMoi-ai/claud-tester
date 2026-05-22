import { pinterestMock } from "./pinterest/mock";
import { pinterestReal } from "./pinterest/real";
import type { PinterestProvider } from "./pinterest/interface";

import { embeddingMock } from "./embedding/mock";
import { embeddingReplicate } from "./embedding/replicate";
import type { EmbeddingProvider } from "./embedding/interface";

import { visionMock } from "./vision/mock";
import { visionOpenAI } from "./vision/openai";
import type { VisionProvider } from "./vision/interface";

import { llmMock } from "./llm/mock";
import { llmOpenAI } from "./llm/openai";
import type { LLMProvider } from "./llm/interface";

type Mode = "mock" | "real";

function mode(): Mode {
  return process.env.PROVIDER_MODE === "real" ? "real" : "mock";
}

export function pinterest(): PinterestProvider {
  return mode() === "real" ? pinterestReal : pinterestMock;
}

export function embedding(): EmbeddingProvider {
  return mode() === "real" ? embeddingReplicate : embeddingMock;
}

export function vision(): VisionProvider {
  return mode() === "real" ? visionOpenAI : visionMock;
}

export function llm(): LLMProvider {
  return mode() === "real" ? llmOpenAI : llmMock;
}

export function providerMode(): Mode {
  return mode();
}
