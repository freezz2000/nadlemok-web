-- 개발의뢰서 텍스트/파일명을 projects 테이블에 저장
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS dev_request_text     TEXT,
  ADD COLUMN IF NOT EXISTS dev_request_filename TEXT;
