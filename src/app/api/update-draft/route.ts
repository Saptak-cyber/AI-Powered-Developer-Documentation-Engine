import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { chatCompletion } from "@/lib/llm";
import { buildUpdateDraftPrompt, UPDATE_DRAFT_SYSTEM_PROMPT } from "@/lib/prompts";

export async function POST(req: NextRequest) {
  try {
    const { docId, changeId } = await req.json();

    if (!docId) {
      return NextResponse.json({ error: "Missing docId" }, { status: 400 });
    }

    const doc = await prisma.documentation.findUnique({
      where: { id: docId },
      include: { unit: true },
    });

    if (!doc) {
      return NextResponse.json({ error: "Doc not found" }, { status: 404 });
    }

    let change = null;
    if (changeId) {
      change = await prisma.change.findUnique({ where: { id: changeId } });
    } else {
      // Find the most recent change affecting this doc
      const recentChanges = await prisma.change.findMany({
        where: { repoId: doc.unit.repoId },
        orderBy: { detectedAt: "desc" },
        take: 10,
      });
      change = recentChanges.find(c => {
        const affected = JSON.parse(c.affectedDocs as string || "[]");
        return affected.includes(docId);
      });
    }

    if (!change) {
      return NextResponse.json({ error: "No relevant code change found for this documentation" }, { status: 404 });
    }

    // A real implementation would extract the specific diff chunk for this unit from change.diffContent
    // For simplicity, we pass the full diff and rely on the LLM's context window.
    const prompt = buildUpdateDraftPrompt(
      doc.content,
      "// Old code not stored historically in this implementation to save space",
      doc.unit.rawCode,
      change.diffContent || ""
    );

    const draftContent = await chatCompletion([
      { role: "system", content: UPDATE_DRAFT_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ]);

    await prisma.documentation.update({
      where: { id: docId },
      data: { draftContent },
    });

    return NextResponse.json({ success: true, draftContent });
  } catch (error: any) {
    console.error("Update Draft Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
