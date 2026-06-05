import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateEmbedding } from "@/lib/llm";
import { upsertDocEmbedding } from "@/lib/qdrant";

export async function POST(req: NextRequest) {
  try {
    const { docId } = await req.json();

    if (!docId) {
      return NextResponse.json({ error: "Missing docId" }, { status: 400 });
    }

    const doc = await prisma.documentation.findUnique({
      where: { id: docId },
      include: { unit: true },
    });

    if (!doc || !doc.draftContent) {
      return NextResponse.json({ error: "Doc not found or no pending draft" }, { status: 404 });
    }

    // 1. Generate new vector embedding for the approved draft
    const vector = await generateEmbedding(doc.draftContent);

    // 2. Upsert to Qdrant (replaces old vector because we use the same qdrantPointId)
    const pointId = await upsertDocEmbedding(
      vector,
      {
        documentationId: doc.id,
        repoId: doc.unit.repoId,
        unitName: doc.unit.name,
        filePath: doc.unit.filePath,
        language: doc.unit.language,
        content: doc.draftContent, // Store the new text for RAG
      },
      doc.qdrantPointId || undefined
    );

    // 3. Promote draft to actual content, reset staleness and clear draft
    await prisma.documentation.update({
      where: { id: docId },
      data: {
        content: doc.draftContent,
        draftContent: null,
        staleness: "OK",
        qdrantPointId: pointId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Approve Draft Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
