import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { llmClient, LLM_MODEL, generateEmbedding } from "@/lib/llm";
import { searchDocs } from "@/lib/qdrant";
import { buildRagChatPrompt, RAG_CHAT_SYSTEM_PROMPT } from "@/lib/prompts";

export const runtime = "edge"; // Run on Edge for streaming performance

export async function POST(req: Request) {
  try {
    const { messages, repoId } = await req.json();

    if (!repoId) {
      return new Response(JSON.stringify({ error: "Missing repoId" }), { status: 400 });
    }

    // Extract the latest user question
    const latestMessage = messages[messages.length - 1];
    if (!latestMessage || latestMessage.role !== "user") {
      return new Response(JSON.stringify({ error: "Invalid messages format" }), { status: 400 });
    }

    // 1. Generate embedding for the user's question
    const queryVector = await generateEmbedding(latestMessage.content);

    // 2. Perform vector search in Qdrant, filtered by repoId
    const searchResults = await searchDocs(queryVector, repoId, 5);

    // 3. Extract the text content from the payloads
    const contextDocs = searchResults.map(r => ({
      unitName: r.payload.unitName,
      filePath: r.payload.filePath,
      content: r.payload.content,
    }));

    // 4. Build the RAG prompt
    const systemPromptContent = buildRagChatPrompt(latestMessage.content, contextDocs);

    // Replace the user's last message with our augmented RAG prompt
    // Keep conversation history intact for follow-up context
    const augmentedMessages = [
      { role: "system", content: RAG_CHAT_SYSTEM_PROMPT },
      ...messages.slice(0, -1),
      { role: "user", content: systemPromptContent }
    ];

    // 5. Setup provider and call LLM with streaming enabled
    const response = await llmClient.chat.completions.create({
      model: LLM_MODEL,
      stream: true,
      messages: augmentedMessages as any,
    });

    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of response) {
          const text = chunk.choices[0]?.delta?.content || "";
          if (text) {
             controller.enqueue(new TextEncoder().encode(text));
          }
        }
        controller.close();
      }
    });

    return new Response(stream, { headers: { "Content-Type": "text/plain" } });

  } catch (error: any) {
    console.error("Chat API Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
