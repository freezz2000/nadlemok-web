// 나들목 공통 타입 정의

export type UserRole = 'admin' | 'client' | 'panel'

export type ProjectStatus = 'pending' | 'draft' | 'confirmed' | 'approved' | 'recruiting' | 'matching' | 'testing' | 'analyzing' | 'completed' | 'rejected'

export type SurveyStatus = 'draft' | 'active' | 'closed'

export type PanelMatchStatus = 'matched' | 'accepted' | 'completed' | 'dropped'

export interface Payment {
  id: string
  user_id: string
  project_id?: string
  order_id: string
  payment_key?: string
  amount: number
  plan: ServicePlan
  status: 'DONE' | 'CANCELED' | 'FAILED'
  paid_at?: string
  created_at: string
}

export type Verdict = 'GO' | 'CONDITIONAL GO' | 'NO-GO'

export type ServicePlan = 'basic' | 'standard' | 'premium'

export interface Profile {
  id: string
  role: UserRole
  name: string
  company?: string
  phone?: string
  created_at: string
}

export interface PanelProfile {
  id: string
  gender?: string
  age_group?: string
  skin_type?: string
  skin_concern?: string
  is_sensitive: boolean
  current_product?: string
  tier: string
  is_available: boolean
  terms_agreed_at?: string
  terms_marketing_agreed?: boolean
  address_zipcode?: string
  address?: string
  address_detail?: string
}

export interface ClientProfile {
  id: string
  company_name?: string
  contact_name?: string
  contact_phone?: string
  position?: string
  business_number?: string
  tax_email?: string
  terms_agreed_at?: string
  terms_marketing_agreed?: boolean
  created_at: string
}

export type QuestionGroup = 'killsignal' | 'usage' | 'function' | 'claim_risk' | 'verification' | 'overall'

export interface SurveyQuestion {
  key: string
  label: string
  type: 'scale' | 'text' | 'choice'
  scale?: number
  scaleLabels?: string[]  // 4점 각각의 답변 설명 (예: ['전혀 아니다', '아니다', '그렇다', '매우 그렇다'])
  choices?: string[]      // 객관식 선택지 목록
  isKillSignal: boolean
  group?: QuestionGroup
  order: number
}

export interface SurveyTemplate {
  id: string
  name: string
  description?: string
  category?: string
  product_line?: string
  questions: SurveyQuestion[]
  created_by?: string
  is_default: boolean
  created_at: string
}

export interface Project {
  id: string
  client_id?: string
  product_name: string
  product_category?: string
  plan?: ServicePlan
  panel_size: number
  test_duration: number
  status: ProjectStatus
  ks_warn_threshold: number
  ks_danger_threshold: number
  satisfaction_threshold: number
  created_at: string
  completed_at?: string
}

export interface Survey {
  id: string
  project_id: string
  template_id?: string
  title: string
  questions: SurveyQuestion[]
  day_checkpoint: number[]
  start_date?: string
  end_date?: string
  status: SurveyStatus
  created_at: string
}

export interface SurveyPanel {
  id: string
  survey_id: string
  panel_id: string
  matched_at: string
  status: PanelMatchStatus
}

export interface SurveyResponse {
  id: string
  survey_id: string
  panel_id: string
  day_checkpoint: number
  responses: Record<string, number>
  open_weakness?: string
  open_improvement?: string
  responded_at: string
  response_duration_sec?: number
}

export interface AnalysisResult {
  id: string
  project_id: string
  verdict: Verdict
  summary: {
    satisfaction_mean: number
    satisfaction_sd?: number
    satisfaction_ci_lower?: number
    satisfaction_ci_upper?: number
    purchase_intent_mean: number
    recommend_mean: number
    recommend_top2_ratio?: number   // 추천 의향 Top-2 비율 (0~1)
    vs_existing_mean?: number
    total_responses: number
  }
  item_analysis: {
    name: string
    mean: number
    sd?: number
    ci_lower?: number
    ci_upper?: number
    kill_signal_ratio?: number
    negative_ratio?: number
    correlation_r?: number          // 구매의향과의 피어슨 r
    penalty?: number
    note?: string
    is_strength?: boolean           // CI lower > 만족도 기준점
    is_weakness?: boolean           // CI lower < 만족도 기준점
  }[]
  cohort_analysis: {
    skin_type: string
    satisfaction: number
    purchase: number
    recommend: number
    vs_existing?: number
    count: number
  }[]
  kill_signals: {
    name: string
    label?: string
    ratio: number
    triggered?: number
    level: 'safe' | 'warning' | 'danger'
    ci_lower?: number
    ci_upper?: number
    comment?: string                // 예: "극소수 민감성 반응으로 허용 범위 내"
  }[]
  success_model: {
    name?: string
    score?: number
    weight?: number
    weighted?: number
    top5_drivers?: string[]
    cv_r2?: number
    reliability_alpha?: number
  } | {
    name: string
    score: number
    weight: number
    weighted: number
  }[]
  success_probability: number
  core_usp?: string
  max_penalty?: string
  recommended_action?: string
  // 확장 필드 (Python 분석 결과)
  key_drivers?: {
    label: string
    pearson_r: number
    rank: number
  }[]
  rd_guide?: {
    dont: string[]
    do: string[]
    objective?: string              // 처방 목표
  }
  marketing_guide?: {
    targeting: string
    channel: string
    message?: string
  }
  next_steps?: {
    step: number
    title: string
    description: string
  }[]
  age_cohort?: {
    group_a_label: string
    group_a_mean: number
    group_b_label: string
    group_b_mean: number
    p_value: number
    is_significant: boolean
    insight: string
  }
  analyzed_at: string
}

export interface Inquiry {
  id: string
  company: string
  name: string
  phone: string
  email: string
  message?: string
  is_read: boolean
  created_at: string
}
