"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function DeleteRepoButton({ repoId, repoName }: { repoId: string, repoName: string }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to completely delete "${repoName}"?\n\nThis will permanently wipe all ingested code, documentation, and vector embeddings.`
    );

    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/repos/${repoId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete repository");
      }

      toast.success(`Deleted repository ${repoName}`);
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "An error occurred during deletion.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleDelete}
      disabled={isDeleting}
      className="text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-colors"
      title="Delete Repository"
    >
      {isDeleting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Trash2 className="w-4 h-4" />
      )}
    </Button>
  );
}
