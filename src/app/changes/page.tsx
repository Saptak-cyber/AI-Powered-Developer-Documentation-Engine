import { prisma } from "@/lib/db";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitCommit, Clock, ArrowRight, Layers } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ChangesPage() {
  const changes = await prisma.change.findMany({
    orderBy: { detectedAt: "desc" },
    include: { repo: true },
    take: 50,
  });

  // Extract all affected doc IDs to fetch their details in a single query
  const affectedDocIdsSet = new Set<string>();
  changes.forEach((change: any) => {
    try {
      const parsed = JSON.parse(change.affectedDocs as string);
      if (Array.isArray(parsed)) {
        parsed.forEach((id) => affectedDocIdsSet.add(id));
      }
    } catch (e) {}
  });

  const affectedDocsDetails = await prisma.documentation.findMany({
    where: {
      id: { in: Array.from(affectedDocIdsSet) },
    },
    include: {
      unit: true,
    },
  });

  const affectedDocsMap = new Map(affectedDocsDetails.map((d) => [d.id, d]));

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
          <Layers className="w-8 h-8 text-primary" />
          Change History
        </h1>
        <p className="text-muted-foreground mt-1">
          Timeline of detected codebase changes and their impact on automatically-updated documentation.
        </p>
      </div>

      {changes.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border border-dashed border-white/10 rounded-2xl bg-white/[0.01] flex flex-col items-center justify-center gap-3">
          <GitCommit className="w-10 h-10 opacity-30 text-primary" />
          <p className="font-mono text-sm">No changes tracked yet. Ingest a repository and run commit analysis.</p>
        </div>
      ) : (
        <div className="relative border-l border-white/10 ml-4 pl-6 space-y-6">
          {changes.map((change: any) => {
            let affectedDocIds: string[] = [];
            try {
              const parsed = JSON.parse(change.affectedDocs as string);
              affectedDocIds = Array.isArray(parsed) ? parsed : [];
            } catch (e) {}

            return (
              <div key={change.id} className="relative">
                {/* Timeline node */}
                <div className="absolute -left-[31px] top-1.5 bg-background border border-white/10 rounded-full p-1 w-5 h-5 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>

                <Card className="glow-card bg-white/[0.02] border-white/5">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                      <div className="flex items-center gap-2">
                        <GitCommit className="w-5 h-5 text-muted-foreground" />
                        <CardTitle className="text-base font-semibold leading-none flex items-center gap-2">
                          <span className="font-mono text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded text-xs">
                            {change.commitSha.substring(0, 7)}
                          </span>
                          {change.commitMsg.split("\n")[0]}
                        </CardTitle>
                      </div>
                      {affectedDocIds.length > 0 ? (
                        <Badge variant="destructive" className="bg-red-500/10 text-red-400 border-red-500/20 text-xs shrink-0">
                          {affectedDocIds.length} Docs Affected
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-white/5 text-muted-foreground border-transparent text-xs shrink-0">
                          0 Docs Affected
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(change.detectedAt).toLocaleString()}
                      </span>
                      <span>•</span>
                      <span>{change.author}</span>
                      <span>•</span>
                      <span className="text-purple-400">
                        {change.repo.owner}/{change.repo.name}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  
                  {affectedDocIds.length > 0 && (
                    <CardContent className="pt-0 pb-4">
                      <div className="space-y-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">
                          Affected Documentation:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {affectedDocIds.map((docId: string) => {
                            const docDetail = affectedDocsMap.get(docId);
                            if (!docDetail) return null;
                            return (
                              <Link key={docId} href={`/docs/${docDetail.unit.id}`} className="inline-flex">
                                <Badge variant="outline" className="bg-purple-950/20 text-purple-300 border-purple-500/30 hover:border-purple-400 transition-colors font-mono text-[11px] px-2 py-0.5 flex items-center gap-1 cursor-pointer">
                                  {docDetail.unit.name}
                                  <ArrowRight className="w-2.5 h-2.5 opacity-60" />
                                </Badge>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
