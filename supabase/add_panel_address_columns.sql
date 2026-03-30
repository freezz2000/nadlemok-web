-- 패널 샘플 수취 주소 컬럼 추가
-- Supabase SQL Editor에서 실행

ALTER TABLE panel_profiles
  ADD COLUMN IF NOT EXISTS address_zipcode  TEXT,
  ADD COLUMN IF NOT EXISTS address          TEXT,
  ADD COLUMN IF NOT EXISTS address_detail   TEXT;
