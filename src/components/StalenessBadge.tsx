import { Badge } from "@/components/ui/badge"

export function StalenessBadge({ staleness }: { staleness: string }) {
  if (staleness === "OK") {
    return <Badge variant="outline" className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-200">Up to date</Badge>
  }
  if (staleness === "REVIEW_RECOMMENDED") {
    return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-200">Review Recommended</Badge>
  }
  if (staleness === "POTENTIALLY_OUTDATED") {
    return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/20 border-yellow-200">Potentially Outdated</Badge>
  }
  if (staleness === "BROKEN") {
    return <Badge variant="outline" className="bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-200">Broken</Badge>
  }
  return <Badge variant="secondary">{staleness}</Badge>
}
