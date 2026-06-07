"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function GenerateDocsButton({ repoId, repoName }: { repoId: string, repoName: string }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();

  const handleGenerate = async () => {
    setIsGenerating(true);
    toast.info(`Starting documentation generation for ${repoName}...`);

    try {
      // Omit forceRebuild to ensure it ONLY generates for CodeUnits without docs
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoId }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate docs");
      }

      if (data.successfullyGenerated > 0) {
        toast.success(`Successfully generated ${data.successfullyGenerated} new documents for ${repoName}!`);
        router.refresh();
      } else {
        toast.success(`All documentation is already up to date for ${repoName}!`);
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "An error occurred during generation.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleGenerate}
      disabled={isGenerating}
      className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30 transition-colors"
      title="Generate Missing Docs"
    >
      {isGenerating ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Play className="w-4 h-4" />
      )}
    </Button>
  );
}
