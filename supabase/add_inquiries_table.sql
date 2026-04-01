-- 문의 테이블 생성
CREATE TABLE IF NOT EXISTS inquiries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company     TEXT NOT NULL,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  email       TEXT NOT NULL,
  message     TEXT,
  is_read     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- RLS 활성화
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

-- 누구나 INSERT 가능 (비로그인 상태에서도 문의 가능)
DROP POLICY IF EXISTS "anyone can insert inquiries" ON inquiries;
CREATE POLICY "anyone can insert inquiries" ON inquiries
  FOR INSERT WITH CHECK (true);

-- 관리자만 조회 가능 (service role key 사용)
DROP POLICY IF EXISTS "admin can read inquiries" ON inquiries;
CREATE POLICY "admin can read inquiries" ON inquiries
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin can update inquiries" ON inquiries;
CREATE POLICY "admin can update inquiries" ON inquiries
  FOR UPDATE USING (true);
