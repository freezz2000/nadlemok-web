import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import DashboardShell from '@/components/dashboard/DashboardShell'

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAuth(['panel'])

  const supabase = await createClient()
  const { data: panelProfile } = await supabase
    .from('panel_profiles')
    .select('skin_type, terms_agreed_at')
    .eq('id', profile.id)
    .single()

  if (!panelProfile?.skin_type || !panelProfile?.terms_agreed_at) {
    redirect('/register/panel')
  }

  return (
    <DashboardShell role="panel" profile={profile}>
      {children}
    </DashboardShell>
  )
}
