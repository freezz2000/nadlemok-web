-- 결제 내역 테이블 생성
-- Supabase SQL Editor에서 실행

CREATE TABLE IF NOT EXISTS payments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id),
  project_id  UUID REFERENCES projects(id),
  order_id    TEXT UNIQUE NOT NULL,
  payment_key TEXT,
  amount      INTEGER NOT NULL,
  plan        TEXT NOT NULL CHECK (plan IN ('basic', 'standard', 'premium')),
  status      TEXT DEFAULT 'DONE' CHECK (status IN ('DONE', 'CANCELED', 'FAILED')),
  paid_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client can read own payments"
  ON payments FOR SELECT
  USING (user_id = auth.uid());
