-- 고객사 상세 프로필 테이블 생성 및 정책 설정
-- Supabase SQL Editor에서 실행

-- 테이블 생성 (없는 경우에만)
CREATE TABLE IF NOT EXISTS client_profiles (
  id                     UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  company_name           TEXT,
  contact_name           TEXT,
  contact_phone          TEXT,
  position               TEXT,
  business_number        TEXT,
  tax_email              TEXT,
  terms_agreed_at        TIMESTAMPTZ,
  terms_marketing_agreed BOOLEAN DEFAULT false,
  created_at             TIMESTAMPTZ DEFAULT now()
);

-- 컬럼 추가 (이미 테이블이 있던 경우 누락된 컬럼 보완)
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS tax_email TEXT;

ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;

-- 기존 정책 제거 후 재생성
DROP POLICY IF EXISTS "client can read own profile"        ON client_profiles;
DROP POLICY IF EXISTS "client can insert own profile"      ON client_profiles;
DROP POLICY IF EXISTS "client can update own profile"      ON client_profiles;
DROP POLICY IF EXISTS "admin can read all client profiles" ON client_profiles;

CREATE POLICY "client can read own profile"
  ON client_profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "client can insert own profile"
  ON client_profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "client can update own profile"
  ON client_profiles FOR UPDATE
  USING (id = auth.uid());

-- 관리자는 전체 조회 가능
CREATE POLICY "admin can read all client profiles"
  ON client_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );
