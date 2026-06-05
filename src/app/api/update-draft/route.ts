import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { chatCompletion } from "@/lib/llm";
import { buildUpdateDraftPrompt, UPDATE_DRAFT_SYSTEM_PROMPT } from "@/lib/prompts";

export async function POST(req: NextRequest) {
  try {
    const { docId, changeId } = await req.json();

    if (!docId || !changeId) {
      return NextResponse.json({ error: "Missing docId or changeId" }, { status: 400 });
    }

    const doc = await prisma.documentation.findUnique({
      where: { id: docId },
      include: { unit: true },
    });

    const change = await prisma.change.findUnique({
      where: { id: changeId },
    });

    if (!doc || !change) {
      return NextResponse.json({ error: "Doc or Change not found" }, { status: 404 });
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
