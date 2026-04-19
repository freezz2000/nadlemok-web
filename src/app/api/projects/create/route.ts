import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    // 로그인 확인
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { product_name, product_category, panel_source, external_panel_count, panel_size } = await req.json()

    if (!product_name?.trim()) {
      return NextResponse.json({ error: '제품명을 입력해주세요.' }, { status: 400 })
    }

    const isExternal = panel_source === 'external'

    const { data: project, error: insertError } = await supabaseAdmin
      .from('projects')
      .insert({
        client_id: user.id,
        product_name: product_name.trim(),
        product_category: product_category || '화장품',
        plan: 'basic',
        panel_size: panel_size || (isExternal ? (external_panel_count || 30) : 10),
        test_duration: 14,
        status: 'draft',
        panel_source: panel_source || 'internal',
        external_panel_count: isExternal ? (external_panel_count || 30) : 0,
      })
      .select('id')
      .single()

    if (insertError || !project) {
      console.error('project create error:', insertError)
      return NextResponse.json(
        { error: insertError?.message || '프로젝트 생성 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ projectId: project.id })
  } catch (err) {
    console.error('projects/create error:', err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
