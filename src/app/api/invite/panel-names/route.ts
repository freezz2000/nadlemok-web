import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

/**
 * GET /api/invite/panel-names?ids=id1,id2,...
 *
 * profiles 테이블의 RLS는 본인 행만 허용하므로, 클라이언트 사이드에서
 * 다른 유저(패널)의 이름을 조회할 수 없음.
 * 서비스롤 키로 RLS를 우회하여 패널 이름을 반환.
 *
 * 반환: { names: { [panelId: string]: string } }
 */
export async function GET(req: NextRequest) {
  // 인증 확인
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const ids = req.nextUrl.searchParams.get('ids')
  if (!ids) return NextResponse.json({ names: {} })

  const panelIds = ids.split(',').map((s) => s.trim()).filter(Boolean)
  if (panelIds.length === 0) return NextResponse.json({ names: {} })

  // 서비스롤 키로 RLS 우회
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, name')
    .in('id', panelIds)

  const names: Record<string, string> = {}
  for (const p of (profiles ?? [])) {
    names[p.id as string] = (p.name as string) || ''
  }

  return NextResponse.json({ names })
}
