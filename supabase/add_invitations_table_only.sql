-- project_invitations 테이블만 생성 (invite 기능 활성화)
-- Supabase SQL Editor에서 실행

CREATE TABLE IF NOT EXISTS project_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  survey_id UUID REFERENCES surveys(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  name TEXT,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  panel_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  invited_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT now() + interval '14 days',
  UNIQUE(project_id, email)
);

ALTER TABLE project_invitations ENABLE ROW LEVEL SECURITY;

-- 고객사: 자신의 프로젝트 초대 관리
CREATE POLICY IF NOT EXISTS "clients can manage own invitations"
  ON project_invitations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_invitations.project_id
        AND projects.client_id = auth.uid()
    )
  );

-- 서비스 롤: 전체 관리
CREATE POLICY IF NOT EXISTS "service role can manage invitations"
  ON project_invitations FOR ALL
  USING (auth.role() = 'service_role');
