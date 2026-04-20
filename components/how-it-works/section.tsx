import type { LucideIcon } from "lucide-react"

interface SectionProps {
  id: string
  title: string
  icon: LucideIcon
  stack?: string
  children: React.ReactNode
}

export function Section({ id, title, icon: Icon, stack, children }: SectionProps) {
  return (
    <section id={id} className="scroll-mt-20 py-8 border-b border-border last:border-b-0">
      <div className="flex items-center gap-3 mb-2">
        <Icon className="size-5 text-blue-400" />
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      {stack && (
        <p className="text-xs font-mono text-muted-foreground mb-4">
          Stack: {stack}
        </p>
      )}
      <div className="prose prose-invert prose-sm max-w-none text-foreground/90 [&>p]:my-3">
        {children}
      </div>
    </section>
  )
}
