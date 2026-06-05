import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { StalenessBadge } from "./StalenessBadge"
import { CodeUnit } from "@/types"
import { FileCode2, FunctionSquare, Box, Play } from "lucide-react"
import Link from "next/link"
import { Button } from "./ui/button"

export function DocCard({ unit }: { unit: CodeUnit }) {
  const iconMap: Record<string, any> = {
    "function": <FunctionSquare className="w-4 h-4 text-blue-500" />,
    "arrow_function": <FunctionSquare className="w-4 h-4 text-blue-400" />,
    "class": <Box className="w-4 h-4 text-purple-500" />,
    "method": <Play className="w-4 h-4 text-green-500" />,
    "module": <FileCode2 className="w-4 h-4 text-orange-500" />
  }

  const hasDoc = !!unit.doc;
  const staleness = unit.doc?.staleness || "OK";

  return (
    <Card className="glow-card bg-white/[0.02] border-white/5 hover:-translate-y-0.5 transition-all duration-300">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            {iconMap[unit.type] || <FileCode2 className="w-4 h-4" />}
            <CardTitle className="text-base font-mono truncate max-w-[200px]" title={unit.name}>
              {unit.name}
            </CardTitle>
          </div>
          {hasDoc && <StalenessBadge staleness={staleness} />}
        </div>
        <CardDescription className="text-xs font-mono truncate mt-1">
          {unit.filePath}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {unit.signature && (
          <div className="bg-muted rounded p-2 text-xs font-mono truncate mt-2 text-muted-foreground border">
            {unit.signature}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-0">
        {hasDoc ? (
          <Link href={`/docs/${unit.id}`} className="w-full">
            <Button variant="secondary" className="w-full h-8 text-xs">View Documentation</Button>
          </Link>
        ) : (
          <Button variant="outline" disabled className="w-full h-8 text-xs bg-muted/50 border-dashed">
            Doc Pending Generation
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
