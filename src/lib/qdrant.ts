import { QdrantClient } from "@qdrant/js-client-rest";
import { v4 as uuidv4 } from "uuid";
import { EMBEDDING_DIMENSIONS } from "./llm";

// ─── Singleton Qdrant client ──────────────────────────────────────────────────
const globalForQdrant = globalThis as unknown as { qdrant: QdrantClient };

export const qdrant =
  globalForQdrant.qdrant ??
  new QdrantClient({
    url: process.env.QDRANT_URL!,
    apiKey: process.env.QDRANT_API_KEY!,
    checkCompatibility: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalForQdrant.qdrant = qdrant;
}

export const COLLECTION_NAME = process.env.QDRANT_COLLECTION ?? "doc_embeddings";

// ─── Payload type stored alongside each vector ───────────────────────────────
export interface DocPayload {
  documentationId: string;
  repoId: string;
  unitName: string;
  filePath: string;
  language: string;
  content: string; // Full Markdown text (used for RAG context injection)
}

// ─── Ensure collection exists (called once at app startup / first use) ────────
export async function ensureCollection(): Promise<void> {
  const collections = await qdrant.getCollections();
  const exists = collections.collections.some((c) => c.name === COLLECTION_NAME);

  if (!exists) {
    await qdrant.createCollection(COLLECTION_NAME, {
      vectors: {
        size: EMBEDDING_DIMENSIONS,
        distance: "Cosine",
      },
    });
    
    // Create payload index for repoId filtering to prevent Bad Request errors during search
    await qdrant.createPayloadIndex(COLLECTION_NAME, {
      field_name: "repoId",
      field_schema: "keyword",
      wait: true,
    });
    
    console.log(`[Qdrant] Created collection: ${COLLECTION_NAME} with repoId index`);
  }
}

// ─── Upsert a single document embedding ──────────────────────────────────────
export async function upsertDocEmbedding(
  vector: number[],
  payload: DocPayload,
  existingPointId?: string
): Promise<string> {
  const pointId = existingPointId ?? uuidv4();

  await qdrant.upsert(COLLECTION_NAME, {
    wait: true,
    points: [{ id: pointId, vector, payload: payload as unknown as Record<string, unknown> }],
  });

  return pointId;
}

// ─── Semantic search (RAG retrieval) ─────────────────────────────────────────
export async function searchDocs(
  queryVector: number[],
  repoId: string,
  topK = 5
): Promise<Array<{ score: number; payload: DocPayload; pointId: string }>> {
  const results = await qdrant.search(COLLECTION_NAME, {
    vector: queryVector,
    limit: topK,
    filter: {
      must: [{ key: "repoId", match: { value: repoId } }],
    },
    with_payload: true,
  });

  return results.map((r) => ({
    score: r.score,
    payload: r.payload as unknown as DocPayload,
    pointId: String(r.id),
  }));
}

// ─── Delete a point (when a CodeUnit is removed) ─────────────────────────────
export async function deleteDocEmbedding(pointId: string): Promise<void> {
  await qdrant.delete(COLLECTION_NAME, {
    wait: true,
    points: [pointId],
  });
}

// ─── Delete all points for a given repo (Cascading cleanup) ────────────────
export async function deleteRepoEmbeddings(repoId: string): Promise<void> {
  await qdrant.delete(COLLECTION_NAME, {
    wait: true,
    filter: {
      must: [{ key: "repoId", match: { value: repoId } }],
    },
  });
}
