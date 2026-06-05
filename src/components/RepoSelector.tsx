"use client";

import { useRouter } from "next/navigation";

interface Repo {
  id: string;
  owner: string;
  name: string;
}

export function RepoSelector({ 
  repos, 
  defaultValue 
}: { 
  repos: Repo[];
  defaultValue?: string;
}) {
  const router = useRouter();

  return (
    <select 
      className="h-10 px-3 bg-slate-950 border border-white/5 rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-mono w-full sm:w-48"
      defaultValue={defaultValue}
      onChange={(e) => {
        router.push(`/chat?repoId=${e.target.value}`);
      }}
    >
      {repos.map((r) => (
        <option key={r.id} value={r.id}>
          {r.owner}/{r.name}
        </option>
      ))}
    </select>
  );
}
