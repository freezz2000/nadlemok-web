-- Migration: 패널 주소 및 마지막 로그인 필드 추가
-- Run this in Supabase SQL Editor

-- 1. 패널 프로필에 샘플 수취 주소 추가
ALTER TABLE panel_profiles
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS address_detail TEXT;

-- 2. profiles에 마지막 로그인 일시 추가
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- 3. 로그인 시 last_login_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION public.handle_user_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET last_login_at = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. auth.users 업데이트(로그인) 시 트리거 등록
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
CREATE TRIGGER on_auth_user_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_login();
