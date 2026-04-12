import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { projectId, panelIds } = await req.json() as { projectId: string; panelIds: string[] }

  if (!projectId || !panelIds?.length) {
    return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 })
  }

  // 기존 client 선택 삭제 후 재등록
  await admin
    .from('project_panel_selections')
    .delete()
    .eq('project_id', projectId)
    .eq('selected_by', 'client')

  const rows = panelIds.map(panelId => ({
    project_id: projectId,
    panel_id: panelId,
    selected_by: 'client',
    status: 'pending',
  }))

  const { error } = await admin
    .from('project_panel_selections')
    .upsert(rows, { onConflict: 'project_id,panel_id' })

  if (error) {
    console.error('panel-select error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, count: panelIds.length })
}
