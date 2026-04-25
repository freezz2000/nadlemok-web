# 나들목 (Nadlemok) — 프로젝트 컨텍스트

## 프로젝트 개요
- **서비스명**: 나들목 (Nadlemok)
- **목적**: 화장품 신제품 출시 전 소비자 검증 B2B 플랫폼 (Pre-Launch 특화 검증)
- **운영사**: 선을넘는사람들 (LineBreakers), 대표 임성현
- **도메인**: linebreakers.co.kr / nadlemok.co.kr
- **GitHub**: https://github.com/freezz2000/nadlemok-web
- **Vercel**: https://vercel.com (프로젝트명: web)
- **작업 디렉토리**: `C:\work\project\nadlemok\web`

---

## 기술 스택

| 항목 | 내용 |
|------|------|
| Framework | Next.js 16.2.1 (App Router, Turbopack) |
| Runtime | React 19, TypeScript |
| Styling | Tailwind CSS v4 (커스텀 토큰: navy/gold/go/cgo/nogo) |
| DB/Auth | Supabase (PostgreSQL + Auth + RLS) |
| 결제 | TossPayments SDK (@tosspayments/tosspayments-sdk) |
| 소셜 로그인 | Naver (커스텀 서버 라우트), Kakao/Google (Supabase native OAuth) |
| AI 문항 생성 | Anthropic Claude API (claude-sonnet-4-6) |
| 알림톡 | Aligo 카카오 알림톡 API |
| 배포 | Vercel (linebreakers.co.kr) |

---

## 역할(Role) 구조

- **admin**: 관리자 (별도 로그인 `/admin/login`, username/password 방식)
- **client**: 고객사 (B2B — 서비스 신청·결제, 프로젝트 관리)
- **panel**: 패널 (B2C — 설문 응답, 보상 수령)

---

## 주요 라우트

### 공개
| 경로 | 설명 |
|------|------|
| `/` | 랜딩 페이지 |
| `/login` | 로그인 (소셜: 네이버→카카오→구글) |
| `/register` | 회원가입 (역할 선택 후 소셜 로그인) |
| `/register/panel` | 패널 프로필 등록 |
| `/register/client` | 고객사 프로필 등록 |
| `/demo/dashboard` | 서비스 체험 — 8단계 인터랙티브 데모 |
| `/invite/[token]` | 카카오 알림톡 초대 랜딩 (phone-based, 패널 가입 유도) |
| `/invite/p/[token]` | 프로젝트 초대링크 랜딩 (phone 불필요, 패널 가입 유도) |
| `/terms/refund` | 환불 정책 |

### 고객사 (client)
| 경로 | 설명 |
|------|------|
| `/client` | 고객사 대시보드 |
| `/client/projects` | 프로젝트 목록 |
| `/client/projects/[id]` | 프로젝트 상세 (설문 설정, AI 문항 생성, 단계 전환) |
| `/client/projects/[id]/invite` | 패널 초대 (탭: 알림톡/초대링크, 목록, 패널선택) |
| `/client/projects/[id]/results` | 분석 결과 리포트 |
| `/client/projects/[id]/panel-match` | 패널 매칭 |
| `/client/projects/[id]/panel-setup` | 패널 설정 |
| `/client/apply` | 서비스 신청 + 결제 |
| `/client/panels` | 패널 풀 관리 |
| `/client/profile` | 고객사 프로필 |
| `/client/subscription` | 구독 관리 (빌링키, 크레딧) |
| `/payment/success` | 결제 성공 처리 |
| `/payment/fail` | 결제 실패 안내 |

### 패널 (panel)
| 경로 | 설명 |
|------|------|
| `/panel` | 패널 홈 (배정된 설문 목록 표시) |
| `/panel/profile` | 패널 프로필 |
| `/panel/surveys/[id]` | 설문 응답 |

### 관리자 (admin)
| 경로 | 설명 |
|------|------|
| `/admin` | 관리자 대시보드 |
| `/admin-login` | 관리자 로그인 (username/password) |
| `/admin/projects` | 전체 프로젝트 관리 |
| `/admin/projects/[id]` | 프로젝트 상세 관리 (설문 편집, 단계 전환) |
| `/admin/panels` | 패널 목록 관리 |
| `/admin/clients` | 고객사 목록 |
| `/admin/inquiries` | 문의 관리 |
| `/admin/matching` | 패널 매칭 관리 |
| `/admin/templates` | 설문 템플릿 관리 |

### API
| 경로 | 설명 |
|------|------|
| `/api/auth/callback` | OAuth 콜백 |
| `/api/auth/naver` | 네이버 OAuth 시작 |
| `/api/auth/naver/callback` | 네이버 OAuth 콜백 |
| `/api/admin/login` | 관리자 로그인 처리 |
| `/api/payment/confirm` | 토스페이먼츠 결제 승인 |
| `/api/payment/credit-confirm` | 크레딧 결제 승인 |
| `/api/billing/issue` | 빌링키 발급 |
| `/api/credits/consume` | 크레딧 소모 |
| `/api/invite/send` | 카카오 알림톡 초대 발송 (Aligo) |
| `/api/invite/remind` | 미가입 패널 독촉 알림톡 |
| `/api/invite/accept` | 알림톡 초대 수락 처리 (phone-based) |
| `/api/invite/project-link` | 프로젝트 초대링크 반환/생성 |
| `/api/invite/accept-project` | 프로젝트 초대링크 수락 처리 |
| `/api/surveys/ai-generate` | AI 설문 문항 생성 (Claude API) |
| `/api/surveys/assign-panels` | 패널 설문 배정 |
| `/api/surveys/start` | 설문 시작 |
| `/api/projects/advance` | 프로젝트 단계 전환 |
| `/api/projects/create` | 프로젝트 생성 |
| `/api/projects/[id]/dev-request` | 개발의뢰서 파일 파싱 |
| `/api/panels` | 패널 목록 조회 |
| `/api/analysis` | 분석 실행 |

---

## 환경변수 (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=           # Supabase 프로젝트 URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Supabase anon key (공개)
SUPABASE_SERVICE_ROLE_KEY=          # Supabase service role key (서버 전용)

NEXT_PUBLIC_TOSS_CLIENT_KEY=        # 토스페이먼츠 클라이언트 키 (test_ck_...)
TOSS_SECRET_KEY=                    # 토스페이먼츠 시크릿 키 (test_sk_...)

ADMIN_USERNAME=linebreakers         # 관리자 로그인 ID
ADMIN_PASSWORD=                     # 관리자 로그인 PW
ADMIN_EMAIL=official@linebreakers.co.kr

NAVER_CLIENT_ID=                    # 네이버 개발자 센터 앱 ID
NAVER_CLIENT_SECRET=                # 네이버 개발자 센터 앱 시크릿

ANTHROPIC_API_KEY=                  # Claude API 키 (AI 문항 생성)

ALIGO_API_KEY=                      # 알리고 API 키
ALIGO_USER_ID=                      # 알리고 사용자 ID
ALIGO_SENDER=                       # 발신번호
ALIGO_TEMPLATE_CODE=                # 카카오 알림톡 템플릿 코드
ALIGO_KAKAO_SENDER_KEY=             # 카카오 채널 발신 키

NEXT_PUBLIC_APP_URL=https://linebreakers.co.kr  # 앱 기본 URL
```

> Vercel 환경변수도 동일하게 설정 필요 (Vercel Dashboard → Settings → Environment Variables)

---

## DB 주요 테이블 (Supabase)

| 테이블 | 설명 |
|--------|------|
| `profiles` | 공통 유저 프로필 (id=auth.uid, role) |
| `panel_profiles` | 패널 상세 프로필 (피부타입, 고민, 약관 동의, terms_agreed_at) |
| `client_profiles` | 고객사 상세 프로필 (회사명, 담당자 등) |
| `projects` | 프로젝트 (8단계 status, invite_token, ai_generation_count 등) |
| `surveys` | 설문 정의 (project_id 연결, questions JSONB) |
| `survey_panels` | 패널-설문 매핑 (panel_id, survey_id, status: matched/completed) |
| `project_invitations` | 알림톡 초대 (phone-based, token, status) |
| `client_panels` | 고객사 패널 풀 (client_id, panel_id) |
| `responses` | 패널 응답 데이터 |
| `results` | 분석 결과 (JSON blob) |
| `payments` | 결제 이력 (order_id, payment_key, amount, plan) |
| `subscriptions` | 구독 정보 (빌링키 기반) |
| `client_credits` | 고객사 크레딧 잔액 |
| `credit_transactions` | 크레딧 거래 이력 |

### 핵심 관계
- 패널 홈(`/panel`)은 `survey_panels → surveys → projects` 조인으로 활성 설문 표시
- `survey_panels.status = 'matched'` → 배정됨 / `'completed'` → 응답 완료
- `projects.invite_token` → 프로젝트 단위 공유 초대링크 토큰

---

## 프로젝트 진행 8단계

```
pending → draft → confirmed → approved → recruiting → testing → analyzing → completed
  신청      설문설정   관리자확정    승인완료      패널모집      테스트       분석중        완료
```

---

## 패널 초대 흐름 (2가지)

### 1. 카카오 알림톡 초대 (phone-based)
```
고객사 → /client/projects/[id]/invite → 전화번호 입력 → POST /api/invite/send
→ Aligo 알림톡 발송 → 패널 클릭 → /invite/[token] → /register?role=panel
→ 회원가입 완료 → /register/panel (프로필) → localStorage pending_invite 처리
→ project_invitations.status = 'accepted', survey_panels 생성, client_panels 추가
→ 패널 홈에 설문 표시
```

### 2. 프로젝트 초대링크 (phone 불필요)
```
고객사 → /client/projects/[id]/invite → "초대링크 공유" 탭 → 링크 복사
→ 패널 클릭 → /invite/p/[token] → /register?role=panel
→ 회원가입 완료 → /register/panel (프로필) → localStorage pending_invite_project 처리
→ survey_panels 생성 (status: 'matched'), client_panels 추가
→ 패널 홈에 설문 표시
```

---

## 초대 페이지 UI 구조 (`/client/projects/[id]/invite`)

### 섹션 1: 탭 카드 (초대 방식 선택)
- **카카오 알림톡 초대** 탭: 전화번호 textarea + 발송 버튼 + 독촉 알림톡
- **초대링크 공유** 탭: 프로젝트 고유 URL + 복사 버튼

### 섹션 2: 초대 목록 카드
- **카카오 알림톡** 초대 목록 (주황 점): phone, 상태(미가입/가입완료/만료), 응답여부, 재발송
- **초대링크 가입** 목록 (navy 점): 이름, 가입완료, 응답여부

### 섹션 3: 패널 선택 카드
- 전체 선택 / 개별 체크박스
- 알림톡/링크 출처 badge 표시
- 응답 완료 패널은 체크 해제 불가 (locked)
- "패널 선택 저장" → `/api/surveys/assign-panels`

### 설문 시작 카드 (조건부)
- `surveyStatus !== 'active'` && 가입 패널 > 0일 때 표시
- "설문 시작하기" → `/api/surveys/start`

---

## AI 문항 생성 (`/api/surveys/ai-generate`)

- **모델**: `claude-sonnet-4-6`
- **한도**: 프로젝트당 최대 5회 (`projects.ai_generation_count`)
- **쿨다운**: 연속 호출 방지 30초
- **입력 최대**: 6,000자 (초과 시 자동 truncate)
- **고정 주관식**: 항상 마지막에 아쉬운 점 / 개선사항 2개 추가
- **group 값**: `killsignal`, `usage`, `function`, `claim_risk`, `overall`
- **JSON 파싱**: 4단계 폴백 (직접→마크다운 제거→배열 추출→객체 추출)

---

## Supabase SQL 마이그레이션 (수동 실행 필요)

Supabase SQL Editor에서 아래 파일들을 순서대로 실행:

1. `supabase/schema.sql` — 기본 스키마
2. `supabase/add_payments_table.sql` — payments 테이블
3. `supabase/add_panel_terms_columns.sql` — panel_profiles 약관 컬럼 (terms_agreed_at, terms_marketing_agreed)
4. `supabase/add_project_invite_token.sql` — **projects.invite_token 컬럼** ← 신규, 아직 실행 필요

```sql
-- supabase/add_project_invite_token.sql 내용
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS invite_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex');
UPDATE projects SET invite_token = encode(gen_random_bytes(16), 'hex') WHERE invite_token IS NULL;
```

---

## 완료된 기능 (최신순)

- [x] **AI 문항 생성 JSON 파싱 강화** — 마크다운 코드블록·추가 텍스트 포함 응답 처리 (4단계 폴백)
- [x] **초대 페이지 3섹션 UI 재설계** — 탭(알림톡/링크) + 초대목록(출처별) + 패널선택(체크박스)
- [x] **프로젝트 단위 초대링크** — `projects.invite_token`, `/invite/p/[token]`, `/api/invite/project-link`, `/api/invite/accept-project`
- [x] **알림톡 초대 링크 전용 생성** (`generateOnly` flag) — phone 없이 URL만 반환
- [x] **패널 회원가입 후 자동 프로젝트 연결** — `pending_invite_project` localStorage 처리
- [x] **카카오 알림톡 초대** — Aligo API, `/api/invite/send`, `/api/invite/remind`
- [x] **알림톡 초대 토큰 수락** — `/invite/[token]` → 패널 가입 유도
- [x] Supabase 배열 타입 오류 수정 (`profile: { name }[] | null`, `[0]?.name` 접근)
- [x] 랜딩 페이지 (i18n ko/en)
- [x] 소셜 로그인/회원가입 (네이버·카카오·구글)
- [x] 네이버 OAuth 커스텀 서버 구현
- [x] 역할별 라우팅 (middleware.ts)
- [x] 고객사 대시보드 + 프로젝트 목록/상세
- [x] 패널 대시보드 + 프로젝트 참여 + 설문 응답
- [x] 관리자 대시보드 + 프로젝트 관리 + 단계 전환
- [x] 설문 편집 (관리자, DnD)
- [x] 분석 결과 리포트 (신호등, CI, DriverBar, KS 테이블, 코호트)
- [x] 서비스 체험 데모 (`/demo/dashboard`) — 8단계 인터랙티브 정적 데모
- [x] 토스페이먼츠 결제 연동 (apply → success/fail)
- [x] 패널 가입 약관 동의 UI (5개 필수 + 1개 선택, 전문 펼치기)
- [x] Vercel 배포 + linebreakers.co.kr 도메인 연결

---

## 미완료 / 설정 필요 항목

### Supabase (즉시 필요)
- [ ] `supabase/add_project_invite_token.sql` 실행 — `projects.invite_token` 컬럼 추가 (초대링크 기능 작동 필수)

### 환경변수 (Vercel에 추가 필요)
- [ ] `ANTHROPIC_API_KEY` — Claude API 키 (AI 문항 생성)
- [ ] `ALIGO_API_KEY`, `ALIGO_USER_ID`, `ALIGO_SENDER`, `ALIGO_TEMPLATE_CODE`, `ALIGO_KAKAO_SENDER_KEY` — 알리고 알림톡
- [ ] `NEXT_PUBLIC_APP_URL=https://linebreakers.co.kr` — 초대링크 URL 생성에 사용

### OAuth 설정
- [ ] 네이버 OAuth 실제 키 발급 (`NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`)
  - 콜백 URL: `https://linebreakers.co.kr/api/auth/naver/callback`
- [ ] 카카오 OAuth Supabase 설정 (Dashboard → Authentication → Providers → Kakao)

### 결제
- [ ] 토스페이먼츠 운영 키 교체 (현재 테스트 키 사용 중)

### 도메인
- [ ] linebreakers.co.kr DNS 설정
  - A 레코드: `76.76.21.21`
  - CNAME: `www → cname.vercel-dns.com`

---

## 알려진 이슈 / 주의사항

### Supabase join 타입
- `supabase.from('x').select('profile:profiles!panel_id(name)')` 반환 타입은 **배열**
- 타입 정의: `profile: { name: string }[] | null`
- 접근: `row.profile?.[0]?.name` (`.name` 직접 접근 X → TypeScript 빌드 오류)

### AI 문항 생성 카운터
- `aiGenCount`는 **로컬 state** (페이지 리로드 시 0 리셋)
- 실제 한도는 서버 DB `projects.ai_generation_count`로 관리
- 프론트에서는 참고용 표시만 (실제 차단은 서버에서)

### 초대링크 작동 조건
- `projects.invite_token` 컬럼이 없으면 초대링크 탭에서 "링크를 불러오지 못했습니다" 표시
- → Supabase SQL 마이그레이션 실행 필요

---

## 개발 서버 실행

```bash
cd C:\work\project\nadlemok\web
npm run dev
# → http://localhost:3000
```

> Turbopack 사용 중. 워커 크래시 발생 시: `rm -rf .next` 후 재실행

---

## 배포 명령

```bash
# TypeScript 검사
npx tsc --noEmit

# Vercel 배포
npx vercel --prod
```

---

## Git 워크플로우 (다중 PC 개발)

```bash
# 작업 시작 전 (다른 PC에서 변경 사항 동기화)
git pull origin main

# 작업 후 커밋 & 푸시
git add <파일>
git commit -m "feat: 변경 내용 설명"
git push origin main
```

> `main` 브랜치 단일 운영. PowerShell에서 한글 커밋 메시지 주의 → ASCII 메시지 권장

---

## 주요 컴포넌트 / 파일

| 파일 | 설명 |
|------|------|
| `src/components/Header.tsx` | 공통 헤더 |
| `src/components/Footer.tsx` | 공통 푸터 |
| `src/components/ui/Button.tsx` | 공통 버튼 |
| `src/components/ui/Card.tsx` | 공통 카드 |
| `src/components/ClientDemoSection.tsx` | 8단계 인터랙티브 데모 |
| `src/components/DemoDashboardSection.tsx` | 분석 결과 리포트 정적 데모 |
| `src/components/TrafficLight.tsx` | 신호등 판정 컴포넌트 |
| `src/components/CiDotChart.tsx` | CI 도트차트 |
| `src/components/DriverBar.tsx` | 핵심 드라이버 바 차트 |
| `src/middleware.ts` | 역할별 라우트 보호 |
| `src/i18n/ko.json` | 한국어 번역 |
| `src/lib/supabase/client.ts` | Supabase 클라이언트 (브라우저) |
| `src/lib/supabase/server.ts` | Supabase 클라이언트 (서버) |
| `src/lib/types.ts` | 공통 TypeScript 타입 |
