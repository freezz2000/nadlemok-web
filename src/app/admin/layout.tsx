import { requireAuth } from '@/lib/auth'
import DashboardShell from '@/components/dashboard/DashboardShell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAuth(['admin'])

  return (
    <DashboardShell role="admin" profile={profile}>
      {children}
    </DashboardShell>
  )
}
