import type { QuestionGroup } from './types'

export const CATEGORIES = ['화장품', '퍼스널케어', '식품', '생활용품'] as const

export const PRODUCT_LINES: Record<string, string[]> = {
  '화장품': ['클렌저', '토너', '세럼·앰플', '크림'],
}

export const AVAILABLE_CATEGORIES = ['화장품'] // 현재 활성화된 카테고리

export const QUESTION_GROUPS: { key: QuestionGroup; label: string; color: string; description: string }[] = [
  { key: 'killsignal', label: 'Kill Signal', color: 'nogo', description: '치명적 결함 감지 문항' },
  { key: 'usage', label: '사용감', color: 'info', description: '제형, 발림성, 흡수력 등' },
  { key: 'function', label: '기능성', color: 'go', description: '보습, 미백, 주름개선 등' },
  { key: 'claim_risk', label: 'Claim Risk', color: 'warning', description: '마케팅 문구 검증' },
  { key: 'verification', label: '검증문항', color: 'info', description: '응답 일관성·성실도 검증' },
  { key: 'overall', label: '종합평가', color: 'default', description: '만족도, 구매의향, 추천의향' },
]

export const DEFAULT_SCALE_LABELS = ['매우 그렇지 않다', '그렇지 않다', '그렇다', '매우 그렇다']

export function getGroupConfig(group?: QuestionGroup) {
  return QUESTION_GROUPS.find((g) => g.key === group) || QUESTION_GROUPS[QUESTION_GROUPS.length - 1]
}
