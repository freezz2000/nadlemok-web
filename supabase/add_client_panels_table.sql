-- client_panels: 고객사 패널 풀
-- 패널이 초대를 수락하면 해당 고객사의 패널 풀에 자동 추가됨
-- 이후 고객사는 새 프로젝트 진행 시 기존 패널 풀에서 선택하여 초대 가능

CREATE TABLE IF NOT EXISTS client_panels (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  panel_id  UUID REFERENCES profiles(id) ON DELETE CASCADE,
  phone     TEXT,
  added_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, panel_id)
);

ALTER TABLE client_panels ENABLE ROW LEVEL SECURITY;

-- 고객사는 자신의 패널만 조회 가능
CREATE POLICY "client can read own panels" ON client_panels
  FOR SELECT USING (client_id = auth.uid());

-- service_role은 전체 접근 (서버 API용)
CREATE POLICY "service role full access on client_panels" ON client_panels
  FOR ALL USING (auth.role() = 'service_role');
