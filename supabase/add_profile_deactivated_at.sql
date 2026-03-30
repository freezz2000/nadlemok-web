-- 회원탈퇴 비활성 처리 컬럼 추가
-- Supabase SQL Editor에서 실행

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;
