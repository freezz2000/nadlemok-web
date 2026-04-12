-- ============================================================
-- 하이브리드 패널 모델 마이그레이션
-- Supabase SQL Editor에서 실행
-- ============================================================

-- 1. projects 테이블 컬럼 추가
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS external_panel_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_service BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS operation_fee INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_service_fee INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quote_total INT DEFAULT 0;

-- panel_source 컬럼 (없을 경우 추가)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS panel_source TEXT DEFAULT 'internal'
  CHECK (panel_source IN ('internal', 'external', 'mixed'));

-- 2. 외부 패널 조건 테이블
CREATE TABLE IF NOT EXISTS panel_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  age_ranges TEXT[] DEFAULT '{}',   -- '20s','30s','40s','50s'
  skin_types TEXT[] DEFAULT '{}',   -- 'dry','oily','combination','sensitive'
  skin_concerns TEXT[] DEFAULT '{}', -- 'wrinkle','moisture','acne','pore','tone'
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE panel_conditions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "clients can manage own panel conditions"
  ON panel_conditions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = panel_conditions.project_id
        AND projects.client_id = auth.uid()
    )
  );
CREATE POLICY IF NOT EXISTS "service role manages panel conditions"
  ON panel_conditions FOR ALL USING (auth.role() = 'service_role');

-- 3. 프로젝트 패널 선택 테이블
CREATE TABLE IF NOT EXISTS project_panel_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  panel_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  selected_by TEXT CHECK (selected_by IN ('client', 'admin')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, panel_id)
);
ALTER TABLE project_panel_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "clients can manage own panel selections"
  ON project_panel_selections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_panel_selections.project_id
        AND projects.client_id = auth.uid()
    )
  );
CREATE POLICY IF NOT EXISTS "service role manages panel selections"
  ON project_panel_selections FOR ALL USING (auth.role() = 'service_role');

-- 4. projects status 허용값에 'matching' 추가 (기존 CHECK 제약 수정)
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE projects ADD CONSTRAINT projects_status_check
  CHECK (status IN (
    'pending','draft','confirmed','approved','recruiting',
    'matching','testing','analyzing','completed','rejected'
  ));

-- 5. panel_profiles 에 패널 조건 관련 컬럼 확인 (없으면 추가)
ALTER TABLE panel_profiles
  ADD COLUMN IF NOT EXISTS age_group TEXT,
  ADD COLUMN IF NOT EXISTS skin_type TEXT,
  ADD COLUMN IF NOT EXISTS skin_concerns TEXT[] DEFAULT '{}';
