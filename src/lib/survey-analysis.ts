/**
 * 설문 문항 극성(polarity) 감지 및 점수 정규화 유틸리티
 *
 * 극성(polarity)이란:
 *  - 'positive': 높은 점수일수록 좋음 (ex. "발림성이 좋다" → 4점이 최고)
 *  - 'negative': 낮은 점수일수록 좋음 (ex. "따가움을 느꼈다" → 1점이 최고)
 *
 * KS(Kill Signal) 문항은 polarity 값과 무관하게 항상 negative로 처리됩니다.
 */

import type { SurveyQuestion } from './types'

// ──────────────────────────────────────────────────────────
// 부정문항 판별 패턴 (문장 맥락까지 고려)
//
// 규칙:
//  1. "없다/적다/않다/안" 등 부정어가 붙으면 → positive로 유지
//     ("끈적임이 적다", "자극 없다" 같은 이중부정·약화 표현)
//  2. 부정 경험 명사 + "느꼈다/발생했다/심하다/있었다" 조합 → negative
//  3. 독립적으로 부정 의미를 내포하는 완성 표현 → negative
// ──────────────────────────────────────────────────────────

/** 긍정화 접미사 — 이게 뒤에 오면 부정어라도 positive로 반전 */
const POSITIVE_SUFFIX = ['없다', '없어', '없음', '적다', '적어', '않다', '않아', '안 ', '안느', '편이다', '편이야', '괜찮']

/** 완전한 부정 경험 표현 (패턴 전체가 부정 의미) */
const NEGATIVE_PATTERNS: string[] = [
  // 자극·이상반응 (직접 경험 표현)
  '따가움을', '따가움이 느', '화끈거림을', '화끈거림이', '화끈하다', '따갑다',
  '트러블이 발생', '뾰루지', '발진이', '알레르기', '이상반응', '부작용',
  '붉어졌다', '붉어짐이', '가려움을', '가렵다',
  '자극을 느', '자극감이', '자극적이',
  // 불편·부정적 경험
  '불편하다', '불편함을', '불쾌하다', '불쾌감', '거부감이',
  '밀린다', '밀림이', '뭉친다', '뭉침이',
  '끈적임을 느', '끈적임이 심', '끈적거린다', '번들거린다',
  '무겁게 느', '무거워서', '답답하다',
  '건조해진다', '건조함을 느', '오히려 건조',
  '냄새가 난다', '냄새가 거', '악취', '이취',
  '이물감',
  // KS 전형 표현
  '눈이 따가', '눈 주위.*따',
  '피부가 붉어', '피부 붉',
  '사용 후.*발생',
  // 문항 전체가 부정 경험 확인형
  '을 느꼈다', '을 경험했다', '이 발생했다',
]

// ──────────────────────────────────────────────────────────
// 1. 패턴 기반 자동 극성 감지
// ──────────────────────────────────────────────────────────
export function detectPolarityFromLabel(label: string): 'positive' | 'negative' {
  if (!label) return 'positive'

  // 1단계: 긍정화 접미사가 있으면 바로 positive (ex: "끈적임이 적다", "자극 없다")
  if (POSITIVE_SUFFIX.some((sfx) => label.includes(sfx))) return 'positive'

  // 2단계: 부정 패턴 매칭 (정규식 지원)
  const matched = NEGATIVE_PATTERNS.some((pat) => {
    try { return new RegExp(pat).test(label) }
    catch { return label.includes(pat) }
  })
  return matched ? 'negative' : 'positive'
}

// ──────────────────────────────────────────────────────────
// 2. 문항의 최종 극성 결정 (명시 설정 > KS > 키워드 감지)
// ──────────────────────────────────────────────────────────
export function resolvePolarity(q: SurveyQuestion): 'positive' | 'negative' {
  // KS 문항은 항상 negative
  if (q.isKillSignal) return 'negative'
  // 명시적으로 설정된 경우
  if (q.polarity) return q.polarity
  // 키워드 자동 감지
  return detectPolarityFromLabel(q.label)
}

// ──────────────────────────────────────────────────────────
// 3. 점수 정규화 (4점 척도 기준)
//    - positive 문항: 원점수 유지 (1=최저 ~ 4=최고)
//    - negative 문항: 역산 (5 - score) → 1점이 최고가 되도록
// ──────────────────────────────────────────────────────────
export function normalizeScore(rawScore: number, polarity: 'positive' | 'negative', maxScale = 4): number {
  if (polarity === 'negative') return (maxScale + 1) - rawScore
  return rawScore
}

// ──────────────────────────────────────────────────────────
// 4. KS 발동 여부 판단 (부정문항 기준)
//    - 원점수 >= 3 = "그렇다/매우 그렇다" = 이상반응 체감 = 발동
// ──────────────────────────────────────────────────────────
export function isKsTrigger(rawScore: number, triggerThreshold = 3): boolean {
  return rawScore >= triggerThreshold
}
