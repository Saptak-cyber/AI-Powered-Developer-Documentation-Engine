"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function CheckUpdatesButton({ repoId, repoName }: { repoId: string, repoName: string }) {
  const [isChecking, setIsChecking] = useState(false);
  const router = useRouter();

  const handleCheck = async () => {
    setIsChecking(true);
    toast.info(`Checking for new commits in ${repoName}...`);

    try {
      const res = await fetch("/api/changes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoId }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to check for updates");
      }

      if (data.newCommitsProcessed > 0) {
        toast.success(`Successfully processed ${data.newCommitsProcessed} new commits for ${repoName}!`);
        router.refresh();
      } else {
        toast.success(`No new commits found for ${repoName}. Everything is up to date.`);
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "An error occurred during update check.");
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleCheck}
      disabled={isChecking}
      className="text-blue-400 hover:text-blue-300 hover:bg-blue-950/30 transition-colors"
      title="Check for GitHub Updates"
    >
      {isChecking ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <RefreshCw className="w-4 h-4" />
      )}
    </Button>
  );
}
