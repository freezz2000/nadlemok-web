import { requireAuth } from '@/lib/auth'
import Sidebar from '@/components/dashboard/Sidebar'
import Topbar from '@/components/dashboard/Topbar'

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAuth(['client'])

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar role="client" />
      <Topbar profile={profile} />
      <main className="ml-64 mt-16 p-6">
        {children}
      </main>
    </div>
  )
}
