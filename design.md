# 나들목 디자인 시스템

> **Tailwind CSS v4** 기반. 모든 커스텀 토큰은 `src/app/globals.css`의 `@theme inline` 블록에 정의되어 있음.

---

## 1. 색상 시스템

### 커스텀 토큰 (globals.css)

```css
/* Brand */
--color-navy:       #1B2A4A   /* 주 브랜드 컬러 — 헤더, 버튼, 배경 */
--color-navy-light: #243556   /* hover 중간 단계 */
--color-navy-dark:  #111D33   /* hover 최종 단계 */
--color-gold:       #C9A96E   /* 포인트 컬러 — CTA, 로고, 강조 */
--color-gold-light: #D4BA88   /* gold hover */

/* Verdict (판정 3단계) */
--color-go:         #22C55E   /* GO — 출시 적합 */
--color-go-bg:      #F0FDF4
--color-cgo:        #F59E0B   /* CONDITIONAL GO — 조건부 */
--color-cgo-bg:     #FFFBEB
--color-nogo:       #EF4444   /* NO-GO — 출시 보류 */
--color-nogo-bg:    #FEF2F2

/* Surface */
--color-surface:      #F8F9FC  /* 페이지 배경, 카드 배경 */
--color-surface-dark: #EEF0F5  /* hover 배경 */

/* Text & Border */
--color-text:       #1E293B   /* 기본 텍스트 */
--color-text-muted: #64748B   /* 보조 텍스트, 라벨 */
--color-border:     #E2E8F0   /* 카드·입력 테두리 */
```

### 사용 규칙

| 용도 | 토큰 |
|------|------|
| 주 배경 | `bg-white` |
| 보조 배경 / 섹션 구분 | `bg-surface` |
| 헤더 / 사이드바 | `bg-navy` |
| 주 버튼 | `bg-navy` → hover `bg-navy-dark` |
| CTA 버튼 (랜딩) | `bg-gold` → hover `bg-gold-light` |
| 위험 버튼 | `bg-nogo` → hover `bg-red-700` |
| 테두리 | `border-border` |
| 기본 텍스트 | `text-text` |
| 보조 텍스트 | `text-text-muted` |

### 불투명도 활용 (사이드바 내부)

```
bg-white/15   — 활성 네비 항목 배경
bg-white/10   — hover 네비 항목 배경
text-white/70 — 비활성 네비 텍스트
text-white/60 — 역할 배지 텍스트
border-white/10 — 내부 구분선
```

---

## 2. 타이포그래피

### 폰트 스택

```css
--font-sans: "Inter", "Pretendard", -apple-system, BlinkMacSystemFont, sans-serif;
```

- Inter: Google Fonts (root layout에서 로드)
- Pretendard: jsdelivr CDN (v1.3.9)

### 크기 계층

| 용도 | 클래스 | 실제 크기 |
|------|--------|-----------|
| 랜딩 히어로 H1 | `text-4xl md:text-5xl lg:text-6xl` | 36 → 48 → 60px |
| 섹션 제목 H2 | `text-3xl md:text-4xl` | 30 → 36px |
| 카드 제목 H3 | `text-lg` ~ `text-xl` | 18 ~ 20px |
| 본문 | `text-base` | 16px |
| 폼 라벨 / 보조 | `text-sm` | 14px |
| 배지 / 캡션 | `text-xs` | 12px |

### 굵기

```
font-normal   400 — 일반 본문
font-medium   500 — 버튼, 네비 항목
font-semibold 600 — 카드 제목, 모달 제목
font-bold     700 — 섹션 제목, 히어로 헤드라인
```

---

## 3. 간격 시스템

Tailwind 기본 4px 단위 사용.

### 주요 간격 값

```
4px  = 1   →  p-1, gap-1
6px  = 1.5 →  py-1.5
8px  = 2   →  px-2, py-2, gap-2
12px = 3   →  px-3, py-3, gap-3
16px = 4   →  px-4, py-4, gap-4
24px = 6   →  px-6, py-6, gap-6
32px = 8   →  px-8, py-8
```

### 레이아웃 단위

| 용도 | 클래스 |
|------|--------|
| 랜딩 섹션 상하 여백 | `py-24` (96px) |
| 섹션 내 컨테이너 좌우 | `px-6` |
| 섹션 최대 폭 | `max-w-7xl mx-auto` |
| 카드 내부 패딩 sm | `p-4` |
| 카드 내부 패딩 md | `p-6` |
| 카드 내부 패딩 lg | `p-8` |
| 그리드 간격 | `gap-6` |

---

## 4. Border Radius

| 용도 | 클래스 | 값 |
|------|--------|----|
| 버튼, 입력 필드, 네비 항목 | `rounded-lg` | 8px |
| 카드 | `rounded-xl` | 12px |
| 모달, 섹션 카드 | `rounded-xl` | 12px |
| 랜딩 CTA 모달 | `rounded-2xl` | 16px |
| 배지, 태그, 아이콘 뱃지 | `rounded-full` | 9999px |

---

## 5. 레이아웃 구조

### 랜딩 페이지

```
<Header>         fixed top-0, h-16, bg-white, border-b border-border, z-50
  ↓
<HeroSection>    min-h-screen, bg-navy, py-32
<ProblemSection> py-24, bg-white
<SolutionSection>py-24, bg-surface
<ProcessSection> py-24, bg-white
<VerdictSection> py-24, bg-surface
...
<CtaSection>     py-24, bg-navy
<Footer>         py-12, bg-navy
```

### 대시보드

```
<Sidebar>   w-64, fixed left-0 top-0, h-screen, bg-navy, z-40
<Topbar>    fixed top-0 lg:left-64, h-16, bg-white, border-b, z-30
<main>      lg:ml-64, mt-16, p-4 lg:p-6, min-h-screen, bg-surface
```

---

## 6. UI 컴포넌트

### Button (`src/components/ui/Button.tsx`)

```tsx
<Button variant="primary" size="md">텍스트</Button>
```

**Base**: `inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors`

| variant | 클래스 |
|---------|--------|
| `primary` | `bg-navy text-white hover:bg-navy-dark` |
| `secondary` | `bg-surface text-text border border-border hover:bg-surface-dark` |
| `danger` | `bg-nogo text-white hover:bg-red-700` |
| `ghost` | `text-text-muted hover:bg-surface` |

| size | 클래스 |
|------|--------|
| `sm` | `px-3 py-1.5 text-sm` |
| `md` | `px-4 py-2 text-sm` |
| `lg` | `px-6 py-3 text-base` |

**비활성화**: `opacity-50 cursor-not-allowed`
**로딩**: 스피너 SVG + `animate-spin h-4 w-4`

---

### Badge (`src/components/ui/Badge.tsx`)

```tsx
<Badge variant="go">Go</Badge>
<VerdictBadge verdict="GO" />
<StatusBadge status="pending" />
<MatchStatusBadge status="matched" />
```

**Base**: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border`

| variant | 클래스 |
|---------|--------|
| `go` | `bg-go-bg text-go border-go/20` |
| `cgo` | `bg-cgo-bg text-cgo border-cgo/20` |
| `nogo` | `bg-nogo-bg text-nogo border-nogo/20` |
| `info` | `bg-blue-50 text-blue-700 border-blue-200` |
| `warning` | `bg-amber-50 text-amber-700 border-amber-200` |
| `default` | `bg-surface text-text-muted border-border` |

**프로젝트 상태 → Badge 매핑**

| 상태 | variant | 라벨 |
|------|---------|------|
| `pending` | `warning` | 승인 대기 |
| `draft` | `default` | 설문 설정중 |
| `confirmed` | `info` | 관리자 확정 |
| `approved` | `go` | 고객 승인완료 |
| `recruiting` | `info` | 패널 모집중 |
| `testing` | `warning` | 테스트 진행중 |
| `analyzing` | `info` | 분석중 |
| `completed` | `go` | 완료 |
| `rejected` | `nogo` | 반려 |

---

### Card (`src/components/ui/Card.tsx`)

```tsx
<Card padding="md">
  <CardHeader>
    <CardTitle>제목</CardTitle>
    <CardDescription>설명</CardDescription>
  </CardHeader>
  내용
</Card>
```

**Card Base**: `bg-white rounded-xl border border-border shadow-sm`

| padding | 클래스 |
|---------|--------|
| `sm` | `p-4` |
| `md` | `p-6` (기본) |
| `lg` | `p-8` |

- `CardTitle`: `text-lg font-semibold text-text`
- `CardDescription`: `text-sm text-text-muted mt-1`
- `CardHeader`: `mb-4`

---

### Modal (`src/components/ui/Modal.tsx`)

```tsx
<Modal open={open} onClose={onClose} title="제목" size="md">
  내용
</Modal>
```

**오버레이**: `fixed inset-0 z-50 flex items-center justify-center bg-black/50`
**컨테이너**: `bg-white rounded-xl shadow-lg w-full mx-4 max-h-[90vh] flex flex-col overflow-hidden`
**헤더**: `flex items-center justify-between px-6 py-4 border-b border-border`
**헤더 제목**: `text-lg font-semibold text-text`
**바디**: `px-6 py-4 overflow-y-auto flex-1`

| size | max-width |
|------|-----------|
| `sm` | `max-w-md` (448px) |
| `md` | `max-w-lg` (512px) (기본) |
| `lg` | `max-w-2xl` (768px) |

**닫기**: ESC 키, 오버레이 클릭, ✕ 버튼 (`w-5 h-5`)

---

### Table (`src/components/ui/Table.tsx`)

```tsx
<Table>
  <TableHeader>
    <tr><TableHead>컬럼</TableHead></tr>
  </TableHeader>
  <TableBody>
    <TableRow><TableCell>내용</TableCell></TableRow>
  </TableBody>
</Table>
```

- `Table`: `w-full text-sm` (overflow-x-auto 래퍼)
- `TableHeader`: `bg-surface`
- `TableBody`: `divide-y divide-border`
- `TableRow`: `hover:bg-surface/50 transition-colors`
- `TableHead`: `px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider`
- `TableCell`: `px-4 py-3 text-text`

---

## 7. 폼 스타일 패턴

### 입력 필드

```tsx
<label className="block text-sm font-medium text-text mb-1.5">
  라벨 <span className="text-nogo">*</span>
</label>
<input
  className="w-full px-3 py-2 border border-border rounded-lg text-sm
             focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
/>
```

### 에러 상태

```tsx
<input className="w-full px-3 py-2 border border-nogo rounded-lg text-sm ..." />
<p className="text-xs text-nogo mt-1">오류 메세지</p>
```

### 셀렉트 박스

```tsx
<select className="w-full px-3 py-2 border border-border rounded-lg text-sm
                   focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy bg-white">
```

### 텍스트에어리어

```tsx
<textarea className="w-full px-3 py-2 border border-border rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy
                     resize-none" rows={4} />
```

### 체크박스

```tsx
<input type="checkbox" className="w-4 h-4 rounded border-border text-navy
                                   focus:ring-navy/20 cursor-pointer" />
```

### 폼 섹션 래퍼

```tsx
<div className="bg-white rounded-xl border border-border p-6 space-y-4">
  <h3 className="text-base font-semibold text-text mb-4">섹션 제목</h3>
  ...
</div>
```

### 결제 수단 선택 버튼 (토글형)

```tsx
// 선택됨
<button className="flex-1 flex items-center gap-3 p-4 rounded-xl border-2 border-navy bg-navy/5">
// 미선택
<button className="flex-1 flex items-center gap-3 p-4 rounded-xl border border-border hover:border-navy/40">
```

---

## 8. 사이드바 (`src/components/dashboard/Sidebar.tsx`)

```
w-64 h-screen bg-navy text-white flex flex-col fixed left-0 top-0 z-40
transition-transform duration-300
```

| 상태 | 변환 |
|------|------|
| 모바일 열림 | `translate-x-0` |
| 모바일 닫힘 | `-translate-x-full` |
| lg 이상 | `lg:translate-x-0` (항상 표시) |

**로고 영역**: `px-4 py-5 border-b border-white/10`
- 서비스명: `text-xl font-bold text-gold`
- 역할 배지: `text-xs text-white/60 bg-white/10 px-2 py-0.5 rounded`

**네비게이션**: `px-3 py-4 space-y-1 overflow-y-auto`

| 상태 | 클래스 |
|------|--------|
| 활성 항목 | `bg-white/15 text-white font-medium` |
| 비활성 항목 | `text-white/70 hover:bg-white/10 hover:text-white` |
| 공통 | `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors` |

**아이콘**: `w-5 h-5 flex-shrink-0` (SVG, stroke, strokeWidth=1.5)
**푸터**: `px-4 py-3 border-t border-white/10 text-xs text-white/40`

---

## 9. 랜딩 섹션별 스타일

### Hero Section

```
배경: bg-navy, min-h-screen, py-32
장식 원형: absolute rounded-full bg-gold/5 blur-3xl (포인트 2개)
뱃지: px-3 py-1 text-xs rounded-full bg-white/10 text-gold border border-gold/30
H1: text-4xl md:text-5xl lg:text-6xl font-bold text-white
CTA 버튼: px-8 py-4 bg-gold text-navy font-semibold rounded-lg hover:bg-gold-light
보조 텍스트: text-white/70
```

### Problem / Solution / Process 섹션

```
섹션 여백: py-24
섹션 내 제목: text-3xl md:text-4xl font-bold text-navy
섹션 내 설명: text-text-muted
카드: bg-white rounded-xl p-6 border border-border
        hover:border-gold/40 transition-colors (인터랙티브)
아이콘 배경: w-12 h-12 rounded-lg bg-navy/5 group-hover:bg-gold/10
```

### Pricing Section

```
그리드: md:grid-cols-3 gap-6
추천 카드: bg-navy text-white border-navy ring-2 ring-gold scale-105 transform
일반 카드: bg-white text-text border-border
추천 배지: absolute -top-3 px-3 py-1 bg-gold text-navy text-xs font-bold rounded-full
```

### CTA Section

```
배경: bg-navy
모달 오버레이: fixed inset-0 z-50 bg-black/60 backdrop-blur-sm
모달 컨테이너: bg-white rounded-2xl shadow-2xl max-w-md w-full
모달 헤더: px-6 py-5 border-b border-gray-100
```

---

## 10. 로그인 / 회원가입 페이지

```
페이지 배경: bg-surface (또는 min-h-screen bg-surface)
카드 컨테이너: max-w-md w-full
카드: bg-white rounded-xl border border-border shadow-sm p-8
제목: text-3xl font-bold text-navy

소셜 버튼 공통: w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg border font-medium transition-colors
카카오 버튼: style={{ backgroundColor: '#FEE500', color: '#3C1E1E' }}
구글 버튼: bg-white text-gray-700 border-border hover:bg-surface

구분선: relative flex items-center
  선: border-t border-border flex-1
  텍스트: bg-white px-3 text-xs text-text-muted

이메일 입력 폼 (토글): 기본 숨김 → "이메일로 로그인" 클릭 시 펼쳐짐
```

---

## 11. 애니메이션

### fade-in-up (글로벌)

```css
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(30px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-fade-in-up { animation: fade-in-up 0.6s ease-out forwards; }
```

### 스크롤 트리거 섹션 애니메이션

```css
.section-hidden {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.6s ease-out, transform 0.6s ease-out;
}
.section-visible {
  opacity: 1;
  transform: translateY(0);
}
```

### Tailwind 전환

```
transition-colors   — 색상 변화 (버튼, 네비, 카드 hover)
transition-all      — 전체 속성 변화 (일부 카드)
transition-transform — 위치 변화 (사이드바 슬라이드)
duration-300        — 300ms (사이드바)
```

---

## 12. z-index 계층

| 레이어 | z-index | 대상 |
|--------|---------|------|
| 기본 콘텐츠 | `z-10` | 일반 카드, 섹션 요소 |
| 탑바 | `z-30` | `<Topbar>` |
| 사이드바 | `z-40` | `<Sidebar>` |
| 모달 / 드롭다운 | `z-50` | `<Modal>`, 오버레이 |

---

## 13. 반응형 브레이크포인트

Tailwind v4 기본값:

| 이름 | 최소 폭 | 주요 사용 |
|------|---------|-----------|
| `sm` | 640px | 2열 그리드 시작 |
| `md` | 768px | 메인 레이아웃 전환 |
| `lg` | 1024px | 사이드바 상시 표시, 3열 그리드 |
| `xl` | 1280px | 넓은 레이아웃 |

**주요 반응형 패턴**

```
hidden lg:flex          — 모바일 숨김, lg 이상 표시
lg:ml-64               — 사이드바 너비만큼 본문 밀기
grid md:grid-cols-2 lg:grid-cols-3 — 반응형 그리드
text-2xl md:text-3xl lg:text-4xl  — 반응형 제목
px-4 lg:px-6           — 반응형 좌우 패딩
```

---

## 14. 아이콘 규칙

Heroicons 스타일 SVG 인라인 사용 (외부 라이브러리 없음).

```tsx
<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
  <path strokeLinecap="round" strokeLinejoin="round" d="..." />
</svg>
```

| 크기 | 사용처 |
|------|--------|
| `w-4 h-4` | 버튼 내 아이콘, 스피너 |
| `w-5 h-5` | 네비 메뉴 아이콘, 모달 닫기 |
| `w-6 h-6` | 일반 UI 아이콘 |
| `w-12 h-12` | 섹션 카드 아이콘 배경 |

---

## 15. 자주 쓰는 패턴 모음

### 섹션 컨테이너

```tsx
<section className="py-24 bg-white">
  <div className="max-w-7xl mx-auto px-6">
    <div className="text-center mb-16">
      <h2 className="text-3xl md:text-4xl font-bold text-navy mb-4">제목</h2>
      <p className="text-text-muted max-w-2xl mx-auto">설명</p>
    </div>
    {/* 콘텐츠 */}
  </div>
</section>
```

### 호버 카드 그리드

```tsx
<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
  <div className="group bg-white rounded-xl p-6 border border-border hover:border-gold/40 transition-colors">
    <div className="w-12 h-12 rounded-lg bg-navy/5 group-hover:bg-gold/10 flex items-center justify-center mb-4 transition-colors">
      {/* 아이콘 */}
    </div>
    <h3 className="text-lg font-semibold text-text mb-2">제목</h3>
    <p className="text-sm text-text-muted">설명</p>
  </div>
</div>
```

### 대시보드 페이지 헤더

```tsx
<div className="mb-6">
  <h1 className="text-2xl font-bold text-text">페이지 제목</h1>
  <p className="text-text-muted mt-1">설명</p>
</div>
```

### 액션 버튼 행 (테이블 위)

```tsx
<div className="flex items-center justify-between mb-4">
  <div>{/* 필터 / 검색 */}</div>
  <Button variant="primary" size="sm">+ 추가</Button>
</div>
```

### 토글 스위치 (알림 설정 등)

```tsx
<button
  onClick={toggle}
  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
    ${active ? 'bg-navy' : 'bg-border'}`}
>
  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
    ${active ? 'translate-x-6' : 'translate-x-1'}`} />
</button>
```

### 빈 상태 (Empty State)

```tsx
<div className="text-center py-12 text-text-muted">
  <p className="text-sm">표시할 항목이 없습니다.</p>
</div>
```

### 확인 삭제 모달 버튼 배치

```tsx
<div className="flex gap-3 pt-4">
  <Button variant="secondary" className="flex-1" onClick={onClose}>취소</Button>
  <Button variant="danger" className="flex-1" onClick={onConfirm}>삭제</Button>
</div>
```

---

## 16. 색상 hex 빠른 참조

| 이름 | Hex | Tailwind 토큰 |
|------|-----|---------------|
| Navy | `#1B2A4A` | `navy` |
| Navy Light | `#243556` | `navy-light` |
| Navy Dark | `#111D33` | `navy-dark` |
| Gold | `#C9A96E` | `gold` |
| Gold Light | `#D4BA88` | `gold-light` |
| Surface | `#F8F9FC` | `surface` |
| Surface Dark | `#EEF0F5` | `surface-dark` |
| Text | `#1E293B` | `text` |
| Text Muted | `#64748B` | `text-muted` |
| Border | `#E2E8F0` | `border` |
| GO | `#22C55E` | `go` |
| GO BG | `#F0FDF4` | `go-bg` |
| CGO | `#F59E0B` | `cgo` |
| CGO BG | `#FFFBEB` | `cgo-bg` |
| NOGO | `#EF4444` | `nogo` |
| NOGO BG | `#FEF2F2` | `nogo-bg` |
