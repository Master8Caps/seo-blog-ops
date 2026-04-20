interface TocItem {
  id: string
  title: string
}

interface TocProps {
  items: TocItem[]
}

export function Toc({ items }: TocProps) {
  return (
    <nav className="hidden lg:block sticky top-6 w-64 shrink-0 self-start">
      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
        On this page
      </p>
      <ul className="flex flex-col gap-1.5 text-sm">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="text-muted-foreground hover:text-foreground transition-colors block py-0.5"
            >
              {item.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
