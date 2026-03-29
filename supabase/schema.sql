-- 나들목 (Nadeulmok) Database Schema
-- Supabase SQL Editor에서 실행

-- ============================================================
-- 0. 회원가입 시 프로필 자동 생성 트리거
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, name, company)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'panel'),
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
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

-- 트리거는 테이블 생성 후 아래에서 등록됨

-- ============================================================

-- 1. 사용자 프로필 (Supabase auth.users 확장)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'client', 'panel')),
  name TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 패널 프로필 (패널 전용 상세정보)
CREATE TABLE panel_profiles (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  gender TEXT,
  age_group TEXT,
  skin_type TEXT,
  skin_concern TEXT,
  is_sensitive BOOLEAN DEFAULT false,
  current_product TEXT,
  tier TEXT DEFAULT 'basic' CHECK (tier IN ('basic', 'standard', 'premium')),
  is_available BOOLEAN DEFAULT true
);

-- 3. 설문 템플릿
CREATE TABLE survey_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  questions JSONB NOT NULL DEFAULT '[]',
  created_by UUID REFERENCES profiles(id),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 프로젝트 (고객의 검증 의뢰 건)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES profiles(id),
  product_name TEXT NOT NULL,
  product_category TEXT,
  plan TEXT CHECK (plan IN ('basic', 'standard', 'premium')),
  panel_size INT DEFAULT 50,
  test_duration INT DEFAULT 10,
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'recruiting', 'testing', 'analyzing', 'completed'
  )),
  ks_warn_threshold NUMERIC DEFAULT 0.05,
  ks_danger_threshold NUMERIC DEFAULT 0.10,
  satisfaction_threshold NUMERIC DEFAULT 3.0,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- 5. 설문
CREATE TABLE surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  template_id UUID REFERENCES survey_templates(id),
  title TEXT NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]',
  day_checkpoint INT[] DEFAULT '{1,3,7,14}',
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. 패널-설문 매칭
CREATE TABLE survey_panels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
  panel_id UUID REFERENCES profiles(id),
  matched_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'matched' CHECK (status IN ('matched', 'accepted', 'completed', 'dropped')),
  UNIQUE(survey_id, panel_id)
);

-- 7. 설문 응답
CREATE TABLE survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
  panel_id UUID REFERENCES profiles(id),
  day_checkpoint INT,
  responses JSONB NOT NULL DEFAULT '{}',
  open_weakness TEXT,
  open_improvement TEXT,
  responded_at TIMESTAMPTZ DEFAULT now(),
  response_duration_sec INT,
  UNIQUE(survey_id, panel_id, day_checkpoint)
);

-- 8. 분석 결과
CREATE TABLE analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  verdict TEXT CHECK (verdict IN ('GO', 'CONDITIONAL GO', 'NO-GO')),
  summary JSONB,
  item_analysis JSONB,
  cohort_analysis JSONB,
  kill_signals JSONB,
  success_model JSONB,
  success_probability NUMERIC,
  core_usp TEXT,
  max_penalty TEXT,
  recommended_action TEXT,
  analyzed_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE panel_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;

-- Helper: 현재 사용자 역할 조회
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- profiles
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Admins can read all profiles" ON profiles FOR SELECT USING (get_user_role() = 'admin');
CREATE POLICY "Anyone can insert own profile" ON profiles FOR INSERT WITH CHECK (id = auth.uid());

-- panel_profiles
CREATE POLICY "Panel can manage own profile" ON panel_profiles FOR ALL USING (id = auth.uid());
CREATE POLICY "Admins can read all panels" ON panel_profiles FOR SELECT USING (get_user_role() = 'admin');

-- survey_templates
CREATE POLICY "Anyone can read default templates" ON survey_templates FOR SELECT USING (is_default = true);
CREATE POLICY "Admins can manage templates" ON survey_templates FOR ALL USING (get_user_role() = 'admin');

-- projects
CREATE POLICY "Clients can read own projects" ON projects FOR SELECT USING (client_id = auth.uid());
CREATE POLICY "Admins can manage all projects" ON projects FOR ALL USING (get_user_role() = 'admin');

-- surveys
CREATE POLICY "Admins can manage surveys" ON surveys FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "Panels can read matched surveys" ON surveys FOR SELECT
  USING (EXISTS (SELECT 1 FROM survey_panels WHERE survey_panels.survey_id = surveys.id AND survey_panels.panel_id = auth.uid()));
CREATE POLICY "Clients can read own surveys" ON surveys FOR SELECT
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = surveys.project_id AND projects.client_id = auth.uid()));

-- survey_panels
CREATE POLICY "Admins can manage matchings" ON survey_panels FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "Panels can read own matchings" ON survey_panels FOR SELECT USING (panel_id = auth.uid());
CREATE POLICY "Panels can update own matchings" ON survey_panels FOR UPDATE USING (panel_id = auth.uid());

-- survey_responses
CREATE POLICY "Panels can manage own responses" ON survey_responses FOR ALL USING (panel_id = auth.uid());
CREATE POLICY "Admins can read all responses" ON survey_responses FOR SELECT USING (get_user_role() = 'admin');

-- analysis_results
CREATE POLICY "Admins can manage results" ON analysis_results FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "Clients can read own results" ON analysis_results FOR SELECT
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = analysis_results.project_id AND projects.client_id = auth.uid()));

-- ============================================================
-- 기본 템플릿 시드 데이터
-- ============================================================

INSERT INTO survey_templates (name, description, category, questions, is_default) VALUES (
  '스킨케어 기본 템플릿',
  '크림/세럼/로션 등 스킨케어 제품 평가용 표준 설문 (24문항 + 주관식 2개)',
  '스킨케어',
  '[
    {"key": "KS_따가움", "label": "사용 시 따가움이나 화끈거림을 느꼈다", "type": "scale", "scale": 4, "isKillSignal": true, "order": 1},
    {"key": "KS_트러블", "label": "사용 후 트러블(뾰루지, 발진 등)이 발생했다", "type": "scale", "scale": 4, "isKillSignal": true, "order": 2},
    {"key": "KS_밀림", "label": "제품이 피부에 흡수되지 않고 밀렸다", "type": "scale", "scale": 4, "isKillSignal": true, "order": 3},
    {"key": "KS_건조감", "label": "사용 후 오히려 건조함을 느꼈다", "type": "scale", "scale": 4, "isKillSignal": true, "order": 4},
    {"key": "KS_향거부", "label": "향이 불쾌하거나 거부감이 들었다", "type": "scale", "scale": 4, "isKillSignal": true, "order": 5},
    {"key": "KS_붉어짐", "label": "사용 후 피부가 붉어졌다", "type": "scale", "scale": 4, "isKillSignal": true, "order": 6},
    {"key": "KS_눈따가움", "label": "눈 주위 사용 시 눈이 따가웠다", "type": "scale", "scale": 4, "isKillSignal": true, "order": 7},
    {"key": "향자연", "label": "향이 자연스럽고 호감이 간다", "type": "scale", "scale": 4, "isKillSignal": false, "order": 8},
    {"key": "향강도", "label": "향의 강도가 적절하다", "type": "scale", "scale": 4, "isKillSignal": false, "order": 9},
    {"key": "제형매력", "label": "제형(텍스처)이 매력적이다", "type": "scale", "scale": 4, "isKillSignal": false, "order": 10},
    {"key": "첫사용", "label": "처음 사용했을 때 느낌이 좋았다", "type": "scale", "scale": 4, "isKillSignal": false, "order": 11},
    {"key": "부드럽게발림", "label": "부드럽게 잘 발린다", "type": "scale", "scale": 4, "isKillSignal": false, "order": 12},
    {"key": "빠른흡수", "label": "빠르게 흡수된다", "type": "scale", "scale": 4, "isKillSignal": false, "order": 13},
    {"key": "끈적임적음", "label": "끈적임이 적다", "type": "scale", "scale": 4, "isKillSignal": false, "order": 14},
    {"key": "산뜻함", "label": "사용 후 산뜻하다", "type": "scale", "scale": 4, "isKillSignal": false, "order": 15},
    {"key": "편안함", "label": "사용 후 편안하다", "type": "scale", "scale": 4, "isKillSignal": false, "order": 16},
    {"key": "보습체감", "label": "보습 효과를 체감한다", "type": "scale", "scale": 4, "isKillSignal": false, "order": 17},
    {"key": "컨디션개선", "label": "피부 컨디션이 개선된 느낌이다", "type": "scale", "scale": 4, "isKillSignal": false, "order": 18},
    {"key": "건강해진느낌", "label": "피부가 건강해진 느낌이다", "type": "scale", "scale": 4, "isKillSignal": false, "order": 19},
    {"key": "전반만족도", "label": "이 제품에 전반적으로 만족한다", "type": "scale", "scale": 4, "isKillSignal": false, "order": 20},
    {"key": "계속사용", "label": "이 제품을 계속 사용하고 싶다", "type": "scale", "scale": 4, "isKillSignal": false, "order": 21},
    {"key": "구매의향", "label": "이 제품을 구매할 의향이 있다", "type": "scale", "scale": 4, "isKillSignal": false, "order": 22},
    {"key": "추천의향", "label": "이 제품을 주변에 추천할 의향이 있다", "type": "scale", "scale": 4, "isKillSignal": false, "order": 23},
    {"key": "기존대비", "label": "현재 사용 중인 제품보다 낫다", "type": "scale", "scale": 4, "isKillSignal": false, "order": 24},
    {"key": "open_weakness", "label": "이 제품의 아쉬운 점이나 단점을 자유롭게 적어주세요", "type": "text", "isKillSignal": false, "order": 25},
    {"key": "open_improvement", "label": "이 제품이 개선되었으면 하는 점을 자유롭게 적어주세요", "type": "text", "isKillSignal": false, "order": 26}
  ]'::JSONB,
  true
);

-- ============================================================
-- 트리거 등록 (테이블 생성 후)
-- ============================================================

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
