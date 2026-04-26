import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface ClientPanelInfo {
  id: string           // client_panels.id
  panel_id: string
  phone: string | null
  added_at: string
  name: string
  gender: string | null
  age_group: string | null
  skin_type: string | null
  skin_concern: string | null
  response_count: number
}

/**
 * GET /api/client/panels
 * 현재 로그인한 고객사의 패널 풀 목록 반환
 * profiles / panel_profiles RLS 우회를 위해 service role 사용
 */
export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  }

  // 1. client_panels 조회
  const { data: cpRows, error: cpErr } = await admin
    .from('client_panels')
    .select('id, panel_id, phone, added_at')
    .eq('client_id', user.id)
    .order('added_at', { ascending: false })

  if (cpErr) {
    return NextResponse.json({ error: cpErr.message }, { status: 500 })
  }
  if (!cpRows || cpRows.length === 0) {
    return NextResponse.json({ panels: [] })
  }

  const panelIds = cpRows.map((r) => r.panel_id as string)

  // 2. profiles 조회 (이름)
  const { data: profileRows } = await admin
    .from('profiles')
    .select('id, name')
    .in('id', panelIds)

  const profileMap: Record<string, string> = {}
  for (const p of (profileRows ?? [])) {
    profileMap[p.id as string] = (p.name as string) || ''
  }

  // 3. panel_profiles 조회 (피부 타입·연령대·성별 등)
  const { data: ppRows } = await admin
    .from('panel_profiles')
    .select('id, gender, age_group, skin_type, skin_concern')
    .in('id', panelIds)

  const ppMap: Record<string, {
    gender: string | null
    age_group: string | null
    skin_type: string | null
    skin_concern: string | null
  }> = {}
  for (const pp of (ppRows ?? [])) {
    ppMap[pp.id as string] = {
      gender: (pp.gender as string) || null,
      age_group: (pp.age_group as string) || null,
      skin_type: (pp.skin_type as string) || null,
      skin_concern: (pp.skin_concern as string) || null,
    }
  }

  // 4. 각 패널의 응답 횟수 (survey_responses 기준)
  const { data: responseRows } = await admin
    .from('survey_responses')
    .select('panel_id')
    .in('panel_id', panelIds)

  const responseCountMap: Record<string, number> = {}
  for (const r of (responseRows ?? [])) {
    const pid = r.panel_id as string
    responseCountMap[pid] = (responseCountMap[pid] ?? 0) + 1
  }

  // 5. 조합
  const panels: ClientPanelInfo[] = cpRows.map((cp) => {
    const pid = cp.panel_id as string
    const pp = ppMap[pid] ?? {}
    return {
      id: cp.id as string,
      panel_id: pid,
      phone: (cp.phone as string) || null,
      added_at: cp.added_at as string,
      name: profileMap[pid] || '이름 미등록',
      gender: pp.gender ?? null,
      age_group: pp.age_group ?? null,
      skin_type: pp.skin_type ?? null,
      skin_concern: pp.skin_concern ?? null,
      response_count: responseCountMap[pid] ?? 0,
    }
  })

  return NextResponse.json({ panels })
}
