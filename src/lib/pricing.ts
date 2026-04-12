/**
 * 나들목 하이브리드 패널 가격 상수 및 계산 유틸리티
 */

// ─── 외부 패널 단가 ───────────────────────────────────────
export const PANEL_PARTICIPATION_FEE = 10_000  // 패널 참가비 (인당)
export const PANEL_CONTAINER_FEE     = 300     // 샘플 용기 (인당)
export const PANEL_DELIVERY_FEE      = 3_000   // 패널→배송비 (인당)
export const PANEL_COST_PER_PERSON   = PANEL_PARTICIPATION_FEE + PANEL_CONTAINER_FEE + PANEL_DELIVERY_FEE
// = 13,300원/인

// ─── 운영 / 대행 고정 비용 ───────────────────────────────
export const OPERATION_FEE           = 50_000  // 운영대행료 (건당 고정)
export const DELIVERY_SERVICE_FEE    = 1_000   // 샘플 배송 대행 소분 작업비 (인당)

// ─── 패널 조건 옵션 ──────────────────────────────────────
export const AGE_RANGE_OPTIONS = [
  { value: '20s', label: '20대' },
  { value: '30s', label: '30대' },
  { value: '40s', label: '40대' },
  { value: '50s', label: '50대 이상' },
]

export const SKIN_TYPE_OPTIONS = [
  { value: 'dry',         label: '건성' },
  { value: 'oily',        label: '지성' },
  { value: 'combination', label: '복합성' },
  { value: 'sensitive',   label: '민감성' },
  { value: 'normal',      label: '중성' },
]

export const SKIN_CONCERN_OPTIONS = [
  { value: 'moisture',  label: '보습' },
  { value: 'wrinkle',   label: '주름' },
  { value: 'whitening', label: '미백' },
  { value: 'acne',      label: '여드름' },
  { value: 'pore',      label: '모공' },
  { value: 'tone',      label: '피부톤' },
  { value: 'redness',   label: '홍조' },
]

// ─── 견적 계산 ────────────────────────────────────────────
export interface QuoteResult {
  panelCost: number         // 패널 비용 소계 (13,300 × N)
  operationFee: number      // 운영대행료 (고정)
  deliveryServiceFee: number // 배송 대행 소분 작업비 (선택)
  total: number             // 합계
}

export function calculateQuote(
  panelCount: number,
  deliveryService: boolean
): QuoteResult {
  const panelCost = PANEL_COST_PER_PERSON * panelCount
  const operationFee = OPERATION_FEE
  const deliveryServiceFee = deliveryService ? DELIVERY_SERVICE_FEE * panelCount : 0
  return {
    panelCost,
    operationFee,
    deliveryServiceFee,
    total: panelCost + operationFee + deliveryServiceFee,
  }
}

export function formatKRW(amount: number): string {
  return amount.toLocaleString('ko-KR') + '원'
}

// ─── 비용 명세 라벨 ───────────────────────────────────────
export function getQuoteBreakdown(panelCount: number, deliveryService: boolean) {
  const q = calculateQuote(panelCount, deliveryService)
  const items = [
    {
      label: `패널 비용 (${formatKRW(PANEL_COST_PER_PERSON)} × ${panelCount}명)`,
      amount: q.panelCost,
      sub: [
        { label: '참가비', amount: PANEL_PARTICIPATION_FEE * panelCount },
        { label: '샘플 용기', amount: PANEL_CONTAINER_FEE * panelCount },
        { label: '배송비', amount: PANEL_DELIVERY_FEE * panelCount },
      ],
    },
    {
      label: '운영대행료 (건당 고정)',
      amount: q.operationFee,
      sub: [],
    },
  ]
  if (deliveryService) {
    items.push({
      label: `샘플 배송 대행 (${formatKRW(DELIVERY_SERVICE_FEE)} × ${panelCount}명)`,
      amount: q.deliveryServiceFee,
      sub: [],
    })
  }
  return { items, total: q.total }
}
