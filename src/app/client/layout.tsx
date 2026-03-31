import { requireAuth } from '@/lib/auth'
import DashboardShell from '@/components/dashboard/DashboardShell'

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAuth(['client'])

  return (
    <DashboardShell role="client" profile={profile}>
      {children}
    </DashboardShell>
  )
}
