import { requireAuth } from '@/lib/auth'
import Sidebar from '@/components/dashboard/Sidebar'
import Topbar from '@/components/dashboard/Topbar'

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAuth(['panel'])

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar role="panel" />
      <Topbar profile={profile} />
      <main className="ml-64 mt-16 p-6">
        {children}
      </main>
    </div>
  )
}
