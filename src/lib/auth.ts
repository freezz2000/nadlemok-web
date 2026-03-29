import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Profile, UserRole } from '@/lib/types'

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}

export async function requireAuth(allowedRoles?: UserRole[]): Promise<Profile> {
  const profile = await getProfile()

  if (!profile) {
    redirect('/login')
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    redirect(`/${profile.role}`)
  }

  return profile
}
