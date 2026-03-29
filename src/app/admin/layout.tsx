import { requireAuth } from '@/lib/auth'
import Sidebar from '@/components/dashboard/Sidebar'
import Topbar from '@/components/dashboard/Topbar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAuth(['admin'])

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar role="admin" />
      <Topbar profile={profile} />
      <main className="ml-64 mt-16 p-6">
        {children}
      </main>
    </div>
  )
}
