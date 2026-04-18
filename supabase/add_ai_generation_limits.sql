-- AI 문항 자동생성 사용 횟수 제한 컬럼 추가
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS ai_generation_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_generated_at     TIMESTAMPTZ;
