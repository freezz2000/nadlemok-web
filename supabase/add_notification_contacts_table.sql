CREATE TABLE IF NOT EXISTS notification_contacts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  phone       TEXT,
  email       TEXT,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notification_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin can manage notification contacts" ON notification_contacts;
CREATE POLICY "admin can manage notification contacts" ON notification_contacts
  USING (true) WITH CHECK (true);
