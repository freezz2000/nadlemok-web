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

### 고객사 (client)
| 경로 | 설명 |
|------|------|
| `/client/dashboard` | 고객사 대시보드 |
| `/client/projects` | 프로젝트 목록 |
| `/client/projects/[id]` | 프로젝트 상세 (단계별 탭) |
| `/client/projects/[id]/results` | 분석 결과 리포트 |
| `/client/apply` | 서비스 신청 + 결제 |
| `/payment/success` | 결제 성공 처리 |
| `/payment/fail` | 결제 실패 안내 |

### 패널 (panel)
| 경로 | 설명 |
|------|------|
| `/panel/dashboard` | 패널 대시보드 |
| `/panel/projects` | 참여 가능한 프로젝트 목록 |
| `/panel/projects/[id]` | 프로젝트 상세 + 설문 응답 |

### 관리자 (admin)
| 경로 | 설명 |
|------|------|
| `/admin/login` | 관리자 로그인 (username/password) |
| `/admin/dashboard` | 관리자 대시보드 |
| `/admin/projects` | 전체 프로젝트 관리 |
| `/admin/projects/[id]` | 프로젝트 상세 관리 (설문 편집, 단계 전환) |
| `/admin/panels` | 패널 목록 관리 |

### API
| 경로 | 설명 |
|------|------|
| `/api/auth/callback` | OAuth 콜백 (코드 → 세션 교환) |
| `/api/auth/naver` | 네이버 OAuth 시작 |
| `/api/auth/naver/callback` | 네이버 OAuth 콜백 |
| `/api/admin/login` | 관리자 로그인 처리 |
| `/api/payment/confirm` | 토스페이먼츠 결제 서버 승인 |

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
```

> Vercel 환경변수도 동일하게 설정 필요 (Vercel Dashboard → Settings → Environment Variables)

---

## DB 주요 테이블 (Supabase)

| 테이블 | 설명 |
|--------|------|
| `profiles` | 공통 유저 프로필 (id=auth.uid, role) |
| `panel_profiles` | 패널 상세 프로필 (피부타입, 고민, 약관 동의) |
| `client_profiles` | 고객사 상세 프로필 (회사명, 담당자 등) |
| `projects` | 프로젝트 (8단계 status, plan, product_name 등) |
| `surveys` | 설문 정의 (project_id 연결) |
| `questions` | 설문 문항 |
| `responses` | 패널 응답 데이터 |
| `results` | 분석 결과 (JSON blob) |
| `payments` | 결제 이력 (order_id, payment_key, amount, plan) |

---

## 프로젝트 진행 8단계

```
pending → draft → confirmed → approved → recruiting → testing → analyzing → completed
  신청      설문설정   관리자확정    승인완료      패널모집      테스트       분석중        완료
```

---

## 서비스 플랜 가격

| 플랜 | 가격 | 패널 수 |
|------|------|---------|
| basic | 2,000,000원 | ~30명 |
| standard | 3,000,000원 | ~50명 |
| premium | 5,000,000원 | ~100명 |

---

## 완료된 기능

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
- [x] 패널 가입 약관 동의 UI (5개 필수 + 1개 선택)
- [x] Vercel 배포 + linebreakers.co.kr 도메인 연결
- [x] devIndicators: false (dev 배지 숨김)

---

## 미완료 / 설정 필요 항목

- [ ] 네이버 OAuth 실제 키 발급 및 `.env.local` + Vercel 설정
  - 네이버 개발자 센터: https://developers.naver.com
  - 콜백 URL: `https://linebreakers.co.kr/api/auth/naver/callback`
- [ ] 카카오 OAuth Supabase 설정
  - Supabase Dashboard → Authentication → Providers → Kakao
  - 카카오 REST API 키 입력
- [ ] 토스페이먼츠 운영 키 교체 (현재 테스트 키 사용 중)
- [ ] Supabase `official@linebreakers.co.kr` 계정 생성 (Auth > Users)
- [ ] linebreakers.co.kr DNS 설정 (도메인 등록기관에서)
  - A 레코드: `76.76.21.21`
  - CNAME: `www → cname.vercel-dns.com`

---

## Supabase SQL 마이그레이션 (수동 실행 필요)

Supabase SQL Editor에서 아래 파일들을 순서대로 실행:

1. `supabase/schema.sql` — 기본 스키마
2. `supabase/add_payments_table.sql` — payments 테이블
3. `supabase/add_panel_terms_columns.sql` — panel_profiles 약관 컬럼

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
# Vercel 배포
npx vercel --prod

# 도메인 별칭 수동 설정 (필요시)
npx vercel alias set <deployment-url> linebreakers.co.kr
```

---

## Git 워크플로우 (다중 PC 개발)

```bash
# 작업 시작 전 (다른 PC에서 변경 사항 동기화)
git pull origin main

# 작업 후 커밋 & 푸시
git add -p
git commit -m "feat: 변경 내용 설명"
git push origin main
```

> `main` 브랜치 단일 운영.

---

## 주요 컴포넌트

| 파일 | 설명 |
|------|------|
| `src/components/Header.tsx` | 공통 헤더 (네비게이션, 로그인 상태) |
| `src/components/Footer.tsx` | 공통 푸터 |
| `src/components/ClientDemoSection.tsx` | 8단계 인터랙티브 데모 (가짜 브라우저 프레임) |
| `src/components/DemoDashboardSection.tsx` | 분석 결과 리포트 정적 데모 (hideHeader prop) |
| `src/components/TrafficLight.tsx` | 신호등 판정 컴포넌트 |
| `src/components/CiDotChart.tsx` | CI 도트차트 |
| `src/components/DriverBar.tsx` | 핵심 드라이버 바 차트 |
| `src/middleware.ts` | 역할별 라우트 보호 |
| `src/i18n/ko.json` | 한국어 번역 |
| `src/lib/supabase/` | Supabase 클라이언트 (client/server/admin) |
| `src/lib/types.ts` | 공통 TypeScript 타입 |
