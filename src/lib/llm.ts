import OpenAI from "openai";
import { InferenceClient } from "@huggingface/inference";
import { wrapOpenAI } from "langsmith/wrappers";

// ─── Validate required env vars at module load ────────────────────────────────
const requiredEnvVars = ["LLM_API_KEY", "LLM_BASE_URL", "LLM_MODEL", "EMBEDDING_MODEL"];
for (const key of requiredEnvVars) {
  if (!process.env[key] && process.env.NODE_ENV !== "development") {
    console.warn(`Warning: Missing required environment variable: ${key}`);
  }
}
if (!process.env.HF_TOKEN && !process.env.HF_API_KEY && process.env.NODE_ENV !== "development") {
  console.warn("Warning: Missing required environment variable: HF_TOKEN or HF_API_KEY");
}

/**
 * Provider-agnostic OpenAI-compatible LLM client.
 * Controlled entirely by environment variables:
 *   LLM_API_KEY  — your API key
 *   LLM_BASE_URL — provider base URL (e.g. https://api.openai.com/v1)
 *   LLM_MODEL    — model name (e.g. gpt-4o-mini, gemini-1.5-flash)
 *
 * Swap providers by only changing .env.local — zero code changes needed.
 */
const rawClient = new OpenAI({
  apiKey: process.env.LLM_API_KEY || "dummy_key",
  baseURL: process.env.LLM_BASE_URL || "https://dummy.com",
});

export const llmClient = wrapOpenAI(rawClient);

export const LLM_MODEL = process.env.LLM_MODEL || "dummy_model";
export const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "BAAI/bge-small-en-v1.5";
export const EMBEDDING_DIMENSIONS = parseInt(process.env.EMBEDDING_DIMENSIONS ?? "384", 10);

/**
 * HuggingFace Inference client for embedding generation.
 * Uses HF_TOKEN or HF_API_KEY env var.
 */
export const hfClient = new InferenceClient(process.env.HF_TOKEN || process.env.HF_API_KEY || "dummy_hf_key");

// ─── Helper: chat completion (non-streaming) ─────────────────────────────────
export async function chatCompletion(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options?: Partial<OpenAI.Chat.ChatCompletionCreateParamsNonStreaming>
): Promise<string> {
  const payloadSize = JSON.stringify(messages).length;
  console.log(`[LLM] Sending request to ${LLM_MODEL} at ${llmClient.baseURL}`);
  console.log(`[LLM] Payload size: ~${Math.round(payloadSize / 1024)} KB (${messages.length} messages)`);
  const startTime = Date.now();

  try {
    const response = await llmClient.chat.completions.create({
      model: LLM_MODEL,
      messages,
      ...options,
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[LLM] Successfully generated response in ${duration}s`);
    return response.choices[0]?.message?.content ?? "";
  } catch (error: any) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`[LLM] Request failed after ${duration}s`);
    console.error(`[LLM] Error Details:`, error.status, error.headers, error.message);
    throw error;
  }
}

// ─── Helper: generate embedding vector via HuggingFace Inference API ─────────
export async function generateEmbedding(text: string): Promise<number[]> {
  const truncated = text.slice(0, 4096); // HF models have shorter context windows

  const result = await hfClient.featureExtraction({
    model: EMBEDDING_MODEL,
    inputs: truncated,
  });

  // featureExtraction returns number[] | number[][] depending on the model.
  // For sentence-transformer / bi-encoder models the output is number[].
  // For batch inputs it's number[][].
  if (Array.isArray(result) && typeof result[0] === "number") {
    return result as number[];
  }
  // First element of a batch result
  if (Array.isArray(result) && Array.isArray(result[0])) {
    return result[0] as number[];
  }
  throw new Error(`Unexpected featureExtraction output shape from model: ${EMBEDDING_MODEL}`);
}
