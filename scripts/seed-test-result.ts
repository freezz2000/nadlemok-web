import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

import { createClient } from '@supabase/supabase-js'

const projectId = process.argv[2] || 'da151160-94d2-48af-b250-9f92fef12f7c'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  console.log(`🌱 가상 테스트 결과 생성 시작 (projectId: ${projectId})`)

  // 1. 프로젝트 조회
  const { data: project, error: projErr } = await admin
    .from('projects')
    .select('id, product_name, status, satisfaction_threshold')
    .eq('id', projectId)
    .single()
  if (projErr || !project) { console.error('❌ 프로젝트 없음', projErr); process.exit(1) }
  console.log(`📦 프로젝트: ${project.product_name} (${project.status})`)

  // 2. 설문 조회
  const { data: survey } = await admin
    .from('surveys')
    .select('id, questions')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!survey) { console.error('❌ 설문 없음'); process.exit(1) }

  const questions: { key: string; label: string; type: string; group?: string; isKillSignal?: boolean }[]
    = survey.questions || []
  console.log(`📋 설문 문항 ${questions.length}개`)

  // 3. 배정된 패널 조회
  const { data: spRows } = await admin
    .from('survey_panels')
    .select('panel_id')
    .eq('survey_id', survey.id)
  if (!spRows?.length) { console.error('❌ 배정된 패널 없음'); process.exit(1) }

  const panelIds: string[] = spRows.map((r: { panel_id: string }) => r.panel_id)
  console.log(`👥 패널 ${panelIds.length}명: ${panelIds.join(', ')}`)

  // 4. 패널 프로필 조회
  const { data: panelProfiles } = await admin
    .from('panel_profiles')
    .select('id, skin_type, age_group')
    .in('id', panelIds)
  const ppMap: Record<string, { skin_type: string; age_group: string }> = {}
  for (const pp of (panelProfiles ?? [])) {
    ppMap[pp.id as string] = { skin_type: (pp.skin_type as string) || '기타', age_group: (pp.age_group as string) || '기타' }
  }

  // 5. 가상 응답 생성 (CONDITIONAL GO 시나리오)
  // KS 문항은 부정형: 1점="그렇지 않다"(안전), 3-4점="그렇다"(발동)
  // → KS 안전 시나리오는 1점(모두 안전), 트리거 패널만 4점으로 강제
  const groupScenarios: Record<string, number[]> = {
    killsignal:   [1, 1, 1, 1, 1],  // 모두 1 = 이상반응 없음(안전), 오직 triggeredKs(idx=2)만 4로 강제
    usage:        [3, 4, 3, 4, 3],
    function:     [3, 3, 4, 3, 3],
    claim_risk:   [3, 2, 3, 2, 3],
    verification: [3, 4, 3, 4, 3],
    overall:      [3, 4, 3, 3, 4],
  }

  const ksQuestions = questions.filter(q => q.isKillSignal || q.group === 'killsignal')
  const triggeredKs = ksQuestions[0]

  const responseMatrix: Record<string, Record<string, number>> = {}
  for (const panelId of panelIds) responseMatrix[panelId] = {}

  const ksKeySet = new Set(ksQuestions.map(q => q.key))

  for (const q of questions) {
    if (q.type !== 'scale') continue
    // KS 문항은 group 값과 무관하게 항상 killsignal 시나리오([4,4,4,4,4]) 적용
    const group = ksKeySet.has(q.key) ? 'killsignal' : (q.group || 'overall')
    const scenario = groupScenarios[group] || groupScenarios.overall

    panelIds.forEach((panelId, idx) => {
      let score = scenario[idx % scenario.length]
      // 1명의 패널에서 첫 번째 KS 문항 이상반응(4점="매우 그렇다") 시뮬레이션
      if (triggeredKs && q.key === triggeredKs.key && idx === 2) score = 4
      // 자연스러운 변동 (±1, 30% 확률) — KS 문항은 jitter 없음(의도치 않은 트리거 방지)
      const jitter = ksKeySet.has(q.key) ? 0 : (Math.random() < 0.3 ? (Math.random() < 0.5 ? 1 : -1) : 0)
      score = Math.max(1, Math.min(4, score + jitter))
      responseMatrix[panelId][q.key] = score
    })
  }

  // 6. 기존 응답 삭제 후 재삽입
  await admin.from('survey_responses').delete().eq('survey_id', survey.id)

  const openWeaknessOptions = [
    '흡수가 조금 느린 것 같습니다.',
    '향이 다소 강하게 느껴졌습니다.',
    '용기가 사용하기 불편했습니다.',
    '발림성이 약간 무거웠습니다.',
    '가격 대비 용량이 아쉽습니다.',
  ]
  const openImprovementOptions = [
    '흡수력을 좀 더 높이면 좋겠습니다.',
    '향을 은은하게 줄여주세요.',
    '용기를 펌프 타입으로 변경하면 좋겠습니다.',
    '지속력이 더 오래갔으면 합니다.',
    '가격이 조금 낮아지면 더 좋을 것 같습니다.',
  ]

  const insertRows = panelIds.map((panelId, idx) => ({
    survey_id: survey.id,
    panel_id: panelId,
    day_checkpoint: 1,
    responses: responseMatrix[panelId],
    open_weakness: openWeaknessOptions[idx % openWeaknessOptions.length],
    open_improvement: openImprovementOptions[idx % openImprovementOptions.length],
    response_duration_sec: 120 + Math.round(Math.random() * 180),
  }))

  const { error: rErr } = await admin.from('survey_responses').insert(insertRows)
  if (rErr) { console.error('❌ 응답 삽입 실패', rErr); process.exit(1) }
  console.log(`✅ survey_responses ${insertRows.length}건 삽입`)

  // survey_panels → completed
  await admin.from('survey_panels').update({ status: 'completed' }).eq('survey_id', survey.id).in('panel_id', panelIds)
  console.log('✅ survey_panels → completed')

  // 7. 통계 계산
  const N = panelIds.length
  const scaleQs = questions.filter(q => q.type === 'scale')

  const getMean = (key: string) => {
    const vals = panelIds.map(pid => responseMatrix[pid][key] ?? 0).filter(v => v > 0)
    return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : 0
  }
  const getSD = (key: string, mean: number) => {
    const vals = panelIds.map(pid => responseMatrix[pid][key] ?? 0).filter(v => v > 0)
    if (vals.length < 2) return 0
    return Math.round(Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / (vals.length - 1)) * 100) / 100
  }
  const getCI = (mean: number, sd: number, n: number): [number, number] => {
    const se = sd / Math.sqrt(n)
    const t = 2.776 // t(4, 0.025) for N=5
    return [Math.round((mean - t * se) * 100) / 100, Math.round((mean + t * se) * 100) / 100]
  }

  const overallQ  = scaleQs.find(q => q.group === 'overall' && !q.key.includes('purchase') && !q.key.includes('recommend'))
  const purchaseQ = scaleQs.find(q => q.group === 'overall' && (q.key.includes('purchase') || q.label.includes('구매')))
  const recommendQ = scaleQs.find(q => q.group === 'overall' && (q.key.includes('recommend') || q.label.includes('추천')))

  const satMean = overallQ ? getMean(overallQ.key) : 3.2
  const satSD   = overallQ ? getSD(overallQ.key, satMean) : 0.45
  const [satCiL, satCiU] = getCI(satMean, satSD, N)
  const purchaseMean  = purchaseQ ? getMean(purchaseQ.key) : 3.0
  const recommendMean = recommendQ ? getMean(recommendQ.key) : 3.2
  const recommendTop2 = recommendQ
    ? Math.round(panelIds.filter(pid => (responseMatrix[pid][recommendQ.key] ?? 0) >= 3).length / N * 100) / 100
    : 0.6

  const threshold = (project.satisfaction_threshold as number) ?? 3.0

  const itemAnalysis = scaleQs
    .filter(q => q.group !== 'killsignal' && q.group !== 'verification' && !ksKeySet.has(q.key))
    .map(q => {
      const mean = getMean(q.key)
      const sd   = getSD(q.key, mean)
      const [ci_lower, ci_upper] = getCI(mean, sd, N)
      const baseR = (q.group === 'function' || q.group === 'usage') ? 0.6 : 0.3
      const correlation_r = Math.max(0.1, Math.min(0.99, Math.round((baseR + (Math.random() - 0.5) * 0.3) * 100) / 100))
      return { name: q.label, mean, sd, ci_lower, ci_upper, correlation_r, is_strength: ci_lower > threshold, is_weakness: ci_upper < threshold }
    })

  // KS 문항은 부정형: 1점=안전, 3-4점=이상반응 발동
  const killSignals = ksQuestions.map(q => {
    const scores  = panelIds.map(pid => responseMatrix[pid][q.key] ?? 1)
    const triggered = scores.filter(s => s >= 3).length  // 3점 이상 = 부작용 체감
    const ratio = Math.round((triggered / N) * 100) / 100
    return {
      name: q.label,
      ratio,
      triggered,
      // N=5 기준: 1명=20% → warning, 2명+=40% → danger
      level: (ratio >= 0.35 ? 'danger' : ratio >= 0.15 ? 'warning' : 'safe') as 'safe' | 'warning' | 'danger',
      ci_lower: Math.max(0, Math.round((ratio - 0.15) * 100) / 100),
      ci_upper: Math.min(1, Math.round((ratio + 0.15) * 100) / 100),
      comment: triggered === 0 ? '해당 이상반응 보고 없음' : `${triggered}명 경미한 반응 보고, 모니터링 필요`,
    }
  })

  const skinTypes = ['건성', '지성', '복합성', '중성', '민감성']
  const cohortAnalysis = skinTypes.map(st => {
    const cohortPanels = panelIds.filter(pid => ppMap[pid]?.skin_type === st)
    if (!cohortPanels.length) return null
    const avg = (key: string) => {
      const vals = cohortPanels.map(pid => responseMatrix[pid][key] ?? 3)
      return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100
    }
    return {
      skin_type: st,
      satisfaction: overallQ ? avg(overallQ.key) : 3,
      purchase: purchaseQ ? avg(purchaseQ.key) : 3,
      recommend: recommendQ ? avg(recommendQ.key) : 3,
      count: cohortPanels.length,
    }
  }).filter(Boolean)

  const keyDrivers = [...itemAnalysis]
    .sort((a, b) => (b.correlation_r ?? 0) - (a.correlation_r ?? 0))
    .slice(0, 5)
    .map((d, i) => ({ label: d.name, pearson_r: d.correlation_r ?? 0, rank: i + 1 }))

  const satScore   = Math.min(1, Math.max(0, (satMean - 1) / 3))
  const purchScore = Math.min(1, Math.max(0, (purchaseMean - 1) / 3))
  const ksScore    = killSignals.every(k => k.level === 'safe') ? 1 : killSignals.some(k => k.level === 'danger') ? 0.4 : 0.7
  const successProbability = Math.round((satScore * 0.4 + purchScore * 0.4 + ksScore * 0.2) * 100)

  const hasKsDanger = killSignals.some(k => k.level === 'danger')
  const verdict = hasKsDanger ? 'NO-GO' : satMean >= threshold + 0.5 ? 'GO' : satMean >= threshold ? 'CONDITIONAL GO' : 'NO-GO'

  const strengths  = itemAnalysis.filter(i => i.is_strength).map(i => i.name)
  const weaknesses = itemAnalysis.filter(i => i.is_weakness).map(i => i.name)

  console.log(`\n📊 판정: ${verdict}`)
  console.log(`   전반 만족도: ${satMean} (기준 ${threshold})`)
  console.log(`   구매의향: ${purchaseMean}`)
  console.log(`   강점: ${strengths.join(', ') || '없음'}`)
  console.log(`   약점: ${weaknesses.join(', ') || '없음'}`)
  console.log(`   Kill Signal: ${killSignals.map(k => `${k.name}(${k.level})`).join(', ') || '없음'}`)
  console.log(`   성공확률: ${successProbability}%`)

  // 8. 기존 분석 결과 삭제 후 재삽입
  await admin.from('analysis_results').delete().eq('project_id', projectId)

  const { error: aErr } = await admin.from('analysis_results').insert({
    project_id: projectId,
    verdict,
    summary: {
      satisfaction_mean: satMean, satisfaction_sd: satSD,
      satisfaction_ci_lower: satCiL, satisfaction_ci_upper: satCiU,
      purchase_intent_mean: purchaseMean, recommend_mean: recommendMean,
      recommend_top2_ratio: recommendTop2, total_responses: N,
    },
    item_analysis: itemAnalysis,
    cohort_analysis: cohortAnalysis,
    kill_signals: killSignals,
    success_model: keyDrivers,
    success_probability: successProbability,
    core_usp: strengths.length ? `${strengths[0]} 우수 — 핵심 셀링포인트로 활용 가능` : '전반적 사용감 양호',
    max_penalty: weaknesses.length ? `${weaknesses[0]} 지표 미달 — 마케팅 클레임 제한 필요` : '특이 페널티 없음',
    recommended_action: verdict === 'GO'
      ? '현재 처방 유지. 강점 위주 상세페이지 구성 후 출시 진행.'
      : verdict === 'CONDITIONAL GO'
        ? `${weaknesses.length ? weaknesses[0] + ' 개선 후' : '마이너 이슈 수정 후'} 소규모 2차 검증 진행.`
        : 'Kill Signal 원인 분석 후 처방 재설계. 현 샘플 출시 보류.',
    key_drivers: keyDrivers,
    rd_guide: {
      dont: weaknesses.length
        ? [`${weaknesses[0]} 관련 마케팅 클레임 사용 자제`, '현 처방 대량 생산 즉시 진행 자제']
        : ['기능성 클레임 과장 표현 자제'],
      do: strengths.length
        ? [`${strengths[0]} 강점을 전면 내세운 상세페이지 구성`, '패널 피드백 기반 질감·향 미세 조정 검토']
        : ['사용감 개선 집중', '소규모 추가 검증 진행'],
    },
    marketing_guide: {
      targeting: strengths.length ? `${strengths[0]}을 중시하는 20~40대 여성` : '피부 관리에 관심 있는 20~40대',
      channel: '인스타그램 · 유튜브 뷰티 채널 (사용감 중심 콘텐츠)',
      message: strengths.length ? `"바르는 순간 ${strengths[0]} 차이"` : '"부드럽고 가벼운 수분 충전"',
    },
    next_steps: [
      { step: 1, title: '처방 미세 조정', description: weaknesses.length ? `${weaknesses[0]} 지표 개선을 위한 연구소 피드백 전달` : '현 처방 유지 확정' },
      { step: 2, title: '2차 소규모 검증', description: '조정된 샘플로 10~15명 대상 추가 테스트 진행' },
      { step: 3, title: '출시 전략 수립', description: `${strengths.length ? strengths[0] + ' 강점' : '핵심 가치'}을 중심으로 마케팅 채널별 전략 확정` },
    ],
  })
  if (aErr) { console.error('❌ 분석 결과 삽입 실패', aErr); process.exit(1) }
  console.log('✅ analysis_results 삽입')

  // 9. 프로젝트 상태 → completed, 설문 → closed
  await admin.from('projects').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', projectId)
  await admin.from('surveys').update({ status: 'closed' }).eq('id', survey.id)
  console.log('✅ 프로젝트 → completed, 설문 → closed')

  console.log(`\n🎉 완료! 리포트 확인: /client/projects/${projectId}/results`)
}

main().catch(e => { console.error(e); process.exit(1) })
