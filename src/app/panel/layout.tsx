import { requireAuth } from '@/lib/auth'
import DashboardShell from '@/components/dashboard/DashboardShell'

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAuth(['panel'])

  return (
    <DashboardShell role="panel" profile={profile}>
      {children}
    </DashboardShell>
  )
}
