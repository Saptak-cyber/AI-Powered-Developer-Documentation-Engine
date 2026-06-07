"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function SuggestFixButton({ docId }: { docId: string }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();

  const handleSuggest = async () => {
    setIsGenerating(true);
    toast.info("Analyzing recent code changes to generate a draft...");

    try {
      const res = await fetch("/api/update-draft", {
        method: "POST",
        body: JSON.stringify({ docId }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate draft");
      }

      toast.success("New draft generated successfully!");
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "An error occurred.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleSuggest}
      disabled={isGenerating}
      className="border-purple-500/30 text-purple-400 hover:bg-purple-950/30 transition-colors shadow-[0_0_15px_-3px_rgba(168,85,247,0.3)]"
    >
      {isGenerating ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Sparkles className="w-4 h-4 mr-2" />
      )}
      Suggest AI Fix
    </Button>
  );
}
