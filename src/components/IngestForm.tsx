"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { Github, Loader2 } from "lucide-react";

export function IngestForm() {
  const [url, setUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.includes("github.com")) {
      toast.error("Please enter a valid GitHub URL");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Ingest repo
      const ingestRes = await fetch("/api/ingest", {
        method: "POST",
        body: JSON.stringify({ repoUrl: url, branch }),
        headers: { "Content-Type": "application/json" },
      });
      
      const ingestData = await ingestRes.json();
      if (!ingestRes.ok) throw new Error(ingestData.error || "Failed to ingest repo");

      toast.success(`Ingested ${ingestData.unitsParsed} code units from ${ingestData.filesProcessed} files.`);

      // 2. Automatically trigger generation for the new units in the background
      toast.info("Generating documentation in the background...");
      
      // We don't await this, let it run
      fetch("/api/generate", {
        method: "POST",
        body: JSON.stringify({ repoId: ingestData.repoId }),
        headers: { "Content-Type": "application/json" },
      }).then(res => res.json()).then(data => {
         if (data.success) {
            toast.success(`Successfully generated ${data.successfullyGenerated} docs.`);
            router.refresh(); // Refresh dashboard to show new docs
         }
      }).catch(err => {
         console.error("Background generation error:", err);
         toast.error("Background doc generation failed.");
      });

      setUrl("");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Github className="w-5 h-5" />
          Ingest Repository
        </CardTitle>
        <CardDescription>
          Enter a GitHub repository URL to download, parse, and generate documentation.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleIngest}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">GitHub Repository URL</label>
            <Input 
              placeholder="https://github.com/owner/repo" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Branch</label>
            <Input 
              placeholder="main" 
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ingesting...
              </>
            ) : (
              "Ingest & Generate Docs"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
