-- project_invitations 테이블을 phone 기반으로 변경
-- Supabase SQL Editor에서 실행

-- email 컬럼 NOT NULL 해제
ALTER TABLE project_invitations ALTER COLUMN email DROP NOT NULL;

-- phone 컬럼 추가
ALTER TABLE project_invitations ADD COLUMN IF NOT EXISTS phone TEXT;

-- 기존 email unique 제약 제거
ALTER TABLE project_invitations DROP CONSTRAINT IF EXISTS project_invitations_project_id_email_key;

-- phone 기반 unique 제약 추가
ALTER TABLE project_invitations
  ADD CONSTRAINT project_invitations_project_id_phone_key UNIQUE (project_id, phone);
