"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function AutoUpdatePoller({ repos }: { repos: { id: string; owner: string; name: string }[] }) {
  const router = useRouter();

  useEffect(() => {
    if (!repos || repos.length === 0) return;

    const poll = async () => {
      console.log(`[AutoUpdatePoller] Checking for updates across ${repos.length} repos...`);
      for (const repo of repos) {
        try {
          const res = await fetch("/api/changes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ repoId: repo.id }),
          });

          if (!res.ok) continue;

          const data = await res.json();
          if (data.newCommitsProcessed > 0) {
            toast.success(`Automatically detected ${data.newCommitsProcessed} new commits for ${repo.owner}/${repo.name}!`);
            router.refresh();
          }
        } catch (error) {
          console.error(`Failed to poll updates for ${repo.name}:`, error);
        }
      }
    };

    // Run immediately on mount
    poll();

    // Then check for updates every 60 seconds
    const intervalId = setInterval(poll, 60000); // 60 seconds

    return () => clearInterval(intervalId);
  }, [repos, router]);

  // This is a headless component, it renders nothing
  return null;
}
