import { redirect } from "next/navigation"
import { getUser } from "@/lib/auth/session"
import { Sidebar } from "@/components/shared/sidebar"
import { Header } from "@/components/shared/header"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          userEmail={user.email}
          userName={user.user_metadata?.name}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
