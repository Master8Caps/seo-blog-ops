"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Check, X, ArrowUpDown } from "lucide-react"
import {
  updateKeywordStatus,
  bulkUpdateKeywordStatus,
} from "@/modules/research/actions/update-keyword"

type SortField = "keyword" | "searchVolume" | "cpc" | "relevanceScore"

function SortButton({
  field,
  children,
  onSort,
}: {
  field: SortField
  children: React.ReactNode
  onSort: (field: SortField) => void
}) {
  return (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {children}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  )
}

interface KeywordRow {
  id: string
  keyword: string
  searchVolume: number | null
  cpc: number | null
  competition: string | null
  relevanceScore: number | null
  intent: string | null
  cluster: string | null
  status: string
}

interface KeywordTableProps {
  keywords: KeywordRow[]
}

type SortDir = "asc" | "desc"

const intentColors: Record<string, "default" | "secondary" | "outline"> = {
  informational: "secondary",
  transactional: "default",
  commercial: "default",
  navigational: "outline",
}

const statusColors: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  discovered: "secondary",
  approved: "default",
  used: "outline",
  rejected: "destructive",
}

export function KeywordTable({ keywords: initialKeywords }: KeywordTableProps) {
  const [keywords, setKeywords] = useState(initialKeywords)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<SortField>("relevanceScore")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [updating, setUpdating] = useState<string | null>(null)

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDir("desc")
    }
  }

  const sorted = [...keywords].sort((a, b) => {
    const aVal = a[sortField] ?? 0
    const bVal = b[sortField] ?? 0
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDir === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal)
    }
    return sortDir === "asc"
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number)
  })

  function toggleSelect(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  function toggleSelectAll() {
    if (selected.size === sorted.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(sorted.map((k) => k.id)))
    }
  }

  async function handleStatusChange(
    id: string,
    status: "approved" | "rejected"
  ) {
    setUpdating(id)
    await updateKeywordStatus(id, status)
    setKeywords((prev) =>
      prev.map((k) => (k.id === id ? { ...k, status } : k))
    )
    setUpdating(null)
  }

  async function handleBulkAction(status: "approved" | "rejected") {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    setUpdating("bulk")
    await bulkUpdateKeywordStatus(ids, status)
    setKeywords((prev) =>
      prev.map((k) => (selected.has(k.id) ? { ...k, status } : k))
    )
    setSelected(new Set())
    setUpdating(null)
  }

  return (
    <div className="space-y-4">
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
          <span className="text-sm text-muted-foreground">
            {selected.size} selected
          </span>
          <Button
            size="sm"
            onClick={() => handleBulkAction("approved")}
            disabled={updating === "bulk"}
          >
            <Check className="mr-1 h-3.5 w-3.5" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleBulkAction("rejected")}
            disabled={updating === "bulk"}
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Reject
          </Button>
        </div>
      )}

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={
                    selected.size === sorted.length && sorted.length > 0
                  }
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>
                <SortButton field="keyword" onSort={handleSort}>Keyword</SortButton>
              </TableHead>
              <TableHead className="text-right">
                <SortButton field="searchVolume" onSort={handleSort}>Volume</SortButton>
              </TableHead>
              <TableHead className="text-right">
                <SortButton field="cpc" onSort={handleSort}>CPC</SortButton>
              </TableHead>
              <TableHead>Competition</TableHead>
              <TableHead className="text-right">
                <SortButton field="relevanceScore" onSort={handleSort}>Relevance</SortButton>
              </TableHead>
              <TableHead>Intent</TableHead>
              <TableHead>Cluster</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((kw) => (
              <TableRow key={kw.id}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(kw.id)}
                    onCheckedChange={() => toggleSelect(kw.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">{kw.keyword}</TableCell>
                <TableCell className="text-right">
                  {kw.searchVolume?.toLocaleString() ?? "—"}
                </TableCell>
                <TableCell className="text-right">
                  {kw.cpc != null ? `$${kw.cpc.toFixed(2)}` : "—"}
                </TableCell>
                <TableCell>
                  {kw.competition ? (
                    <Badge variant="outline" className="text-xs capitalize">
                      {kw.competition.toLowerCase()}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {kw.relevanceScore != null ? (
                    <span
                      className={
                        kw.relevanceScore >= 0.8
                          ? "text-green-400"
                          : kw.relevanceScore >= 0.5
                            ? "text-yellow-400"
                            : "text-muted-foreground"
                      }
                    >
                      {(kw.relevanceScore * 100).toFixed(0)}%
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  {kw.intent ? (
                    <Badge
                      variant={intentColors[kw.intent] ?? "secondary"}
                      className="text-xs capitalize"
                    >
                      {kw.intent}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {kw.cluster ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={statusColors[kw.status] ?? "secondary"}
                    className="text-xs capitalize"
                  >
                    {kw.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {kw.status !== "approved" && (
                      <button
                        onClick={() => handleStatusChange(kw.id, "approved")}
                        disabled={updating === kw.id}
                        className="rounded p-1 hover:bg-primary/10 text-primary transition-colors"
                        title="Approve"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                    {kw.status !== "rejected" && (
                      <button
                        onClick={() => handleStatusChange(kw.id, "rejected")}
                        disabled={updating === kw.id}
                        className="rounded p-1 hover:bg-destructive/10 text-destructive transition-colors"
                        title="Reject"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
