import { BarChart3 } from "lucide-react"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-card border-r border-border p-12">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">SEO Blog Ops</span>
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            Content operations,
            <br />
            <span className="text-primary">simplified.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-md">
            Manage SEO research, content generation, and publishing across all
            your websites from one dashboard.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          Internal tool — authorized team members only.
        </p>
      </div>

      {/* Right panel — auth form */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <BarChart3 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">SEO Blog Ops</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
