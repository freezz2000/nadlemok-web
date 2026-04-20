import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { sendResultReady } from '@/lib/aligo'

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  // API Key 인증 (간단한 Bearer token 방식)
  const authHeader = request.headers.get('Authorization')
  const apiKey = process.env.ANALYSIS_API_KEY

  if (apiKey && authHeader !== `Bearer ${apiKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const {
    project_id,
    verdict,
    summary,
    item_analysis,
    cohort_analysis,
    kill_signals,
    success_model,
    success_probability,
    core_usp,
    max_penalty,
    recommended_action,
  } = body

  if (!project_id || !verdict) {
    return NextResponse.json({ error: 'project_id and verdict are required' }, { status: 400 })
  }

  const supabase = await createClient()

  // 분석 결과 저장
  const { data, error } = await supabase
    .from('analysis_results')
    .insert({
      project_id,
      verdict,
      summary,
      item_analysis,
      cohort_analysis,
      kill_signals,
      success_model,
      success_probability,
      core_usp,
      max_penalty,
      recommended_action,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 프로젝트 상태를 completed로 업데이트
  await supabase
    .from('projects')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', project_id)

  // 분석 완료 알림톡 — 클라이언트 전화번호 조회 후 발송
  try {
    const { data: proj } = await admin
      .from('projects')
      .select('client_id, product_name')
      .eq('id', project_id)
      .single()

    if (proj?.client_id) {
      const { data: clientProfile } = await admin
        .from('client_profiles')
        .select('contact_phone')
        .eq('id', proj.client_id)
        .single()

      if (clientProfile?.contact_phone) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://linebreakers.co.kr'
        const resultUrl = `${appUrl}/client/projects/${project_id}/results`
        const { ok, message } = await sendResultReady(clientProfile.contact_phone, proj.product_name, resultUrl)
        if (!ok) console.warn('[analysis] 알림톡 발송 실패:', message)
      }
    }
  } catch (e) {
    // 알림톡 실패가 분석 결과 저장을 막지 않도록 catch만
    console.error('[analysis] 알림톡 오류:', e)
  }

  return NextResponse.json({ success: true, data })
}
