-- analysis_results 테이블 확장 컬럼 추가
-- Supabase SQL Editor에서 실행

ALTER TABLE analysis_results
  ADD COLUMN IF NOT EXISTS key_drivers     JSONB,
  ADD COLUMN IF NOT EXISTS rd_guide        JSONB,
  ADD COLUMN IF NOT EXISTS marketing_guide JSONB,
  ADD COLUMN IF NOT EXISTS next_steps      JSONB,
  ADD COLUMN IF NOT EXISTS age_cohort      JSONB;
