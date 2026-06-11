import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { StalenessBadge } from "@/components/StalenessBadge";
import { DiffViewer } from "@/components/DiffViewer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { ApproveDraftButton } from "./ApproveDraftButton";
import { SuggestFixButton } from "@/components/SuggestFixButton";

export default async function DocDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const unit = await prisma.codeUnit.findUnique({
    where: { id },
    include: { doc: true, repo: true },
  });

  if (!unit || !unit.doc) {
    notFound();
  }

  const hasDraft = !!unit.doc.draftContent;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/docs">
          <Button variant="ghost" size="icon">
             <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold font-mono tracking-tight">{unit.name}</h1>
          <p className="text-muted-foreground font-mono text-sm">{unit.repo.owner}/{unit.repo.name} • {unit.filePath}</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
           <StalenessBadge staleness={unit.doc.staleness} />
           {unit.doc.staleness !== "OK" && !hasDraft && (
             <SuggestFixButton docId={unit.doc.id} />
           )}
           {hasDraft && <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 border-purple-200">Draft Available</Badge>}
        </div>
      </div>

      <Tabs key={hasDraft ? "with-draft" : "without-draft"} defaultValue={hasDraft ? "draft" : "doc"}>
        <TabsList>
          {hasDraft && <TabsTrigger value="draft">Review Draft</TabsTrigger>}
          <TabsTrigger value="doc">Current Documentation</TabsTrigger>
          <TabsTrigger value="code">Source Code</TabsTrigger>
        </TabsList>

        {hasDraft && (
          <TabsContent value="draft" className="space-y-4 mt-4">
            <div className="flex justify-between items-center bg-muted/50 p-4 rounded-lg border">
              <div>
                 <h3 className="font-medium">Update Draft Pending</h3>
                 <p className="text-sm text-muted-foreground">The AI has generated a proposed update based on recent code changes.</p>
              </div>
              <ApproveDraftButton docId={unit.doc.id} />
            </div>
            
            <DiffViewer 
               oldValue={unit.doc.content} 
               newValue={unit.doc.draftContent!} 
               splitView={true} 
            />
          </TabsContent>
        )}

        <TabsContent value="doc" className="mt-4">
          <div className="w-full">
            <MarkdownRenderer content={unit.doc.content} />
          </div>
        </TabsContent>

        <TabsContent value="code" className="mt-4">
          <div className="border rounded-lg p-6 bg-[#0d1117] overflow-x-auto shadow-sm">
            <pre><code className={`language-${unit.language} text-sm text-gray-300 font-mono`}>
              {unit.rawCode}
            </code></pre>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}


