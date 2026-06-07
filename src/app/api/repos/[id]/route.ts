import { prisma } from "@/lib/db";
import { deleteRepoEmbeddings } from "@/lib/qdrant";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return new Response(JSON.stringify({ error: "Missing repository ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 1. Delete from Qdrant first (since it's a 3rd party API, if it fails, Postgres data remains)
    try {
      await deleteRepoEmbeddings(id);
      console.log(`[DeleteRepo] Wiped Qdrant embeddings for repo ${id}`);
    } catch (qdrantError: any) {
      console.error("[DeleteRepo] Failed to delete Qdrant embeddings:", qdrantError);
      // We will proceed to delete from Postgres anyway so the user isn't stuck with a ghost repo,
      // but in production we might want a dead-letter queue or retry mechanism.
    }

    // 2. Delete from Postgres (cascades CodeUnit, Documentation, and Change records automatically)
    await prisma.repository.delete({
      where: { id },
    });
    console.log(`[DeleteRepo] Wiped Postgres repository ${id}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[DeleteRepo] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to delete repository" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
