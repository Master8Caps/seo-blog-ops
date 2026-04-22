"use client"

import { useState, useEffect } from "react"
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
import { Check, X, ArrowUpDown, Layers, ChevronDown, Sparkles, RefreshCw } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  updateKeywordStatus,
  bulkUpdateKeywordStatus,
} from "@/modules/research/actions/update-keyword"
import { regenerateAnglesForKeyword } from "@/modules/research/actions/backfill-angles"

type SortField = "keyword" | "searchVolume" | "cpc" | "relevanceScore"
type GroupField = "none" | "competition" | "intent" | "cluster" | "status"

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
  aiSelected: boolean
  angleCount: number
}

interface KeywordTableProps {
  keywords: KeywordRow[]
}

type SortDir = "asc" | "desc"

const competitionConfig: Record<string, { className: string }> = {
  high: { className: "border-red-500/50 bg-red-500/10 text-red-400" },
  medium: { className: "border-yellow-500/50 bg-yellow-500/10 text-yellow-400" },
  low: { className: "border-green-500/50 bg-green-500/10 text-green-400" },
}

const statusConfig: Record<string, { className: string }> = {
  discovered: { className: "border-blue-500/50 bg-blue-500/10 text-blue-400" },
  approved: { className: "border-green-500/50 bg-green-500/10 text-green-400" },
  used: { className: "border-purple-500/50 bg-purple-500/10 text-purple-400" },
  rejected: { className: "border-red-500/50 bg-red-500/10 text-red-400" },
}

const intentConfig: Record<string, { className: string }> = {
  informational: { className: "border-sky-500/50 bg-sky-500/10 text-sky-400" },
  transactional: { className: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400" },
  commercial: { className: "border-amber-500/50 bg-amber-500/10 text-amber-400" },
  navigational: { className: "border-violet-500/50 bg-violet-500/10 text-violet-400" },
}

const groupLabels: Record<GroupField, string> = {
  none: "No Grouping",
  competition: "Competition",
  intent: "Intent",
  cluster: "Cluster",
  status: "Status",
}

function getGroupKey(kw: KeywordRow, field: GroupField): string {
  switch (field) {
    case "competition":
      return kw.competition?.toLowerCase() ?? "unknown"
    case "intent":
      return kw.intent ?? "unclassified"
    case "cluster":
      return kw.cluster ?? "uncategorized"
    case "status":
      return kw.status
    default:
      return ""
  }
}

function getGroupOrder(field: GroupField): Record<string, number> {
  switch (field) {
    case "competition":
      return { low: 0, medium: 1, high: 2 }
    case "status":
      return { approved: 0, discovered: 1, used: 2, rejected: 3 }
    default:
      return {}
  }
}

function AngleCell({ kw }: { kw: KeywordRow }) {
  const [regenerating, setRegenerating] = useState(false)
  const [count, setCount] = useState(kw.angleCount)

  async function handleRegenerate() {
    if (kw.status !== "approved") return
    setRegenerating(true)
    try {
      const result = await regenerateAnglesForKeyword(kw.id)
      if (result.success && "count" in result) {
        setCount(result.count)
      }
    } finally {
      setRegenerating(false)
    }
  }

  if (kw.status !== "approved") {
    return <span className="text-muted-foreground">—</span>
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <span className={count === 0 ? "text-yellow-400" : ""}>{count}</span>
      <button
        onClick={handleRegenerate}
        disabled={regenerating}
        className="rounded p-1 hover:bg-primary/10 text-primary transition-colors disabled:opacity-50"
        title="Regenerate angles"
      >
        <RefreshCw className={`h-3 w-3 ${regenerating ? "animate-spin" : ""}`} />
      </button>
    </div>
  )
}

export function KeywordTable({ keywords: propKeywords }: KeywordTableProps) {
  const [keywords, setKeywords] = useState(propKeywords)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<SortField>("searchVolume")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [updating, setUpdating] = useState<string | null>(null)
  const [groupBy, setGroupBy] = useState<GroupField>("none")

  useEffect(() => {
    setKeywords(propKeywords)
  }, [propKeywords])

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDir("desc")
    }
  }

  function applySortAndGroup(items: KeywordRow[]) {
    return [...items].sort((a, b) => {
      if (groupBy !== "none") {
        const order = getGroupOrder(groupBy)
        const aGroup = getGroupKey(a, groupBy)
        const bGroup = getGroupKey(b, groupBy)
        const aOrder = order[aGroup] ?? 99
        const bOrder = order[bGroup] ?? 99
        if (aOrder !== bOrder) return aOrder - bOrder
        if (aGroup !== bGroup) return aGroup.localeCompare(bGroup)
      }

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
  }

  // Split into approved (top) and rest, each sorted independently
  const approvedKeywords = applySortAndGroup(keywords.filter((k) => k.status === "approved"))
  const otherKeywords = applySortAndGroup(keywords.filter((k) => k.status !== "approved"))
  const sorted = [...approvedKeywords, ...otherKeywords]

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

  function renderTableHeader() {
    return (
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <Checkbox
              checked={selected.size === sorted.length && sorted.length > 0}
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
          <TableHead className="text-right">Angles</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-24">Actions</TableHead>
        </TableRow>
      </TableHeader>
    )
  }

  function renderRow(kw: KeywordRow) {
    const compKey = kw.competition?.toLowerCase() ?? ""
    const compStyle = competitionConfig[compKey] ?? { className: "text-muted-foreground" }
    const statStyle = statusConfig[kw.status] ?? statusConfig.discovered
    const intStyle = intentConfig[kw.intent ?? ""] ?? { className: "text-muted-foreground" }

    return (
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
            <Badge variant="outline" className={`text-xs capitalize ${compStyle.className}`}>
              {kw.competition.toLowerCase()}
            </Badge>
          ) : "—"}
        </TableCell>
        <TableCell className="text-right">
          {kw.relevanceScore != null ? (
            <span className={
              kw.relevanceScore >= 0.8 ? "text-green-400"
                : kw.relevanceScore >= 0.5 ? "text-yellow-400"
                  : "text-muted-foreground"
            }>
              {(kw.relevanceScore * 100).toFixed(0)}%
            </span>
          ) : "—"}
        </TableCell>
        <TableCell>
          {kw.intent ? (
            <Badge variant="outline" className={`text-xs capitalize ${intStyle.className}`}>
              {kw.intent}
            </Badge>
          ) : "—"}
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {kw.cluster ?? "—"}
        </TableCell>
        <TableCell className="text-right">
          <AngleCell kw={kw} />
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className={`text-xs capitalize ${statStyle.className}`}>
              {kw.status}
            </Badge>
            {kw.aiSelected && (
              <span className="flex items-center gap-0.5 text-xs text-amber-400" title="AI Pick">
                <Sparkles className="h-3 w-3" />
              </span>
            )}
          </div>
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
    )
  }

  function renderGroupedRows(items: KeywordRow[], skipStatusGroup: boolean) {
    let lastGroup: string | null = null
    return items.map((kw) => {
      // Skip group headers for "status" grouping when in the approved section
      const effectiveGroupBy = (skipStatusGroup && groupBy === "status") ? "none" : groupBy
      const groupKey = effectiveGroupBy !== "none" ? getGroupKey(kw, effectiveGroupBy) : null
      const showGroupHeader = groupKey !== null && groupKey !== lastGroup
      if (groupKey !== null) lastGroup = groupKey

      return (
        <>
          {showGroupHeader && (
            <TableRow key={`group-${groupKey}-${kw.id}`} className="bg-muted/30">
              <TableCell colSpan={11} className="py-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {groupKey}
                </span>
              </TableCell>
            </TableRow>
          )}
          {renderRow(kw)}
        </>
      )
    })
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {selected.size > 0 && (
            <>
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
            </>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant={groupBy !== "none" ? "default" : "outline"}
                size="sm"
              >
                <Layers className="mr-1.5 h-3.5 w-3.5" />
                {groupBy === "none" ? "Group by" : `Grouped: ${groupLabels[groupBy]}`}
                <ChevronDown className="ml-1.5 h-3 w-3" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            {(Object.keys(groupLabels) as GroupField[]).map((field) => (
              <DropdownMenuItem
                key={field}
                onClick={() => setGroupBy(field)}
                className={groupBy === field ? "bg-accent" : ""}
              >
                {groupLabels[field]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Approved Section */}
      {approvedKeywords.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-sm font-semibold text-green-400">
              Approved
            </span>
            <span className="text-xs text-muted-foreground">
              ({approvedKeywords.length})
            </span>
          </div>
          <div className="rounded-lg border border-green-500/20 bg-green-500/[0.02]">
            <Table>
              {renderTableHeader()}
              <TableBody>
                {renderGroupedRows(approvedKeywords, true)}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Other Keywords Section */}
      {otherKeywords.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-sm font-semibold text-muted-foreground">
              Discovered
            </span>
            <span className="text-xs text-muted-foreground">
              ({otherKeywords.length})
            </span>
          </div>
          <div className="rounded-lg border border-border">
            <Table>
              {renderTableHeader()}
              <TableBody>
                {renderGroupedRows(otherKeywords, false)}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
