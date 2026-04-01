import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardShell from '@/components/dashboard/DashboardShell'

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAuth(['client'])

  const supabase = await createClient()
  const { data: clientProfile, error } = await supabase
    .from('client_profiles')
    .select('terms_agreed_at, contact_phone')
    .eq('id', profile.id)
    .single()

  // PGRST116 = 행 없음(프로필 미작성) → 리다이렉트
  // 그 외 에러 = 테이블 미생성 등 DB 문제 → 리다이렉트 건너뜀 (기존 고객 보호)
  const isDbError = error && error.code !== 'PGRST116'
  if (!isDbError) {
    const isProfileIncomplete =
      !clientProfile?.terms_agreed_at || !clientProfile?.contact_phone
    if (isProfileIncomplete) {
      redirect('/register/client')
    }
  }

  return (
    <DashboardShell role="client" profile={profile}>
      {children}
    </DashboardShell>
  )
}
