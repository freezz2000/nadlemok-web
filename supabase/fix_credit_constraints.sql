-- ============================================================
-- 크레딧 충전 관련 제약 조건 수정
-- Supabase SQL Editor에서 실행하세요
-- ============================================================

-- 1. payments.plan CHECK 제약에 'credit' 추가
--    (기존: basic/standard/premium만 허용 → credit 추가)
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_plan_check;
ALTER TABLE payments ADD CONSTRAINT payments_plan_check
  CHECK (plan IN ('basic', 'standard', 'premium', 'credit'));

-- 2. payments.payment_context 컬럼 추가 (없으면) 후 제약 설정
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_context TEXT DEFAULT 'service';
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_context_check;
ALTER TABLE payments ADD CONSTRAINT payments_payment_context_check
  CHECK (payment_context IN ('service', 'subscription', 'analysis_unlock', 'credit_charge'));

-- 3. client_credits 테이블이 없으면 생성 (이미 있으면 무시)
CREATE TABLE IF NOT EXISTS client_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  balance INTEGER DEFAULT 0 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE client_credits ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'client_credits' AND policyname = 'clients can read own credits'
  ) THEN
    CREATE POLICY "clients can read own credits"
      ON client_credits FOR SELECT USING (client_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'client_credits' AND policyname = 'service role can manage credits'
  ) THEN
    CREATE POLICY "service role can manage credits"
      ON client_credits FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- 4. credit_transactions 테이블이 없으면 생성 (이미 있으면 무시)
--    subscriptions 테이블 참조 제거 (미생성 시 에러 방지)
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  transaction_type TEXT CHECK (transaction_type IN ('subscription', 'consume')),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  consumed_plan TEXT CHECK (consumed_plan IN ('standard', 'premium')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'credit_transactions' AND policyname = 'clients can read own transactions'
  ) THEN
    CREATE POLICY "clients can read own transactions"
      ON credit_transactions FOR SELECT USING (client_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'credit_transactions' AND policyname = 'service role can manage transactions'
  ) THEN
    CREATE POLICY "service role can manage transactions"
      ON credit_transactions FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- 5. panel_setup에서 사용하는 projects 컬럼들 추가 (없으면)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS panel_source TEXT DEFAULT 'internal'
  CHECK (panel_source IN ('internal', 'mixed', 'external'));
ALTER TABLE projects ADD COLUMN IF NOT EXISTS external_panel_count INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS delivery_service BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS operation_fee INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS delivery_service_fee INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS quote_total INTEGER DEFAULT 0;
