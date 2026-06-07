import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, PenTool, GitCommit, FileCode2 } from "lucide-react";
import { StalenessBadge } from "@/components/StalenessBadge";

export function DraftCard({ doc }: { doc: any }) {
  const { unit } = doc;
  const { repo } = unit;

  return (
    <Card className="hover:shadow-md transition-shadow relative group border-purple-500/20 bg-gradient-to-b from-card to-purple-950/5">
      <CardHeader>
        <div className="flex justify-between items-start mb-2">
          <Badge variant="outline" className="bg-background text-xs font-mono">
            {unit.language}
          </Badge>
          <StalenessBadge staleness={doc.staleness} />
        </div>
        <CardTitle className="font-mono text-lg truncate" title={unit.name}>
          {unit.name}
        </CardTitle>
        <CardDescription className="flex flex-col gap-1 mt-2">
          <span className="flex items-center gap-1.5 text-xs">
            <GitCommit className="w-3.5 h-3.5" />
            {repo.owner}/{repo.name}
          </span>
          <span className="flex items-center gap-1.5 text-xs truncate" title={unit.filePath}>
            <FileCode2 className="w-3.5 h-3.5" />
            {unit.filePath}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="bg-purple-500/10 text-purple-600 dark:text-purple-400 p-3 rounded-md text-sm border border-purple-500/20 flex items-center gap-2">
          <PenTool className="w-4 h-4" />
          <span>AI Draft pending your review</span>
        </div>
      </CardContent>
      <CardFooter>
        <Link href={`/docs/${unit.id}`} className="w-full">
          <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white gap-2">
            Review Draft
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
