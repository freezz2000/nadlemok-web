import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const ageRanges = searchParams.getAll('age')
  const skinTypes = searchParams.getAll('skin')
  const skinConcerns = searchParams.getAll('concern')

  // 외부 패널(panel role, panel_type='external') 조회
  let query = admin
    .from('profiles')
    .select(`
      id, name,
      panel_profiles!inner(age_group, skin_type, skin_concerns, panel_type)
    `)
    .eq('role', 'panel')
    .eq('panel_profiles.panel_type', 'external')

  const { data: raw } = await query

  // 응용 계층 필터
  let panels = (raw || []).map((p: Record<string, unknown>) => {
    const pp = (p.panel_profiles as Record<string, unknown>[] | null)?.[0] ?? {}
    return {
      id: p.id as string,
      name: p.name as string,
      age_group: pp.age_group as string | null,
      skin_type: pp.skin_type as string | null,
      skin_concerns: (pp.skin_concerns as string[] | null) ?? [],
      total_tests: 0,
    }
  })

  if (ageRanges.length) panels = panels.filter(p => p.age_group && ageRanges.includes(p.age_group))
  if (skinTypes.length) panels = panels.filter(p => p.skin_type && skinTypes.includes(p.skin_type))
  if (skinConcerns.length) panels = panels.filter(p => skinConcerns.some(c => p.skin_concerns.includes(c)))

  return NextResponse.json({ panels })
}
