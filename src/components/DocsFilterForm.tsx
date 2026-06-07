"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useTransition, useRef, useEffect, useState } from "react";

export function DocsFilterForm({
  initialQuery,
  initialRepoId,
  initialStaleness,
  repos,
}: {
  initialQuery: string;
  initialRepoId: string;
  initialStaleness: string;
  repos: { id: string; owner: string; name: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState(initialQuery);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "ALL") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    
    startTransition(() => {
      router.push(`/docs?${params.toString()}`);
    });
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set("q", value);
      } else {
        params.delete("q");
      }
      startTransition(() => {
        router.push(`/docs?${params.toString()}`);
      });
    }, 400); // 400ms debounce
  };

  return (
    <div className={`flex flex-col lg:flex-row gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02] transition-opacity ${isPending ? 'opacity-70' : 'opacity-100'}`}>
      {/* Search Query */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by function, class or file path..."
          className="pl-9 bg-slate-950/40 border-white/5 focus:border-primary"
          value={query}
          onChange={handleQueryChange}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        {/* Repository Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
            Repo:
          </span>
          <select
            defaultValue={initialRepoId}
            onChange={(e) => updateFilters("repoId", e.target.value)}
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
          <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
            Status:
          </span>
          <select
            defaultValue={initialStaleness}
            onChange={(e) => updateFilters("staleness", e.target.value)}
            className="h-10 px-3 bg-slate-950 border border-white/5 rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-mono w-full sm:w-48"
          >
            <option value="ALL">All Statuses</option>
            <option value="OK">✅ OK</option>
            <option value="REVIEW_RECOMMENDED">🔵 Review Recommended</option>
            <option value="POTENTIALLY_OUTDATED">⚠️ Potentially Outdated</option>
            <option value="BROKEN">🔴 Broken</option>
          </select>
        </div>
      </div>
    </div>
  );
}
