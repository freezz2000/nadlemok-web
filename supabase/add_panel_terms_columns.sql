-- 패널 약관 동의 정보 저장 컬럼 추가
-- Supabase SQL Editor에서 실행

ALTER TABLE panel_profiles
  ADD COLUMN IF NOT EXISTS terms_agreed_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terms_marketing_agreed  BOOLEAN DEFAULT false;
