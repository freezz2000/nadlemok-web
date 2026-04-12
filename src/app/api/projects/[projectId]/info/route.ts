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

  const { data: project } = await admin
    .from('projects')
    .select('id, product_name, panel_source, external_panel_count, delivery_service, quote_total')
    .eq('id', projectId)
    .single()

  if (!project) return NextResponse.json({ error: '프로젝트 없음' }, { status: 404 })

  const { data: cond } = await admin
    .from('panel_conditions')
    .select('age_ranges, skin_types, skin_concerns')
    .eq('project_id', projectId)
    .maybeSingle()

  return NextResponse.json({
    ...project,
    ageRanges: cond?.age_ranges ?? [],
    skinTypes: cond?.skin_types ?? [],
    skinConcerns: cond?.skin_concerns ?? [],
  })
}
