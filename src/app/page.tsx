import { prisma } from "@/lib/db";
import { IngestForm } from "@/components/IngestForm";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Book, FileCode2, GitBranch, FolderOpen, ArrowRight, Terminal, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DeleteRepoButton } from "@/components/DeleteRepoButton";
import { GenerateDocsButton } from "@/components/GenerateDocsButton";
import { CheckUpdatesButton } from "@/components/CheckUpdatesButton";
import { AutoUpdatePoller } from "@/components/AutoUpdatePoller";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Fetch global stats and recent repos
  const [repoCount, unitCount, docCount, changeCount, repos] = await Promise.all([
    prisma.repository.count(),
    prisma.codeUnit.count(),
    prisma.documentation.count(),
    prisma.change.count(),
    prisma.repository.findMany({
      orderBy: { createdAt: "desc" },
      take: 5
    })
  ]);

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-4">
      {/* Header section with gradient mesh look */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900/20 via-indigo-900/10 to-transparent p-8 border border-white/5 shadow-2xl">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Sparkles className="w-24 h-24 text-primary animate-pulse" />
        </div>
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide border border-primary/20 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            AI-Powered Code Intelligence
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            AI Documentation Engine
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            Ingest GitHub codebases, auto-generate comprehensive Markdown documentation, track real-time changes, detect staleness, and query your docs with high-fidelity RAG.
          </p>
        </div>
      </div>

      {/* Grid of stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-80">Repositories</CardTitle>
            <GitBranch className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              {repoCount}
            </div>
          </CardContent>
        </Card>
        <Card className="glow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-80">Code Units</CardTitle>
            <FileCode2 className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              {unitCount}
            </div>
          </CardContent>
        </Card>
        <Card className="glow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-80">Docs Generated</CardTitle>
            <Book className="h-4 w-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              {docCount}
            </div>
          </CardContent>
        </Card>
        <Card className="glow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-80">Changes Tracked</CardTitle>
            <GitBranch className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              {changeCount}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Ingest Repository */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Terminal className="w-5 h-5 text-primary" />
            Ingest New Project
          </h2>
          <IngestForm />
        </div>
        
        {/* Recent Repositories */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-primary" />
            Recent Repositories
          </h2>
          <div className="space-y-3">
             {repos.length === 0 ? (
                <Card className="border border-dashed border-white/10 bg-white/[0.02]">
                   <CardContent className="p-8 flex flex-col items-center justify-center text-muted-foreground gap-2">
                      <FolderOpen className="w-8 h-8 opacity-40" />
                      <p className="text-sm">No repositories ingested yet.</p>
                   </CardContent>
                </Card>
             ) : (
                repos.map((repo) => (
                  <Card key={repo.id} className="glow-card bg-white/[0.02] border-white/5 overflow-hidden">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="space-y-1.5">
                        <h3 className="font-mono font-semibold text-sm hover:underline">
                          <Link href={`/docs?repoId=${repo.id}`}>
                            {repo.owner}/{repo.name}
                          </Link>
                        </h3>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
                          <span className="flex items-center gap-1">
                            <GitBranch className="w-3 h-3 text-purple-400" />
                            {repo.branch}
                          </span>
                          {repo.lastCommit && (
                            <span className="flex items-center gap-1">
                              <Terminal className="w-3 h-3 text-cyan-400" />
                              {repo.lastCommit.substring(0, 7)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckUpdatesButton repoId={repo.id} repoName={`${repo.owner}/${repo.name}`} />
                        <GenerateDocsButton repoId={repo.id} repoName={`${repo.owner}/${repo.name}`} />
                        <DeleteRepoButton repoId={repo.id} repoName={`${repo.owner}/${repo.name}`} />
                        <Link href={`/docs?repoId=${repo.id}`}>
                          <Button size="icon" variant="ghost" className="hover:translate-x-1 transition-transform">
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))
             )}
          </div>
        </div>
      </div>

      <AutoUpdatePoller repos={repos.map(r => ({ id: r.id, owner: r.owner, name: r.name }))} />
    </div>
  );
}
