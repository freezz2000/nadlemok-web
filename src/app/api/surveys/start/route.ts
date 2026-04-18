import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { surveyId } = await req.json()
    if (!surveyId) return NextResponse.json({ error: 'surveyId 필요' }, { status: 400 })

    const { error } = await supabase
      .from('surveys')
      .update({ status: 'active' })
      .eq('id', surveyId)

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[surveys/start]', e)
    return NextResponse.json({ error: '설문 시작에 실패했습니다' }, { status: 500 })
  }
}
