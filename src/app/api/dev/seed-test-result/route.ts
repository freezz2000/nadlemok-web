import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/dev/seed-test-result
 * Body: { projectId }
 *
 * 지정된 프로젝트에 가상 설문 응답 + 분석 결과를 생성합니다.
 * 개발/데모 전용. 소유자 인증 필수.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const { projectId } = await req.json()
    if (!projectId) return NextResponse.json({ error: 'projectId 필요' }, { status: 400 })

    // 프로젝트 소유권 확인
    const { data: project } = await admin
      .from('projects')
      .select('id, client_id, status, product_name, satisfaction_threshold, panel_source')
      .eq('id', projectId)
      .single()

    if (!project) return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다.' }, { status: 404 })
    if (project.client_id !== user.id) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })

    // 설문 조회
    const { data: survey } = await admin
      .from('surveys')
      .select('id, questions')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!survey) return NextResponse.json({ error: '설문이 없습니다.' }, { status: 404 })

    const questions: {
      key: string; label: string; type: string; group?: string; isKillSignal?: boolean
    }[] = survey.questions || []

    // 설문에 배정된 패널 조회
    const { data: spRows } = await admin
      .from('survey_panels')
      .select('panel_id, status')
      .eq('survey_id', survey.id)

    if (!spRows?.length) return NextResponse.json({ error: '배정된 패널이 없습니다.' }, { status: 404 })

    const panelIds: string[] = spRows.map((r: { panel_id: string }) => r.panel_id)

    // 패널 프로필 조회 (코호트 분석용)
    const { data: panelProfiles } = await admin
      .from('panel_profiles')
      .select('id, skin_type, age_group')
      .in('id', panelIds)

    const ppMap: Record<string, { skin_type: string; age_group: string }> = {}
    for (const pp of (panelProfiles ?? [])) {
      ppMap[pp.id as string] = { skin_type: (pp.skin_type as string) || '기타', age_group: (pp.age_group as string) || '기타' }
    }

    // ── 가상 응답 생성 ─────────────────────────────────────────
    // 문항 그룹별 평균 점수 시나리오 (CONDITIONAL GO 시나리오)
    const groupScenarios: Record<string, number[]> = {
      killsignal: [4, 4, 4, 3, 4],       // KS문항: 대부분 무증상(4), 1명은 경미(3) → safe~warning
      usage:      [3, 4, 3, 4, 3],       // 사용감: 평균 3.4
      function:   [3, 3, 4, 3, 3],       // 기능성: 평균 3.2
      claim_risk: [3, 2, 3, 2, 3],       // Claim: 평균 2.6 (주관적 효능 낮게)
      verification: [3, 4, 3, 4, 3],     // 검증: 평균 3.4
      overall:    [3, 4, 3, 3, 4],       // 종합: 평균 3.4
    }

    // KS 문항 중 1개는 1명이 트리거
    const ksQuestions = questions.filter((q) => q.isKillSignal || q.group === 'killsignal')
    const triggeredKs = ksQuestions[0] // 첫 번째 KS 문항에서 1명 트리거

    const allResponses: Record<string, { [key: string]: number }[]> = {}
    panelIds.forEach((_, idx) => { allResponses[panelIds[idx]] = [] })

    // 패널 x 문항 응답 매트릭스 생성
    const responseMatrix: Record<string, Record<string, number>> = {}
    for (const panelId of panelIds) responseMatrix[panelId] = {}

    for (const q of questions) {
      if (q.type !== 'scale') continue
      const group = q.group || 'overall'
      const scenario = groupScenarios[group] || groupScenarios['overall']

      panelIds.forEach((panelId, idx) => {
        let score = scenario[idx % scenario.length]
        // KS 트리거: 1번째 패널의 첫 번째 KS 문항 = 1점 (이상반응 발생)
        if (triggeredKs && q.key === triggeredKs.key && idx === 2) {
          score = 1
        }
        // ±1 범위 내 자연스러운 변동
        const jitter = Math.random() < 0.3 ? (Math.random() < 0.5 ? 1 : -1) : 0
        score = Math.max(1, Math.min(4, score + jitter))
        responseMatrix[panelId][q.key] = score
      })
    }

    // 주관식 응답
    const openWeaknessOptions = [
      '흡수가 조금 느린 것 같습니다.',
      '향이 다소 강하게 느껴졌습니다.',
      '용기가 불편했습니다.',
      '발림성이 약간 무거웠습니다.',
      '가격 대비 용량이 아쉽습니다.',
    ]
    const openImprovementOptions = [
      '흡수력을 좀 더 높이면 좋겠습니다.',
      '향을 은은하게 줄여주세요.',
      '용기를 펌프 타입으로 바꿨으면 합니다.',
      '지속력이 더 오래갔으면 합니다.',
      '가격이 조금 낮아지면 좋겠습니다.',
    ]

    // 기존 응답 삭제 후 재삽입
    await admin.from('survey_responses').delete().eq('survey_id', survey.id)

    const insertRows = panelIds.map((panelId, idx) => ({
      survey_id: survey.id,
      panel_id: panelId,
      day_checkpoint: 1,
      responses: responseMatrix[panelId],
      open_weakness: openWeaknessOptions[idx % openWeaknessOptions.length],
      open_improvement: openImprovementOptions[idx % openImprovementOptions.length],
      response_duration_sec: 120 + Math.round(Math.random() * 180),
    }))

    const { error: responseErr } = await admin.from('survey_responses').insert(insertRows)
    if (responseErr) throw responseErr

    // survey_panels 상태 → completed
    await admin
      .from('survey_panels')
      .update({ status: 'completed' })
      .eq('survey_id', survey.id)
      .in('panel_id', panelIds)

    // ── 통계 계산 ──────────────────────────────────────────────
    const N = panelIds.length
    const scaleQs = questions.filter((q) => q.type === 'scale')

    function getMean(key: string): number {
      const vals = panelIds.map((pid) => responseMatrix[pid][key] ?? 0).filter((v) => v > 0)
      if (!vals.length) return 0
      return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100
    }

    function getSD(key: string, mean: number): number {
      const vals = panelIds.map((pid) => responseMatrix[pid][key] ?? 0).filter((v) => v > 0)
      if (vals.length < 2) return 0
      const variance = vals.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / (vals.length - 1)
      return Math.round(Math.sqrt(variance) * 100) / 100
    }

    function getCI(mean: number, sd: number, n: number): [number, number] {
      const se = sd / Math.sqrt(n)
      const t = 2.776  // t(4, 0.025) — N=5
      return [
        Math.round((mean - t * se) * 100) / 100,
        Math.round((mean + t * se) * 100) / 100,
      ]
    }

    // 전반 만족도 키 추정 (group=overall 문항 중 첫 번째)
    const overallQ = scaleQs.find((q) => q.group === 'overall' && !q.key.includes('purchase') && !q.key.includes('recommend'))
    const purchaseQ = scaleQs.find((q) => q.group === 'overall' && (q.key.includes('purchase') || q.label.includes('구매')))
    const recommendQ = scaleQs.find((q) => q.group === 'overall' && (q.key.includes('recommend') || q.label.includes('추천')))

    const satMean = overallQ ? getMean(overallQ.key) : 3.2
    const satSD = overallQ ? getSD(overallQ.key, satMean) : 0.45
    const [satCiL, satCiU] = getCI(satMean, satSD, N)

    const purchaseMean = purchaseQ ? getMean(purchaseQ.key) : 3.0
    const recommendMean = recommendQ ? getMean(recommendQ.key) : 3.2

    // 추천 Top-2 (점수 3 이상 비율)
    const recommendTop2 = recommendQ
      ? panelIds.filter((pid) => (responseMatrix[pid][recommendQ.key] ?? 0) >= 3).length / N
      : 0.6

    const threshold = (project.satisfaction_threshold as number) ?? 3.0

    // item_analysis 생성
    const itemAnalysis = scaleQs
      .filter((q) => q.group !== 'killsignal' && q.group !== 'verification')
      .map((q) => {
        const mean = getMean(q.key)
        const sd = getSD(q.key, mean)
        const [ci_lower, ci_upper] = getCI(mean, sd, N)

        // 구매의향 상관관계 (simple: function/usage 높으면 r 높게)
        const baseR = q.group === 'function' || q.group === 'usage' ? 0.6 : 0.3
        const correlation_r = Math.round((baseR + (Math.random() - 0.5) * 0.3) * 100) / 100

        return {
          name: q.label,
          mean,
          sd,
          ci_lower,
          ci_upper,
          correlation_r: Math.max(0.1, Math.min(0.99, correlation_r)),
          is_strength: ci_lower > threshold,
          is_weakness: ci_upper < threshold,
        }
      })

    // kill_signals 계산
    const killSignals = ksQuestions.map((q) => {
      const scores = panelIds.map((pid) => responseMatrix[pid][q.key] ?? 4)
      const triggered = scores.filter((s) => s <= 2).length
      const ratio = triggered / N
      return {
        name: q.label,
        ratio: Math.round(ratio * 100) / 100,
        triggered,
        level: ratio >= (0.10) ? 'danger' : ratio >= (0.05) ? 'warning' : 'safe',
        ci_lower: Math.max(0, Math.round((ratio - 0.15) * 100) / 100),
        ci_upper: Math.min(1, Math.round((ratio + 0.15) * 100) / 100),
        comment: ratio === 0 ? '해당 이상반응 보고 없음' : `${triggered}명 경미한 반응 보고, 모니터링 필요`,
      } as { name: string; ratio: number; triggered: number; level: 'safe' | 'warning' | 'danger'; ci_lower: number; ci_upper: number; comment: string }
    })

    // 코호트 분석 (피부타입별)
    const skinTypes = ['건성', '지성', '복합성', '중성', '민감성']
    const cohortAnalysis = skinTypes
      .map((st) => {
        const cohortPanels = panelIds.filter((pid) => ppMap[pid]?.skin_type === st)
        if (cohortPanels.length === 0) return null
        const satVals = overallQ ? cohortPanels.map((pid) => responseMatrix[pid][overallQ.key] ?? 3) : [3]
        const purchaseVals = purchaseQ ? cohortPanels.map((pid) => responseMatrix[pid][purchaseQ.key] ?? 3) : [3]
        const recVals = recommendQ ? cohortPanels.map((pid) => responseMatrix[pid][recommendQ.key] ?? 3) : [3]
        const avg = (arr: number[]) => Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100
        return { skin_type: st, satisfaction: avg(satVals), purchase: avg(purchaseVals), recommend: avg(recVals), count: cohortPanels.length }
      })
      .filter(Boolean)

    // 상위 드라이버 (상관관계 기준 top 5)
    const sortedDrivers = [...itemAnalysis]
      .sort((a, b) => (b.correlation_r ?? 0) - (a.correlation_r ?? 0))
      .slice(0, 5)

    const keyDrivers = sortedDrivers.map((d, i) => ({
      label: d.name,
      pearson_r: d.correlation_r ?? 0,
      rank: i + 1,
    }))

    // 성공 확률 계산
    const satScore = Math.min(1, Math.max(0, (satMean - 1) / 3))
    const purchaseScore = Math.min(1, Math.max(0, (purchaseMean - 1) / 3))
    const ksScore = killSignals.every((k) => k.level === 'safe') ? 1 : killSignals.some((k) => k.level === 'danger') ? 0.4 : 0.7
    const successProbability = Math.round((satScore * 0.4 + purchaseScore * 0.4 + ksScore * 0.2) * 100)

    // 판정
    const hasKsDanger = killSignals.some((k) => k.level === 'danger')
    const verdict = hasKsDanger ? 'NO-GO' : satMean >= threshold ? (satMean >= threshold + 0.5 ? 'GO' : 'CONDITIONAL GO') : 'NO-GO'

    // 강점/약점 텍스트
    const strengths = itemAnalysis.filter((i) => i.is_strength).map((i) => i.name)
    const weaknesses = itemAnalysis.filter((i) => i.is_weakness).map((i) => i.name)

    const coreUsp = strengths.length > 0 ? `${strengths[0]} 우수 — 핵심 셀링포인트로 활용 가능` : '전반적 사용감 양호'
    const maxPenalty = weaknesses.length > 0 ? `${weaknesses[0]} 지표 미달 — 마케팅 클레임 제한 필요` : '특이 페널티 없음'
    const recommendedAction = verdict === 'GO'
      ? '현재 처방 유지. 강점 위주 상세페이지 구성 후 출시 진행.'
      : verdict === 'CONDITIONAL GO'
        ? `${weaknesses.length > 0 ? weaknesses[0] + ' 개선 후' : '마이너 이슈 수정 후'} 소규모 2차 검증 진행.`
        : 'Kill Signal 원인 분석 후 처방 재설계. 현 샘플 출시 보류.'

    // ── 기존 분석 결과 삭제 후 재삽입 ──────────────────────────
    await admin.from('analysis_results').delete().eq('project_id', projectId)

    const { error: analysisErr } = await admin.from('analysis_results').insert({
      project_id: projectId,
      verdict,
      summary: {
        satisfaction_mean: satMean,
        satisfaction_sd: satSD,
        satisfaction_ci_lower: satCiL,
        satisfaction_ci_upper: satCiU,
        purchase_intent_mean: purchaseMean,
        recommend_mean: recommendMean,
        recommend_top2_ratio: Math.round(recommendTop2 * 100) / 100,
        total_responses: N,
      },
      item_analysis: itemAnalysis,
      cohort_analysis: cohortAnalysis,
      kill_signals: killSignals,
      success_model: keyDrivers,
      success_probability: successProbability,
      core_usp: coreUsp,
      max_penalty: maxPenalty,
      recommended_action: recommendedAction,
      key_drivers: keyDrivers,
      rd_guide: {
        dont: weaknesses.length > 0
          ? [`${weaknesses[0]} 관련 마케팅 클레임 사용 자제`, '현 처방 대량 생산 즉시 진행 자제']
          : ['기능성 클레임 과장 표현 자제'],
        do: strengths.length > 0
          ? [`${strengths[0]} 강점을 전면 내세운 상세페이지 구성`, '패널 피드백 기반 질감·향 미세 조정 검토']
          : ['사용감 개선에 집중', '소규모 추가 검증 진행'],
      },
      marketing_guide: {
        targeting: strengths.length > 0 ? `${strengths[0]}을 중시하는 20~40대 여성` : '피부 관리에 관심 있는 20~40대',
        channel: '인스타그램 · 유튜브 뷰티 채널 (사용감 중심 콘텐츠)',
        message: strengths.length > 0 ? `"바르는 순간 ${strengths[0]} 차이"` : '"부드럽고 가벼운 수분 충전"',
      },
      next_steps: [
        { step: 1, title: '처방 미세 조정', description: weaknesses.length > 0 ? `${weaknesses[0]} 지표 개선을 위한 연구소 피드백 전달` : '현 처방 유지 확정' },
        { step: 2, title: '2차 소규모 검증', description: '조정된 샘플로 10~15명 대상 추가 테스트 진행' },
        { step: 3, title: '출시 전략 수립', description: `${strengths.length > 0 ? strengths[0] + ' 강점' : '핵심 가치'}을 중심으로 마케팅 채널별 전략 확정` },
      ],
    })

    if (analysisErr) throw analysisErr

    // 프로젝트 상태 → completed
    await admin
      .from('projects')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', projectId)

    // 설문 상태 → closed
    await admin.from('surveys').update({ status: 'closed' }).eq('id', survey.id)

    return NextResponse.json({
      ok: true,
      verdict,
      satMean,
      successProbability,
      panelCount: N,
      killSignals: killSignals.map((k) => ({ name: k.name, level: k.level, ratio: k.ratio })),
    })
  } catch (err) {
    console.error('[dev/seed-test-result]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
