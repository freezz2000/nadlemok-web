"use client";

import { useState } from "react";

const scaleLabels = ['매우 그렇지 않다', '그렇지 않다', '그렇다', '매우 그렇다'];

type Question = {
  key: string;
  label: string;
  type: 'scale' | 'text';
  isKillSignal?: boolean;
  groupLabel?: string;
};

const QUESTIONS: Question[] = [
  { key: 'KS_자극', label: '제품 사용 후 피부에 자극감이 느껴졌다', type: 'scale', isKillSignal: true, groupLabel: '킬시그널' },
  { key: 'KS_끈적임', label: '제품이 지나치게 끈적였다', type: 'scale', isKillSignal: true },
  { key: '발림성', label: '제품이 피부에 부드럽게 발렸다', type: 'scale', groupLabel: '사용감' },
  { key: '흡수력', label: '제품이 빠르게 흡수되었다', type: 'scale' },
  { key: '수분감', label: '사용 후 충분한 수분감이 느껴졌다', type: 'scale' },
  { key: '미백효과', label: '피부 톤이 밝아진 것이 느껴졌다', type: 'scale', groupLabel: '기능성' },
  { key: '주름개선', label: '주름이 개선된 느낌이 들었다', type: 'scale' },
  { key: '전반만족', label: '이 제품에 전반적으로 만족한다', type: 'scale', groupLabel: '종합평가' },
  { key: '구매의향', label: '이 제품을 구매할 의향이 있다', type: 'scale' },
  { key: '추천의향', label: '지인에게 이 제품을 추천하겠다', type: 'scale' },
  { key: 'open_weakness', label: '사용하면서 아쉬웠던 점을 자유롭게 적어주세요', type: 'text' },
  { key: 'open_improvement', label: '개선되었으면 하는 점이 있다면 적어주세요', type: 'text' },
];

const scaleQuestions = QUESTIONS.filter((q) => q.type === 'scale');
const textQuestions = QUESTIONS.filter((q) => q.type === 'text');

export default function DemoPanelSection() {
  const [responses, setResponses] = useState<Record<string, number | string>>({});
  const [submitted, setSubmitted] = useState(false);

  const answeredCount = scaleQuestions.filter((q) => responses[q.key] !== undefined).length;
  const progress = Math.round((answeredCount / scaleQuestions.length) * 100);
  const allAnswered = answeredCount === scaleQuestions.length;

  function setScale(key: string, val: number) {
    setResponses((prev) => ({ ...prev, [key]: val }));
  }

  return (
    <section id="demo-panel" className="py-24 bg-surface">
      <div className="max-w-2xl mx-auto px-6">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-navy mb-3">패널 설문 체험</h2>
          <p className="text-text-muted">실제 패널이 사용하는 설문 화면입니다. 직접 클릭해 보세요.</p>
        </div>

        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text">비타민C 앰플 세럼 평가</h1>
        </div>

        {/* 진행률 */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-text-muted mb-1">
            <span>진행률</span>
            <span>{answeredCount} / {scaleQuestions.length} ({progress}%)</span>
          </div>
          <div className="h-2 bg-surface-dark rounded-full overflow-hidden">
            <div className="h-full bg-navy rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* 척도 문항 */}
        <div className="space-y-4">
          {scaleQuestions.map((q, i) => (
            <div key={q.key} className="bg-white rounded-xl border border-border p-4 shadow-sm">
              {q.groupLabel && (
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">{q.groupLabel}</p>
              )}
              <div className="flex items-start gap-2 mb-3">
                <span className="text-sm text-text-muted">{i + 1}.</span>
                <p className="text-sm font-medium text-text flex-1">{q.label}</p>
                {q.isKillSignal && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-nogo/10 text-nogo font-medium border border-nogo/20">KS</span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2 ml-5">
                {[1, 2, 3, 4].map((val) => (
                  <button
                    key={val}
                    onClick={() => setScale(q.key, val)}
                    className={`py-2.5 px-2 rounded-lg text-xs text-center transition-all ${
                      responses[q.key] === val
                        ? 'bg-navy text-white font-medium'
                        : 'border border-border hover:border-navy/30 text-text-muted hover:text-text'
                    }`}
                  >
                    {scaleLabels[val - 1]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 주관식 문항 */}
        <div className="mt-6 space-y-4">
          {textQuestions.map((q) => (
            <div key={q.key} className="bg-white rounded-xl border border-border p-4 shadow-sm">
              <p className="text-sm font-medium text-text mb-2">{q.label}</p>
              <textarea
                value={(responses[q.key] as string) || ''}
                onChange={(e) => setResponses((prev) => ({ ...prev, [q.key]: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 min-h-[80px]"
                placeholder="자유롭게 작성해주세요"
              />
            </div>
          ))}
        </div>

        {/* 제출 버튼 */}
        <div className="mt-8 mb-12">
          <button
            onClick={() => allAnswered && setSubmitted(true)}
            disabled={!allAnswered}
            className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
              allAnswered
                ? 'bg-navy text-white hover:bg-navy/90 cursor-pointer'
                : 'bg-surface-dark text-text-muted cursor-not-allowed'
            }`}
          >
            응답 제출 ({answeredCount}/{scaleQuestions.length})
          </button>
          {!allAnswered && (
            <p className="text-xs text-text-muted text-center mt-2">모든 척도 문항에 응답해야 제출할 수 있습니다.</p>
          )}
          {submitted && (
            <p className="text-sm text-go text-center mt-3 font-medium">제출되었습니다. 감사합니다!</p>
          )}
        </div>
      </div>
    </section>
  );
}
