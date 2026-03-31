/**
 * 분석 API 프록시
 * Next.js 관리자 UI → 이 라우트 → Python FastAPI
 *
 * POST /api/analyze/[projectId]        → 분석 시작
 * GET  /api/analyze/[projectId]/status → 진행 상태 (FastAPI /analyze/{id}/status)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ANALYSIS_API = process.env.ANALYSIS_API_URL ?? 'http://localhost:8000'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params

  // 관리자 권한 확인
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const res = await fetch(`${ANALYSIS_API}/analyze/${projectId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    const body = await res.json()
    return NextResponse.json(body, { status: res.status })
  } catch (err) {
    return NextResponse.json(
      { error: 'Python 분석 서버에 연결할 수 없습니다.' },
      { status: 503 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params

  try {
    const res = await fetch(`${ANALYSIS_API}/analyze/${projectId}/status`)
    const body = await res.json()
    return NextResponse.json(body)
  } catch {
    return NextResponse.json({ status: 'not_started' })
  }
}
