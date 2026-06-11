import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { llmClient, LLM_MODEL, generateEmbedding } from "@/lib/llm";
import { searchDocs, ensureCollection } from "@/lib/qdrant";
import { buildRagChatPrompt, RAG_CHAT_SYSTEM_PROMPT } from "@/lib/prompts";

// Node.js runtime required — HuggingFace Inference and Qdrant client are Node-only
export const runtime = "nodejs";

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

    // 1. Ensure the Qdrant collection exists before searching
    await ensureCollection();

    // 2. Generate embedding for the user's question
    const queryVector = await generateEmbedding(latestMessage.content);

    // 3. Perform vector search in Qdrant, filtered by repoId
    const searchResults = await searchDocs(queryVector, repoId, 5);

    // If no docs found, return a helpful message rather than an empty RAG call
    if (searchResults.length === 0) {
      const noDocsStream = new ReadableStream({
        start(controller) {
          const msg = "I couldn't find any relevant documentation for your question in this repository. Make sure you have ingested the repository and generated documentation first.";
          controller.enqueue(new TextEncoder().encode(`0:${JSON.stringify(msg)}\n`));
          controller.close();
        },
      });
      return new Response(noDocsStream, { 
        headers: { 
          "Content-Type": "text/plain; charset=utf-8",
          "x-vercel-ai-data-stream": "v1"
        } 
      });
    }

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
        // Vercel AI SDK Protocol: Send message annotation with source references first
        if (contextDocs.length > 0) {
          const annotation = [{
            type: "references",
            data: contextDocs.map(d => ({ filePath: d.filePath, unitName: d.unitName }))
          }];
          controller.enqueue(new TextEncoder().encode(`8:${JSON.stringify(annotation)}\n`));
        }

        for await (const chunk of response) {
          const text = chunk.choices[0]?.delta?.content || "";
          if (text) {
             // Vercel AI SDK stream protocol format: 0:"text chunk"\n
             controller.enqueue(new TextEncoder().encode(`0:${JSON.stringify(text)}\n`));
          }
        }
        controller.close();
      }
    });

    return new Response(stream, { 
      headers: { 
        "Content-Type": "text/plain; charset=utf-8",
        "x-vercel-ai-data-stream": "v1"
      } 
    });

  } catch (error: any) {
    console.error("Chat API Error Detailed:", {
      message: error.message,
      status: error.status,
      data: error.data,
      url: error.url,
      stack: error.stack,
    });
    
    const errorMessage = error.data ? `API Error (${error.status}): ${JSON.stringify(error.data)}` : error.message;
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: error.data,
      url: error.url 
    }), { status: 500 });
  }
}
