-- projects 테이블에 프로젝트 단위 초대 토큰 추가
-- 전화번호 없이 링크 하나로 패널 초대 가능

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS invite_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex');

-- 기존 프로젝트에 토큰이 없는 경우 생성
UPDATE projects
  SET invite_token = encode(gen_random_bytes(16), 'hex')
  WHERE invite_token IS NULL;
