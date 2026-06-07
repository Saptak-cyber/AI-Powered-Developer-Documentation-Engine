import { prisma } from "@/lib/db";
import { PenTool, SearchX } from "lucide-react";
import { DraftCard } from "./DraftCard";

export const dynamic = "force-dynamic";

export default async function DraftsPage() {
  const drafts = await prisma.documentation.findMany({
    where: {
      draftContent: {
        not: null,
      },
    },
    include: {
      unit: {
        include: {
          repo: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-mono tracking-tight flex items-center gap-2">
          <PenTool className="w-8 h-8 text-purple-500" />
          Pending Drafts
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Review and approve AI-generated documentation drafts. These drafts were automatically generated to reflect recent code changes in your repositories.
        </p>
      </div>

      {drafts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-center border rounded-lg bg-card/50 shadow-sm border-dashed">
          <SearchX className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-medium">No pending drafts</h3>
          <p className="text-muted-foreground mt-1 max-w-sm">
            All your documentation is up to date, or you need to run "Check for Updates" and "Suggest AI Fix" on stale docs.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {drafts.map((doc) => (
            <DraftCard key={doc.id} doc={doc} />
          ))}
        </div>
      )}
    </div>
  );
}
