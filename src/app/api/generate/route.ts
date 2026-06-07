import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { chatCompletion, generateEmbedding } from "@/lib/llm";
import { upsertDocEmbedding, ensureCollection } from "@/lib/qdrant";
import { buildGenerateDocPrompt, GENERATE_DOCS_SYSTEM_PROMPT } from "@/lib/prompts";

export async function POST(req: NextRequest) {
  try {
    const { repoId, forceRebuild = false } = await req.json();

    if (!repoId) {
      return NextResponse.json({ error: "Missing repoId" }, { status: 400 });
    }

    // Ensure Qdrant collection is ready
    await ensureCollection();

    // Fetch CodeUnits that need documentation
    const whereClause: any = { repoId };
    if (!forceRebuild) {
      // Only process units that don't have documentation yet
      whereClause.doc = { is: null };
    }

    const units = await prisma.codeUnit.findMany({
      where: whereClause,
      include: {
        doc: true,
      },
    });

    let generatedCount = 0;

    for (const unit of units) {
      try {
        // 1. Generate Markdown documentation using LLM
        const prompt = buildGenerateDocPrompt(
          unit.name,
          unit.type,
          unit.language,
          unit.rawCode,
          unit.docstring
        );

        const markdownDoc = await chatCompletion([
          { role: "system", content: GENERATE_DOCS_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ]);

        // 2. Generate vector embedding for the resulting markdown
        const vector = await generateEmbedding(markdownDoc);

        // 3. Upsert to Neon DB
        let docRecord;
        if (unit.doc) {
          docRecord = await prisma.documentation.update({
            where: { id: unit.doc.id },
            data: {
              content: markdownDoc,
              staleness: "OK",
              updatedAt: new Date(),
            },
          });
        } else {
          docRecord = await prisma.documentation.create({
            data: {
              unitId: unit.id,
              content: markdownDoc,
              staleness: "OK",
            },
          });
        }

        // 4. Upsert to Qdrant Cloud
        const pointId = await upsertDocEmbedding(
          vector,
          {
            documentationId: docRecord.id,
            repoId: unit.repoId,
            unitName: unit.name,
            filePath: unit.filePath,
            language: unit.language,
            content: markdownDoc,
          },
          docRecord.qdrantPointId || undefined
        );

        // 5. Save the Qdrant point ID back to the documentation record
        await prisma.documentation.update({
          where: { id: docRecord.id },
          data: { qdrantPointId: pointId },
        });

        generatedCount++;
      } catch (err) {
        console.error(`Failed to generate doc for unit ${unit.name}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      totalUnitsProcessed: units.length,
      successfullyGenerated: generatedCount,
    });
  } catch (error: any) {
    console.error("Generate API Error Detailed:", {
      message: error.message,
      status: error.status,
      data: error.data,
      url: error.url,
      stack: error.stack,
    });
    
    const errorMessage = error.data ? `API Error (${error.status}): ${JSON.stringify(error.data)}` : error.message;
    
    return NextResponse.json({ 
      error: errorMessage,
      details: error.data,
      url: error.url
    }, { status: 500 });
  }
}
