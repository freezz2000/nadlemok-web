/**
 * 실제 응답 데이터로 분석 실행
 * Usage: npx ts-node -e "require('@next/env').loadEnvConfig(process.cwd())" scripts/run-analysis.ts [projectId]
 */
import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

import { createClient } from '@supabase/supabase-js'

// ── 극성 유틸 (survey-analysis.ts 동일 로직 복사) ─────────────────
const POSITIVE_SUFFIX = ['없다', '없어', '없음', '적다', '적어', '않다', '않아', '안 ', '안느', '편이다', '괜찮']
const NEGATIVE_PATTERNS = [
  '따가움을', '따가움이 느', '화끈거림을', '화끈거림이', '화끈하다', '따갑다',
  '트러블이 발생', '뾰루지', '발진이', '알레르기', '이상반응', '부작용',
  '붉어졌다', '붉어짐이', '가려움을', '가렵다', '자극을 느', '자극감이', '자극적이',
  '불편하다', '불편함을', '불쾌하다', '불쾌감', '거부감이',
  '밀린다', '밀림이', '뭉친다', '뭉침이',
  '끈적임을 느', '끈적임이 심', '끈적거린다', '번들거린다',
  '무겁게 느', '무거워서', '답답하다', '건조해진다', '건조함을 느', '오히려 건조',
  '냄새가 난다', '냄새가 거', '악취', '이취', '이물감',
  '눈이 따가', '피부가 붉어', '사용 후.*발생',
  '을 느꼈다', '을 경험했다', '이 발생했다',
]
function detectPolarityFromLabel(label: string): 'positive' | 'negative' {
  if (!label) return 'positive'
  if (POSITIVE_SUFFIX.some((sfx) => label.includes(sfx))) return 'positive'
  const matched = NEGATIVE_PATTERNS.some((pat) => {
    try { return new RegExp(pat).test(label) } catch { return label.includes(pat) }
  })
  return matched ? 'negative' : 'positive'
}
function resolvePolarity(q: { polarity?: string; isKillSignal?: boolean; label: string }): 'positive' | 'negative' {
  if (q.isKillSignal) return 'negative'
  if (q.polarity === 'positive' || q.polarity === 'negative') return q.polarity
  return detectPolarityFromLabel(q.label)
}
function normalizeScore(raw: number, polarity: 'positive' | 'negative', maxScale = 4): number {
  return polarity === 'negative' ? (maxScale + 1) - raw : raw
}

const projectId = process.argv[2]
if (!projectId) { console.error('❌ projectId를 인수로 전달하세요'); process.exit(1) }

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  console.log(`🔍 분석 시작 (projectId: ${projectId})`)

  // 1. 프로젝트 조회
  const { data: project, error: projErr } = await admin
    .from('projects')
    .select('id, product_name, status, satisfaction_threshold, ks_warn_threshold, ks_danger_threshold')
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

  const questions: { key: string; label: string; type: string; group?: string; isKillSignal?: boolean; choices?: string[] }[]
    = survey.questions || []
  console.log(`📋 설문 문항 ${questions.length}개`)

  // 3. 실제 응답 조회 (패널별 최신 checkpoint)
  const { data: rawResponses } = await admin
    .from('survey_responses')
    .select('panel_id, responses, open_weakness, open_improvement, responded_at, response_duration_sec, day_checkpoint')
    .eq('survey_id', survey.id)

  if (!rawResponses?.length) { console.error('❌ 응답 데이터 없음'); process.exit(1) }

  // panel_id별 최신 checkpoint만 사용
  const responseMap: Record<string, Record<string, number | string>> = {}
  const latestCheckpoint: Record<string, number> = {}
  for (const r of rawResponses) {
    const pid = r.panel_id as string
    const ckpt = (r.day_checkpoint as number) ?? 1
    if (!latestCheckpoint[pid] || ckpt > latestCheckpoint[pid]) {
      latestCheckpoint[pid] = ckpt
      responseMap[pid] = (r.responses as Record<string, number | string>) || {}
    }
  }
  const panelIds = Object.keys(responseMap)
  const N = panelIds.length
  console.log(`👥 응답 패널 ${N}명`)

  // 4. 패널 프로필 조회 (코호트용)
  const { data: panelProfiles } = await admin
    .from('panel_profiles')
    .select('id, skin_type, age_group')
    .in('id', panelIds)
  const ppMap: Record<string, { skin_type: string; age_group: string }> = {}
  for (const pp of (panelProfiles ?? [])) {
    ppMap[pp.id as string] = { skin_type: (pp.skin_type as string) || '기타', age_group: (pp.age_group as string) || '기타' }
  }

  // 5. 통계 함수
  const scaleQs = questions.filter(q => q.type === 'scale')
  const ksQuestions = scaleQs.filter(q => q.isKillSignal || q.group === 'killsignal')
  const ksKeySet = new Set(ksQuestions.map(q => q.key))
  const threshold = (project.satisfaction_threshold as number) ?? 3.0
  // 프로젝트별 KS 임계값 (관리자 설정값 우선, 없으면 기본값 5%/10%)
  const ksWarnThreshold  = (project.ks_warn_threshold  as number) ?? 0.05
  const ksDangerThreshold = (project.ks_danger_threshold as number) ?? 0.10
  console.log(`⚙️  KS 임계값: Warning≥${Math.round(ksWarnThreshold*100)}% / Danger≥${Math.round(ksDangerThreshold*100)}%  (만족도 기준: ${threshold})`)

  // 정규화된 점수 배열 반환 (polarity 반영)
  const getNormVals = (q: typeof questions[0]): number[] => {
    const polarity = resolvePolarity(q)
    return panelIds
      .map(pid => responseMap[pid][q.key])
      .filter((v): v is number => typeof v === 'number' && v > 0)
      .map(v => normalizeScore(v, polarity))
  }

  const getMeanByQ = (q: typeof questions[0]): number => {
    const vals = getNormVals(q)
    return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : 0
  }
  const getSDByQ = (q: typeof questions[0], mean: number): number => {
    const vals = getNormVals(q)
    if (vals.length < 2) return 0
    return Math.round(Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / (vals.length - 1)) * 100) / 100
  }
  // 하위 호환용 (key 기반 — positive 문항에만 사용)
  const getMean = (key: string): number => {
    const vals = panelIds.map(pid => responseMap[pid][key]).filter((v): v is number => typeof v === 'number' && v > 0)
    return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : 0
  }
  const getCI = (mean: number, sd: number, n: number): [number, number] => {
    if (n < 2) return [mean, mean]
    const tTable: Record<number, number> = { 2: 12.706, 3: 4.303, 4: 3.182, 5: 2.776, 6: 2.571, 7: 2.447, 8: 2.365, 9: 2.306, 10: 2.228 }
    const t = tTable[n] ?? 2.0
    const se = sd / Math.sqrt(n)
    return [Math.round((mean - t * se) * 100) / 100, Math.round((mean + t * se) * 100) / 100]
  }

  // 6. 전반 만족도·구매의향·추천의향 추출 (정규화 점수 사용)
  const overallQ   = scaleQs.find(q => q.group === 'overall' && !q.key.includes('purchase') && !q.key.includes('recommend') && !ksKeySet.has(q.key))
  const purchaseQ  = scaleQs.find(q => q.group === 'overall' && (q.key.includes('purchase') || q.label.includes('구매')))
  const recommendQ = scaleQs.find(q => q.group === 'overall' && (q.key.includes('recommend') || q.label.includes('추천')))

  // overall 그룹이 없으면 KS/verification 제외한 전체 평균 (정규화 점수 기준)
  let satMean = overallQ ? getMeanByQ(overallQ) : 0
  if (!satMean) {
    const nonKsScaleQs = scaleQs.filter(q => !ksKeySet.has(q.key) && q.group !== 'verification')
    const allVals = panelIds.flatMap(pid =>
      nonKsScaleQs.map(q => {
        const raw = responseMap[pid][q.key]
        if (typeof raw !== 'number' || raw <= 0) return null
        return normalizeScore(raw, resolvePolarity(q))
      }).filter((v): v is number => v !== null)
    )
    satMean = allVals.length ? Math.round((allVals.reduce((a, b) => a + b, 0) / allVals.length) * 100) / 100 : 3.0
  }
  const satSD = overallQ ? getSDByQ(overallQ, satMean) : 0.5
  const [satCiL, satCiU] = getCI(satMean, satSD, N)

  const purchaseMean  = purchaseQ ? getMeanByQ(purchaseQ) : satMean * 0.9
  const recommendMean = recommendQ ? getMeanByQ(recommendQ) : satMean * 0.95
  // 추천의향 Top-2: 정규화 후 3점 이상 (positive 문항 기준) = 원점수 3-4점
  const recommendTop2 = recommendQ
    ? Math.round(panelIds.filter(pid => {
        const raw = responseMap[pid][recommendQ.key] as number ?? 0
        const norm = normalizeScore(raw, resolvePolarity(recommendQ))
        return norm >= 3
      }).length / N * 100) / 100
    : 0.6

  // 7. Kill Signal 분석
  // KS 문항은 부정형: 1점="그렇지 않다"(안전), 3-4점="그렇다"(발동)
  const killSignals = ksQuestions.map(q => {
    const scores    = panelIds.map(pid => (responseMap[pid][q.key] as number) ?? 1)
    const triggered = scores.filter(s => s >= 3).length  // 3점 이상 = 부작용 체감
    const ratio     = Math.round((triggered / N) * 100) / 100
    const level     = ratio >= ksDangerThreshold ? 'danger' : ratio >= ksWarnThreshold ? 'warning' : 'safe'
    console.log(`   KS [${level}] ${q.label}: ${triggered}/${N}명 반응 (${Math.round(ratio * 100)}%)`)
    return {
      name: q.label,
      ratio,
      triggered,
      level: level as 'safe' | 'warning' | 'danger',
      ci_lower: Math.max(0, Math.round((ratio - 1 / N) * 100) / 100),
      ci_upper: Math.min(1, Math.round((ratio + 1 / N) * 100) / 100),
      comment: triggered === 0 ? '해당 이상반응 보고 없음' : `${triggered}명 경미한 반응 보고, 모니터링 필요`,
    }
  })

  // 8. 항목 분석 (KS / verification 제외) — 정규화 점수 기반
  const analysisQs = scaleQs.filter(q => !ksKeySet.has(q.key) && q.group !== 'verification')
  const itemAnalysis = analysisQs.map(q => {
    const polarity = resolvePolarity(q)
    const mean = getMeanByQ(q)       // 정규화 점수 평균
    const sd   = getSDByQ(q, mean)
    const [ci_lower, ci_upper] = getCI(mean, sd, N)

    // Pearson r: 정규화된 해당 문항 점수와 전반 만족도 정규화 점수 간 상관
    let correlation_r = 0
    if (overallQ && overallQ.key !== q.key) {
      const satPolarity = resolvePolarity(overallQ)
      const pairs = panelIds.map(pid => {
        const rawX = responseMap[pid][q.key]
        const rawY = responseMap[pid][overallQ.key]
        if (typeof rawX !== 'number' || typeof rawY !== 'number') return null
        return { x: normalizeScore(rawX, polarity), y: normalizeScore(rawY, satPolarity) }
      }).filter((p): p is { x: number; y: number } => p !== null)
      if (pairs.length >= 2) {
        const mx = pairs.reduce((a, p) => a + p.x, 0) / pairs.length
        const my = pairs.reduce((a, p) => a + p.y, 0) / pairs.length
        const num = pairs.reduce((a, p) => a + (p.x - mx) * (p.y - my), 0)
        const den = Math.sqrt(pairs.reduce((a, p) => a + (p.x - mx) ** 2, 0) * pairs.reduce((a, p) => a + (p.y - my) ** 2, 0))
        correlation_r = den > 0 ? Math.round((num / den) * 100) / 100 : 0
      }
    } else {
      correlation_r = Math.max(0.1, Math.min(0.99, Math.round(((mean - 1) / 3 + 0.2) * 100) / 100))
    }
    return {
      name: q.label,
      mean, sd, ci_lower, ci_upper,
      correlation_r,
      is_strength: ci_lower >= threshold,
      is_weakness: ci_upper < threshold,
      polarity,  // 참조용
    }
  })

  // 9. 코호트 분석 (정규화 점수 기반)
  const skinTypes = ['건성', '지성', '복합성', '중성', '민감성']
  const cohortAnalysis = skinTypes.map(st => {
    const cohortPanels = panelIds.filter(pid => ppMap[pid]?.skin_type === st)
    if (!cohortPanels.length) return null
    const avgQ = (q: typeof questions[0]) => {
      const pol = resolvePolarity(q)
      const vals = cohortPanels.map(pid => {
        const raw = responseMap[pid][q.key]
        return typeof raw === 'number' ? normalizeScore(raw, pol) : null
      }).filter((v): v is number => v !== null)
      return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : 0
    }
    return {
      skin_type: st,
      satisfaction: overallQ ? avgQ(overallQ) : satMean,
      purchase: purchaseQ ? avgQ(purchaseQ) : purchaseMean,
      recommend: recommendQ ? avgQ(recommendQ) : recommendMean,
      count: cohortPanels.length,
    }
  }).filter(Boolean)

  // 10. Key Drivers
  const keyDrivers = [...itemAnalysis]
    .sort((a, b) => Math.abs(b.correlation_r) - Math.abs(a.correlation_r))
    .slice(0, 5)
    .map((d, i) => ({ label: d.name, pearson_r: d.correlation_r, rank: i + 1 }))

  // 11. 성공확률 + 판정
  const satScore   = Math.min(1, Math.max(0, (satMean - 1) / 3))
  const purchScore = Math.min(1, Math.max(0, (purchaseMean - 1) / 3))
  const ksScore    = killSignals.every(k => k.level === 'safe') ? 1 : killSignals.some(k => k.level === 'danger') ? 0.4 : 0.7
  const successProbability = Math.round((satScore * 0.4 + purchScore * 0.4 + ksScore * 0.2) * 100)

  const hasKsDanger  = killSignals.some(k => k.level === 'danger')
  const hasKsWarning = killSignals.some(k => k.level === 'warning')
  const verdict = hasKsDanger
    ? 'NO-GO'
    : satMean >= threshold + 0.5
      ? (hasKsWarning ? 'CONDITIONAL GO' : 'GO')
      : satMean >= threshold
        ? 'CONDITIONAL GO'
        : 'NO-GO'

  const strengths  = itemAnalysis.filter(i => i.is_strength).map(i => i.name)
  const weaknesses = itemAnalysis.filter(i => i.is_weakness).map(i => i.name)

  console.log(`\n📊 판정: ${verdict}`)
  console.log(`   전반 만족도: ${satMean} (기준 ${threshold}, CI [${satCiL}, ${satCiU}])`)
  console.log(`   구매의향: ${purchaseMean} | 추천의향: ${recommendMean} | 추천Top2: ${Math.round(recommendTop2 * 100)}%`)
  console.log(`   강점 항목: ${strengths.join(', ') || '없음'}`)
  console.log(`   약점 항목: ${weaknesses.join(', ') || '없음'}`)
  console.log(`   성공확률: ${successProbability}%`)

  // 12. 기존 분석 결과 삭제 후 저장
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
        ? [`${weaknesses[0]} 관련 마케팅 클레임 사용 자제`, '현 처방 그대로 대량 생산 즉시 진행 자제']
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
  if (aErr) { console.error('❌ 분석 결과 저장 실패', aErr); process.exit(1) }
  console.log('✅ analysis_results 저장 완료')

  // 13. 프로젝트 → analyzed (관리자 검토 대기), 설문 → closed
  await admin.from('projects').update({ status: 'analyzed' }).eq('id', projectId)
  await admin.from('surveys').update({ status: 'closed' }).eq('id', survey.id)
  console.log('✅ 프로젝트 → analyzed (관리자 검토 대기), 설문 → closed')

  // 14. survey_panels → completed (응답한 패널만)
  await admin.from('survey_panels').update({ status: 'completed' })
    .eq('survey_id', survey.id).in('panel_id', panelIds)
  console.log('✅ survey_panels → completed')

  console.log(`\n🎉 분석 완료! 리포트: /client/projects/${projectId}/results`)
}

main().catch(e => { console.error(e); process.exit(1) })
