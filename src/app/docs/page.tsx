import { prisma } from "@/lib/db";
import { DocCard } from "@/components/DocCard";
import { Input } from "@/components/ui/input";
import { Search, AlertCircle, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Staleness } from "@prisma/client";

import { DocsFilterForm } from "@/components/DocsFilterForm";

export const dynamic = "force-dynamic";

export default async function DocsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; staleness?: string; repoId?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || "";
  const stalenessFilter = params.staleness || "ALL";
  const selectedRepoId = params.repoId || "ALL";

  // Fetch all repositories for filter dropdown
  const repos = await prisma.repository.findMany({
    orderBy: { createdAt: "desc" },
  });

  // ── Build where clause for CodeUnit ────────────────────────────────────────
  const unitWhere: any = {};

  if (selectedRepoId !== "ALL") {
    unitWhere.repoId = selectedRepoId;
  }

  if (query) {
    unitWhere.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { filePath: { contains: query, mode: "insensitive" } },
    ];
  }

  // ── Staleness filter: push to DB level so pagination stays accurate ─────────
  // We filter via the nested Documentation relation rather than in-memory.
  if (stalenessFilter !== "ALL") {
    const validStatuses: Staleness[] = [
      "OK",
      "REVIEW_RECOMMENDED",
      "POTENTIALLY_OUTDATED",
      "BROKEN",
    ];
    if (validStatuses.includes(stalenessFilter as Staleness)) {
      // Only return units that have a doc AND that doc has the requested staleness
      unitWhere.doc = {
        staleness: stalenessFilter as Staleness,
      };
    }
  }

  const units = await prisma.codeUnit.findMany({
    where: unitWhere,
    include: {
      doc: true,
      repo: true,
    },
    orderBy: { name: "asc" },
    take: 100,
  });

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
      <DocsFilterForm 
        initialQuery={query}
        initialRepoId={selectedRepoId}
        initialStaleness={stalenessFilter}
        repos={repos}
      />

      {/* Result count hint */}
      <p className="text-xs text-muted-foreground font-mono">
        Showing {units.length} result{units.length !== 1 ? "s" : ""}
        {stalenessFilter !== "ALL" ? ` · filtered by status: ${stalenessFilter}` : ""}
        {selectedRepoId !== "ALL" ? ` · 1 repository` : ""}
      </p>

      {/* Docs Grid */}
      {units.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border border-dashed border-white/10 rounded-2xl bg-white/[0.01] flex flex-col items-center justify-center gap-3">
          <AlertCircle className="w-10 h-10 opacity-30 text-primary" />
          <p className="font-mono text-sm">No documentation found matching your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {units.map((unit: any) => (
            <DocCard key={unit.id} unit={unit as any} />
          ))}
        </div>
      )}
    </div>
  );
}
