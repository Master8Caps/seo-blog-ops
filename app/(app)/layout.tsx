import { redirect } from "next/navigation"
import { getUser } from "@/lib/auth/session"
import { Sidebar } from "@/components/shared/sidebar"
import { Header } from "@/components/shared/header"
import { getActiveJobCount } from "@/modules/content/actions/get-activity"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUser()

  if (!user) {
    redirect("/login")
  }

  const activeJobCount = await getActiveJobCount()

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        userEmail={user.email}
        userName={user.user_metadata?.name}
        activeJobCount={activeJobCount}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
