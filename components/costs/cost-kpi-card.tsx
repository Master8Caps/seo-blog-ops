import { Card } from "@/components/ui/card"

interface CostKpiCardProps {
  label: string
  value: string
  sub?: string
  subClassName?: string
}

export function CostKpiCard({ label, value, sub, subClassName }: CostKpiCardProps) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
      {sub && <p className={`text-xs mt-0.5 ${subClassName ?? "text-muted-foreground"}`}>{sub}</p>}
    </Card>
  )
}
