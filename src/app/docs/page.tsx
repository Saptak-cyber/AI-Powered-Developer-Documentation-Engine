import { prisma } from "@/lib/db";
import { DocCard } from "@/components/DocCard";
import { Input } from "@/components/ui/input";
import { Search, GitBranch, AlertCircle, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function DocsPage({
  searchParams,
}: {
  searchParams: { q?: string; staleness?: string; repoId?: string };
}) {
  const query = searchParams.q || "";
  const stalenessFilter = searchParams.staleness || "ALL";
  const selectedRepoId = searchParams.repoId || "ALL";

  // Fetch all repositories for filter dropdown
  const repos = await prisma.repository.findMany({
    orderBy: { createdAt: "desc" }
  });

  // Build where clause
  const where: any = {};
  if (selectedRepoId !== "ALL") {
    where.repoId = selectedRepoId;
  }
  if (query) {
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { filePath: { contains: query, mode: "insensitive" } },
    ];
  }

  const units = await prisma.codeUnit.findMany({
    where,
    include: {
      doc: true,
      repo: true
    },
    orderBy: {
      name: "asc"
    },
    take: 50,
  });

  // Filter in memory for staleness
  let filteredUnits = units;
  if (stalenessFilter !== "ALL") {
    filteredUnits = units.filter((u: any) => u.doc?.staleness === stalenessFilter);
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
          <BookOpen className="w-8 h-8 text-primary" />
          Documentation Browser
        </h1>
        <p className="text-muted-foreground mt-1">
          Browse, search, and inspect documentation, parameters, and auto-generated API details.
        </p>
      </div>

      {/* Filter Form */}
      <form method="GET" action="/docs" className="flex flex-col lg:flex-row gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
        {/* Search Query */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            name="q"
            placeholder="Search by function, class or file path..." 
            className="pl-9 bg-slate-950/40 border-white/5 focus:border-primary"
            defaultValue={query}
          />
        </div>

        {/* Repository Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">Repo:</span>
            <select 
              name="repoId"
              defaultValue={selectedRepoId}
              className="h-10 px-3 bg-slate-950 border border-white/5 rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-mono w-full sm:w-48"
            >
              <option value="ALL">All Repositories</option>
              {repos.map((repo) => (
                <option key={repo.id} value={repo.id}>
                  {repo.owner}/{repo.name}
                </option>
              ))}
            </select>
          </div>

          {/* Staleness Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">Status:</span>
            <select 
              name="staleness"
              defaultValue={stalenessFilter}
              className="h-10 px-3 bg-slate-950 border border-white/5 rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-mono w-full sm:w-48"
            >
              <option value="ALL">All Statuses</option>
              <option value="OK">OK</option>
              <option value="REVIEW_RECOMMENDED">Review Recommended</option>
              <option value="POTENTIALLY_OUTDATED">Potentially Outdated</option>
              <option value="BROKEN">Broken</option>
            </select>
          </div>

          {/* Submit Action */}
          <Button type="submit" className="w-full sm:w-auto px-6 font-semibold">
            Apply Filters
          </Button>
        </div>
      </form>

      {/* Docs Grid */}
      {filteredUnits.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border border-dashed border-white/10 rounded-2xl bg-white/[0.01] flex flex-col items-center justify-center gap-3">
          <AlertCircle className="w-10 h-10 opacity-30 text-primary" />
          <p className="font-mono text-sm">No documentation found matching your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUnits.map((unit: any) => (
            <DocCard key={unit.id} unit={unit as any} />
          ))}
        </div>
      )}
    </div>
  );
}
