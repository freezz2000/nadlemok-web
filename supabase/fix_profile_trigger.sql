-- ============================================================
-- 프로필 자동 생성 트리거 (기존 DB에 추가 실행용)
-- Supabase SQL Editor에서 이 파일만 실행하세요
-- ============================================================

-- 1. 트리거 함수 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, name, company)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'panel'),
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1),
      ''
    ),
    NEW.raw_user_meta_data->>'company'
  );

  -- 패널인 경우 panel_profiles도 자동 생성
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'panel') = 'panel' THEN
    INSERT INTO public.panel_profiles (id)
    VALUES (NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 기존 트리거가 있으면 삭제 후 재생성
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. 이미 가입했지만 프로필이 없는 사용자 복구
INSERT INTO public.profiles (id, role, name, company)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'role', 'panel'),
  COALESCE(u.raw_user_meta_data->>'name', '이름 미입력'),
  u.raw_user_meta_data->>'company'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- 4. RLS 정책 확인/추가 (이미 존재하면 무시됨)
DO $$
BEGIN
  -- profiles RLS
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can read own profile') THEN
    EXECUTE 'CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (id = auth.uid())';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile') THEN
    EXECUTE 'CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (id = auth.uid())';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Anyone can insert own profile') THEN
    EXECUTE 'CREATE POLICY "Anyone can insert own profile" ON profiles FOR INSERT WITH CHECK (id = auth.uid())';
  END IF;

  -- panel_profiles RLS
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'panel_profiles' AND policyname = 'Panel can manage own profile') THEN
    EXECUTE 'CREATE POLICY "Panel can manage own profile" ON panel_profiles FOR ALL USING (id = auth.uid())';
  END IF;
END $$;

-- 5. 패널인데 panel_profiles가 없는 사용자 복구
INSERT INTO public.panel_profiles (id)
SELECT p.id
FROM public.profiles p
LEFT JOIN public.panel_profiles pp ON pp.id = p.id
WHERE p.role = 'panel' AND pp.id IS NULL;
