export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your content operations.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {["Total Sites", "Posts in Review", "Published This Week", "Autopilot Active"].map(
          (title) => (
            <div
              key={title}
              className="rounded-lg border border-border bg-card p-6"
            >
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="mt-2 text-3xl font-bold">0</p>
            </div>
          )
        )}
      </div>
    </div>
  )
}
