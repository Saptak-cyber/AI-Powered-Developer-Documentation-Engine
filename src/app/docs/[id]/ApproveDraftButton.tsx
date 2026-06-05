"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";

export function ApproveDraftButton({ docId }: { docId: string }) {
  const [isApproving, setIsApproving] = useState(false);
  const router = useRouter();

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const res = await fetch("/api/update-draft/approve", {
        method: "POST",
        body: JSON.stringify({ docId }),
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to approve draft");
      }

      toast.success("Draft approved and published successfully.");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <Button onClick={handleApprove} disabled={isApproving}>
      {isApproving ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <CheckCircle2 className="w-4 h-4 mr-2" />
      )}
      Approve & Publish
    </Button>
  );
}
