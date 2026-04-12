-- ============================================================
-- 나들목 Freemium 피벗 마이그레이션
-- Supabase SQL Editor에서 순서대로 실행
-- ============================================================

-- 1. projects 테이블 컬럼 추가
ALTER TABLE projects ADD COLUMN IF NOT EXISTS panel_source TEXT DEFAULT 'internal'
  CHECK (panel_source IN ('internal', 'mixed', 'external'));
ALTER TABLE projects ADD COLUMN IF NOT EXISTS test_start_date TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS test_end_date TIMESTAMPTZ;

-- 2. panel_profiles 패널 타입 구분
ALTER TABLE panel_profiles ADD COLUMN IF NOT EXISTS panel_type TEXT DEFAULT 'external'
  CHECK (panel_type IN ('external', 'invited'));

-- 3. project_invitations — 패널 초대 토큰 관리
CREATE TABLE IF NOT EXISTS project_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  survey_id UUID REFERENCES surveys(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  name TEXT,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  panel_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  invited_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT now() + interval '14 days',
  UNIQUE(project_id, email)
);
ALTER TABLE project_invitations ENABLE ROW LEVEL SECURITY;

-- 고객사: 자신의 프로젝트 초대 관리
CREATE POLICY IF NOT EXISTS "clients can manage own invitations"
  ON project_invitations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_invitations.project_id
        AND projects.client_id = auth.uid()
    )
  );

-- 초대받은 패널: 자신의 토큰으로 조회
CREATE POLICY IF NOT EXISTS "invited panels can view own invitation"
  ON project_invitations FOR SELECT
  USING (panel_id = auth.uid() OR token IS NOT NULL);

-- 4. analysis_access — 분석 결과 열람 권한
CREATE TABLE IF NOT EXISTS analysis_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  plan TEXT CHECK (plan IN ('standard', 'premium')),
  credits_used INTEGER NOT NULL DEFAULT 0,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, client_id)
);
ALTER TABLE analysis_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "clients can read own analysis access"
  ON analysis_access FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY IF NOT EXISTS "service role can manage analysis access"
  ON analysis_access FOR ALL
  USING (auth.role() = 'service_role');

-- 5. client_credits — 고객사 크레딧 잔액
CREATE TABLE IF NOT EXISTS client_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  balance INTEGER DEFAULT 0 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE client_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "clients can read own credits"
  ON client_credits FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY IF NOT EXISTS "service role can manage credits"
  ON client_credits FOR ALL
  USING (auth.role() = 'service_role');

-- 6. subscriptions — 구독 정보 (TossPayments 빌링키)
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  plan TEXT CHECK (plan IN ('starter', 'growth')),  -- starter=100cr/29000, growth=300cr/49000
  billing_key TEXT NOT NULL,
  customer_key TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'paused')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  canceled_at TIMESTAMPTZ
);
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "clients can read own subscriptions"
  ON subscriptions FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY IF NOT EXISTS "service role can manage subscriptions"
  ON subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- 7. credit_transactions — 크레딧 충전/소모 이력
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,  -- 양수: 충전, 음수: 소모
  transaction_type TEXT CHECK (transaction_type IN ('subscription', 'consume')),
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  consumed_plan TEXT CHECK (consumed_plan IN ('standard', 'premium')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "clients can read own transactions"
  ON credit_transactions FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY IF NOT EXISTS "service role can manage transactions"
  ON credit_transactions FOR ALL
  USING (auth.role() = 'service_role');

-- 8. payments 테이블에 구독 컨텍스트 컬럼 추가
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_context TEXT DEFAULT 'analysis_unlock'
  CHECK (payment_context IN ('service', 'subscription', 'analysis_unlock'));
