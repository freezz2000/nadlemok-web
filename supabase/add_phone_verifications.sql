-- phone_verifications: OTP 임시 저장 (회원가입 시 휴대폰 인증용)
CREATE TABLE IF NOT EXISTS phone_verifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone      TEXT NOT NULL,
  otp        TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified   BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 검색 성능
CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone ON phone_verifications(phone);

-- RLS 비활성화 (service_role key로만 접근)
ALTER TABLE phone_verifications DISABLE ROW LEVEL SECURITY;

-- profiles 테이블에 phone_verified 컬럼 추가
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;
