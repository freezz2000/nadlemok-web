'use client'

import { useState } from 'react'
import DemoDashboardSection from './DemoDashboardSection'

const STAGES = [
  { key: 'pending',    label: '신청',       desc: '서비스 신청이 접수되어 승인 대기 중입니다' },
  { key: 'draft',      label: '설문 설정',  desc: '코호트를 선택하고 설문을 설정해주세요' },
  { key: 'confirmed',  label: '관리자 확정', desc: '관리자가 설문을 확정했습니다. 내용을 검토하고 승인해주세요' },
  { key: 'approved',   label: '승인 완료',  desc: '설문이 승인되어 패널 모집 대기 중입니다' },
  { key: 'recruiting', label: '패널 모집',  desc: '타겟에 맞는 패널을 선별 중입니다' },
  { key: 'testing',    label: '테스트',     desc: '패널이 제품을 사용하고 평가 중입니다' },
  { key: 'analyzing',  label: '분석',       desc: '수집된 데이터를 분석 중입니다' },
  { key: 'completed',  label: '완료',       desc: '분석이 완료되어 리포트를 확인할 수 있습니다' },
]

const SAMPLE_QUESTIONS = [
  { key: 'q1', label: '이 제품을 전반적으로 얼마나 만족하셨나요?', type: 'scale', group: 'overall', isKillSignal: false, scaleLabels: ['매우 불만족', '불만족', '만족', '매우 만족'] },
  { key: 'q2', label: '향이 어떠셨나요?', type: 'scale', group: 'sensory', isKillSignal: false, scaleLabels: ['매우 나쁨', '나쁨', '좋음', '매우 좋음'] },
  { key: 'q3', label: '피부에 바를 때 발림성이 어떠셨나요?', type: 'scale', group: 'sensory', isKillSignal: false, scaleLabels: ['매우 나쁨', '나쁨', '좋음', '매우 좋음'] },
  { key: 'q4', label: '사용 후 보습감이 지속되었나요?', type: 'scale', group: 'efficacy', isKillSignal: false, scaleLabels: ['전혀 없음', '부족함', '충분함', '매우 충분함'] },
  { key: 'ks1', label: '사용 중 따가움이나 붉어짐 등의 자극을 느끼셨나요?', type: 'choice', group: 'killsignal', isKillSignal: true, choices: ['예', '아니오'], scaleLabels: [] },
]

const GROUP_BADGE: Record<string, string> = {
  overall:    'bg-slate-100 text-slate-600',
  sensory:    'bg-blue-50 text-blue-600',
  efficacy:   'bg-green-50 text-green-700',
  killsignal: 'bg-red-50 text-red-600',
}
const GROUP_LABEL: Record<string, string> = {
  overall: '전체', sensory: '감각', efficacy: '효능', killsignal: 'Kill Signal',
}

const STATUS_LABEL: Record<string, string> = {
  pending: '승인 대기', draft: '설문 설정 중', confirmed: '관리자 확정',
  approved: '승인 완료', recruiting: '패널 모집 중', testing: '테스트 중',
  analyzing: '분석 중', completed: '완료',
}
const STATUS_COLOR: Record<string, string> = {
  pending:    'bg-amber-100 text-amber-700',
  draft:      'bg-blue-100 text-blue-700',
  confirmed:  'bg-indigo-100 text-indigo-700',
  approved:   'bg-teal-100 text-teal-700',
  recruiting: 'bg-cyan-100 text-cyan-700',
  testing:    'bg-violet-100 text-violet-700',
  analyzing:  'bg-orange-100 text-orange-700',
  completed:  'bg-green-100 text-green-700',
}
const RESPONDED: Record<string, [number, number]> = {
  pending: [0,0], draft: [0,0], confirmed: [0,0], approved: [0,0],
  recruiting: [0,0], testing: [18,50], analyzing: [50,50], completed: [50,50],
}

/* ─── 공통: 진행현황 + 기본정보 카드 ─── */
function ProjectFrame({ stage, children }: { stage: string; children: React.ReactNode }) {
  const idx = STAGES.findIndex(s => s.key === stage)
  const [responded, total] = RESPONDED[stage] ?? [0, 0]

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-text-muted mb-1">← 프로젝트 목록</p>
          <h1 className="text-2xl font-bold text-text">모이스처 크림 시제품 v2</h1>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[stage]}`}>
          {STATUS_LABEL[stage]}
        </span>
      </div>

      {/* 진행 현황 */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-5 mb-6">
        <p className="text-sm font-semibold text-text mb-4">진행 현황</p>
        <div className="flex items-center">
          {STAGES.map((s, i) => (
            <div key={s.key} className="flex-1 flex items-center">
              <div className="flex flex-col items-center text-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  i < idx  ? 'bg-navy text-white' :
                  i === idx ? 'bg-navy text-white ring-4 ring-navy/20' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {i < idx ? '✓' : i + 1}
                </div>
                <span className={`text-[10px] mt-1 leading-tight text-center max-w-[48px] ${i <= idx ? 'text-navy font-medium' : 'text-text-muted'}`}>
                  {s.label}
                </span>
              </div>
              {i < STAGES.length - 1 && (
                <div className={`flex-1 h-0.5 mx-0.5 ${i < idx ? 'bg-navy' : 'bg-gray-100'}`} />
              )}
            </div>
          ))}
        </div>
        <p className="text-sm text-text-muted mt-5 text-center">{STAGES[idx].desc}</p>
      </div>

      {/* 기본 정보 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: '플랜', value: 'STANDARD', color: 'text-navy' },
          { label: '패널 규모', value: '50명',   color: 'text-text' },
          { label: '테스트 기간', value: '10일', color: 'text-text' },
          { label: '응답 진행', value: `${responded} / ${total}`, color: 'text-green-600' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-border shadow-sm p-4">
            <p className="text-xs text-text-muted">{c.label}</p>
            <p className={`text-lg font-bold mt-1 ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {children}
    </div>
  )
}

/* ─── Stage 콘텐츠 ─── */
function PendingContent() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
      <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
        <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p className="font-medium text-amber-800 mb-1">승인 대기 중</p>
      <p className="text-sm text-amber-700">나들목 운영팀이 신청 내용을 검토하고 있습니다.<br />1~2 영업일 내에 담당자가 연락드릴 예정입니다.</p>
    </div>
  )
}

function DraftContent() {
  const genders = ['여성', '남성']
  const ages    = ['10대', '20대', '30대', '40대', '50대 이상']
  const skins   = ['건성', '복합성', '지성', '중성', '민감성']
  const [selG, setSelG] = useState(['여성'])
  const [selA, setSelA] = useState(['20대', '30대'])
  const [selS, setSelS] = useState(['건성', '복합성'])
  const tog = (arr: string[], v: string) => arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]

  return (
    <>
      <div className="bg-white rounded-xl border border-border shadow-sm p-5 mb-6">
        <p className="text-sm font-semibold text-text mb-1">타겟 코호트 선택</p>
        <p className="text-xs text-text-muted mb-4">원하는 패널 조건을 복수 선택해주세요</p>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-text-muted mb-2">성별</p>
            <div className="flex gap-2">
              {genders.map(g => (
                <button key={g} onClick={() => setSelG(tog(selG, g))}
                  className={`flex-1 py-2 rounded-lg border text-sm transition-all ${selG.includes(g) ? 'border-navy bg-navy/5 font-medium text-navy' : 'border-border text-text-muted hover:border-navy/30'}`}>
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-text-muted mb-2">연령대</p>
            <div className="flex flex-wrap gap-2">
              {ages.map(a => (
                <button key={a} onClick={() => setSelA(tog(selA, a))}
                  className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${selA.includes(a) ? 'border-navy bg-navy/5 font-medium text-navy' : 'border-border text-text-muted hover:border-navy/30'}`}>
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-text-muted mb-2">피부타입</p>
            <div className="flex flex-wrap gap-2">
              {skins.map(s => (
                <button key={s} onClick={() => setSelS(tog(selS, s))}
                  className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${selS.includes(s) ? 'border-navy bg-navy/5 font-medium text-navy' : 'border-border text-text-muted hover:border-navy/30'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-text">설문 설정</p>
          <span className="text-sm text-text-muted">{SAMPLE_QUESTIONS.length}개 문항</span>
        </div>
        <p className="text-xs text-text-muted mb-4">템플릿을 불러온 후 문항을 자유롭게 수정하세요.</p>
        <div className="mb-4 p-3 bg-surface rounded-lg flex items-center gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-text">템플릿: 화장품 기본 템플릿</p>
            <p className="text-xs text-text-muted mt-0.5">현재 5개 문항</p>
          </div>
          <button className="text-xs px-2.5 py-1 border border-border rounded-lg text-text-muted">연결 해제</button>
        </div>
        <div className="space-y-2 mb-4">
          {SAMPLE_QUESTIONS.map((q, i) => (
            <div key={q.key} className="flex items-center gap-3 p-3 border border-border rounded-lg bg-white">
              <span className="text-xs text-text-muted w-5 flex-shrink-0">{i + 1}.</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text truncate">{q.label}</p>
                {q.type === 'scale' && (
                  <div className="flex gap-1.5 mt-1 flex-wrap">
                    {q.scaleLabels.map((l, li) => (
                      <span key={li} className="text-xs text-text-muted bg-surface-dark px-1.5 py-0.5 rounded">{li + 1}. {l}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {q.isKillSignal && <span className="text-xs px-1.5 py-0.5 bg-red-50 text-red-600 rounded font-medium">KS</span>}
                <span className={`text-xs px-1.5 py-0.5 rounded ${GROUP_BADGE[q.group]}`}>{GROUP_LABEL[q.group]}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 pt-3 border-t border-border">
          <button className="px-4 py-2 text-sm border border-border rounded-lg text-text-muted hover:bg-surface transition-colors">임시 저장</button>
          <button className="px-4 py-2 text-sm bg-navy text-white rounded-lg hover:bg-navy-dark transition-colors">설문 확정</button>
        </div>
      </div>
    </>
  )
}

function ConfirmedContent() {
  const [open, setOpen] = useState(true)
  return (
    <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-5 mb-6">
      <div className="flex items-start gap-3 mb-4">
        <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p className="text-sm font-semibold text-text">설문 승인 요청</p>
          <p className="text-sm text-text-muted mt-1">관리자가 설문을 확정했습니다. 아래 문항을 검토한 후 승인해주세요. 승인하시면 패널 모집이 시작됩니다.</p>
        </div>
      </div>
      <div className="border border-blue-200 rounded-xl overflow-hidden mb-4">
        <button onClick={() => setOpen(!open)}
          className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50/50 hover:bg-blue-50 transition-colors text-left">
          <svg className={`w-4 h-4 text-blue-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <span className="flex-1 text-sm font-medium text-text">설문 문항 목록</span>
          <span className="text-xs text-text-muted">{SAMPLE_QUESTIONS.length}문항</span>
        </button>
        {open && (
          <div className="border-t border-blue-200 bg-white px-4 py-3">
            {SAMPLE_QUESTIONS.map((q, i) => (
              <div key={q.key} className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0">
                <span className="text-xs text-text-muted w-6 flex-shrink-0 pt-0.5">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text leading-snug">{q.label}</p>
                  {q.type === 'scale' && (
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      {q.scaleLabels.map((l, li) => (
                        <span key={li} className="text-xs text-text-muted bg-surface-dark px-1.5 py-0.5 rounded">{li + 1}. {l}</span>
                      ))}
                    </div>
                  )}
                  {q.type === 'choice' && (
                    <div className="flex gap-1.5 mt-1.5">
                      {q.choices?.map((ch, ci) => (
                        <span key={ci} className="text-xs text-text-muted bg-surface-dark px-1.5 py-0.5 rounded">{ch}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
                  {q.isKillSignal && <span className="text-xs px-1.5 py-0.5 bg-red-50 text-red-600 rounded font-medium">KS</span>}
                  <span className={`text-xs px-1.5 py-0.5 rounded ${GROUP_BADGE[q.group]}`}>{GROUP_LABEL[q.group]}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-muted">총 {SAMPLE_QUESTIONS.length}개 문항</p>
        <button className="px-4 py-2 text-sm bg-navy text-white rounded-lg hover:bg-navy-dark transition-colors">설문 승인하기</button>
      </div>
    </div>
  )
}

function ApprovedContent() {
  return (
    <div className="bg-teal-50 border border-teal-200 rounded-xl p-6 text-center mb-6">
      <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-3">
        <svg className="w-6 h-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p className="font-medium text-teal-800 mb-1">설문이 승인되었습니다</p>
      <p className="text-sm text-teal-700">나들목 운영팀이 타겟 조건에 맞는 패널 모집을 준비하고 있습니다.</p>
    </div>
  )
}

function RecruitingContent() {
  return (
    <>
      <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-6 text-center mb-6">
        <div className="w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <p className="font-medium text-cyan-800 mb-1">패널 모집 중</p>
        <p className="text-sm text-cyan-700">여성 · 20~30대 · 건성/복합성 조건의 패널을 선별하고 있습니다.</p>
      </div>
      <div className="bg-white rounded-xl border border-border shadow-sm p-5 mb-6">
        <p className="text-sm font-semibold text-text mb-3">모집 진행 현황</p>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <div className="bg-cyan-400 h-full rounded-full" style={{ width: '0%' }} />
          </div>
          <span className="text-sm font-medium text-text-muted">0 / 50명</span>
        </div>
        <p className="text-xs text-text-muted">조건: 여성, 20~30대, 건성/복합성 피부</p>
      </div>
    </>
  )
}

function TestingContent() {
  return (
    <>
      <div className="bg-violet-50 border border-violet-200 rounded-xl p-6 text-center mb-6">
        <div className="w-12 h-12 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="font-medium text-violet-800 mb-1">테스트 진행 중</p>
        <p className="text-sm text-violet-700">50명의 패널이 제품을 사용하고 설문에 응답하고 있습니다.</p>
      </div>
      <div className="bg-white rounded-xl border border-border shadow-sm p-5 mb-6">
        <p className="text-sm font-semibold text-text mb-3">응답 현황</p>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <div className="bg-violet-400 h-full rounded-full" style={{ width: '36%' }} />
          </div>
          <span className="text-sm font-medium text-violet-700">18 / 50명</span>
        </div>
        <p className="text-xs text-text-muted mb-4">테스트 7일차 · 잔여 3일</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '응답 완료', value: '18명', color: 'text-violet-700' },
            { label: '진행 중',   value: '25명', color: 'text-blue-600' },
            { label: '미응답',    value: '7명',  color: 'text-text-muted' },
          ].map(s => (
            <div key={s.label} className="bg-surface rounded-lg p-3 text-center">
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-text-muted mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function AnalyzingContent() {
  const steps = [
    { label: '기초 통계',    done: true },
    { label: '감각 분석',    done: true },
    { label: '효능 분석',    done: true },
    { label: 'Kill Signal 검출', done: false },
    { label: '종합 판정',    done: false },
  ]
  return (
    <>
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 text-center mb-6">
        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-orange-600 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
        <p className="font-medium text-orange-800 mb-1">데이터 분석 중</p>
        <p className="text-sm text-orange-700">50명의 응답 데이터를 분석하고 있습니다. 분석 완료 시 알림을 보내드립니다.</p>
      </div>
      <div className="bg-white rounded-xl border border-border shadow-sm p-5 mb-6">
        <p className="text-sm font-semibold text-text mb-3">분석 단계 현황</p>
        {steps.map(step => (
          <div key={step.label} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${step.done ? 'bg-green-100' : 'bg-gray-100'}`}>
              {step.done
                ? <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                : <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" />
              }
            </div>
            <span className={`text-sm flex-1 ${step.done ? 'text-text' : 'text-text-muted'}`}>{step.label}</span>
            <span className={`text-xs font-medium ${step.done ? 'text-green-600' : 'text-orange-500'}`}>{step.done ? '완료' : '진행 중'}</span>
          </div>
        ))}
      </div>
    </>
  )
}

function CompletedContent() {
  const [showResults, setShowResults] = useState(false)
  return (
    <>
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center mb-6">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="font-semibold text-green-800 text-lg mb-1">분석이 완료되었습니다!</p>
        <p className="text-sm text-green-700 mb-4">50명의 소비자 테스트 결과를 확인해보세요.</p>
        <button
          onClick={() => setShowResults(!showResults)}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-navy text-white rounded-lg text-sm font-medium hover:bg-navy-dark transition-colors"
        >
          {showResults ? '결과 닫기' : '분석 결과 확인하기 →'}
        </button>
      </div>
      {showResults && <DemoDashboardSection hideHeader />}
    </>
  )
}

/* ─── 메인 export ─── */
export default function ClientDemoSection() {
  const [activeIdx, setActiveIdx] = useState(0)
  const active = STAGES[activeIdx]

  return (
    <section className="py-16 bg-surface min-h-screen">
      <div className="max-w-5xl mx-auto px-6">
        {/* 섹션 헤더 */}
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-navy mb-3">고객 체험(단계별 예시)</h2>
          <p className="text-text-muted">단계를 클릭하면 해당 화면을 미리 볼 수 있습니다.</p>
        </div>

        {/* 단계 선택 탭 */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {STAGES.map((s, i) => (
            <button
              key={s.key}
              onClick={() => setActiveIdx(i)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                i === activeIdx
                  ? 'bg-navy text-white shadow-md'
                  : 'bg-white border border-border text-text-muted hover:border-navy/30 hover:text-navy'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                i === activeIdx ? 'bg-white/20' : 'bg-surface-dark'
              }`}>{i + 1}</span>
              {s.label}
            </button>
          ))}
        </div>

        {/* 현재 단계 설명 */}
        <p className="text-center text-sm text-text-muted mb-8">
          <span className="font-medium text-navy">Step {activeIdx + 1} · {active.label}</span>{' '}— {active.desc}
        </p>

        {/* 브라우저 프레임 */}
        <div className="bg-white rounded-2xl border border-border shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-border">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 bg-white border border-border rounded-md px-3 py-1 text-xs text-text-muted text-center mx-4">
              nadlemok.co.kr/client/projects/demo
            </div>
          </div>
          <div className="p-6 bg-surface/40">
            <ProjectFrame stage={active.key}>
              {active.key === 'pending'    && <PendingContent />}
              {active.key === 'draft'      && <DraftContent />}
              {active.key === 'confirmed'  && <ConfirmedContent />}
              {active.key === 'approved'   && <ApprovedContent />}
              {active.key === 'recruiting' && <RecruitingContent />}
              {active.key === 'testing'    && <TestingContent />}
              {active.key === 'analyzing'  && <AnalyzingContent />}
              {active.key === 'completed'  && <CompletedContent />}
            </ProjectFrame>
          </div>
        </div>
      </div>
    </section>
  )
}
