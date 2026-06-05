import { ChatInterface } from "@/components/ChatInterface";
import { RepoSelector } from "@/components/RepoSelector";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: { repoId?: string };
}) {
  const repos = await prisma.repository.findMany({
    orderBy: { name: "asc" },
  });

  const selectedRepoId = searchParams.repoId || (repos.length > 0 ? repos[0].id : undefined);

  if (repos.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <Card className="border-dashed border-white/10 bg-white/[0.01]">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center gap-2">
            <h2 className="text-xl font-semibold mb-2">No Repositories Ingested</h2>
            <p className="text-muted-foreground mb-4">You need to ingest a repository before you can chat with its documentation.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <MessageSquare className="w-8 h-8 text-primary" />
            AI Chat Assistant
          </h1>
          <p className="text-muted-foreground mt-1">Ask questions grounded strictly in the generated documentation.</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">Repo Context:</span>
          <RepoSelector repos={repos} defaultValue={selectedRepoId} />
        </div>
      </div>

      <ChatInterface repoId={selectedRepoId!} />
    </div>
  );
}
