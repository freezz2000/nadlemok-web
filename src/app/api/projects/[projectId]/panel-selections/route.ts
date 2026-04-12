import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data: selections } = await admin
    .from('project_panel_selections')
    .select('panel_id, selected_by, status')
    .eq('project_id', projectId)

  return NextResponse.json({
    selections: (selections || []).map(s => ({
      panelId: s.panel_id,
      selectedBy: s.selected_by,
      status: s.status,
    })),
  })
}
