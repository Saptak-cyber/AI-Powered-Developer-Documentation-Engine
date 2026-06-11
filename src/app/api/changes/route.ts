import { NextRequest, NextResponse } from "next/server";
import { processRepoChanges } from "@/lib/changes";

export async function POST(req: NextRequest) {
  try {
    const { repoId } = await req.json();

    if (!repoId) {
      return NextResponse.json({ error: "Missing repoId" }, { status: 400 });
    }

    const detectedChanges = await processRepoChanges(repoId);

    return NextResponse.json({
      success: true,
      newCommitsProcessed: detectedChanges,
      message: detectedChanges === 0 ? "No new commits found" : undefined
    });
  } catch (error: any) {
    console.error("Change Detection Error:", error);
    const status = error.message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
