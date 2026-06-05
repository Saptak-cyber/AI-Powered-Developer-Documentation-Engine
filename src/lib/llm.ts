import OpenAI from "openai";

// ─── Validate required env vars at module load ────────────────────────────────
const requiredEnvVars = ["LLM_API_KEY", "LLM_BASE_URL", "LLM_MODEL", "EMBEDDING_MODEL"];
for (const key of requiredEnvVars) {
  if (!process.env[key] && process.env.NODE_ENV !== "development") {
    console.warn(`Warning: Missing required environment variable: ${key}`);
  }
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
export const llmClient = new OpenAI({
  apiKey: process.env.LLM_API_KEY || "dummy_key",
  baseURL: process.env.LLM_BASE_URL || "https://dummy.com",
});

export const LLM_MODEL = process.env.LLM_MODEL || "dummy_model";
export const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "dummy_embedding_model";
export const EMBEDDING_DIMENSIONS = parseInt(process.env.EMBEDDING_DIMENSIONS ?? "1536", 10);

// ─── Helper: chat completion (non-streaming) ─────────────────────────────────
export async function chatCompletion(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options?: Partial<OpenAI.Chat.ChatCompletionCreateParamsNonStreaming>
): Promise<string> {
  const response = await llmClient.chat.completions.create({
    model: LLM_MODEL,
    messages,
    ...options,
  });
  return response.choices[0]?.message?.content ?? "";
}

// ─── Helper: generate embedding vector ───────────────────────────────────────
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await llmClient.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, 8000), // Safety truncation for token limits
  });
  return response.data[0].embedding;
}
