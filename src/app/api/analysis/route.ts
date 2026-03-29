import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

  return NextResponse.json({ success: true, data })
}
