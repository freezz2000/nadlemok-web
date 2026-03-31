'use client'

import Card from '@/components/ui/Card'
import { QUESTION_GROUPS, DEFAULT_SCALE_LABELS } from '@/lib/template-constants'
import type { SurveyQuestion, QuestionGroup } from '@/lib/types'

export interface SurveyQuestionCardProps {
  question: SurveyQuestion & { _index: number }
  index: number
  total: number
  expandedKey: string | null
  onToggleExpand: (key: string) => void
  onUpdate: (index: number, updates: Partial<SurveyQuestion>) => void
  onRemove: (index: number) => void
  onMove: (index: number, direction: -1 | 1) => void
}

export default function SurveyQuestionCard({
  question: q,
  index,
  total,
  expandedKey,
  onToggleExpand,
  onUpdate,
  onRemove,
  onMove,
}: SurveyQuestionCardProps) {
  const isExpanded = expandedKey === q.key

  return (
    <Card padding="sm">
      <div className="flex items-start gap-3">
        {/* 순서 변경 */}
        <div className="flex flex-col gap-0.5 pt-1">
          <button onClick={() => onMove(index, -1)} className="text-text-muted hover:text-text p-0.5" disabled={index === 0}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button onClick={() => onMove(index, 1)} className="text-text-muted hover:text-text p-0.5" disabled={index === total - 1}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* 문항 내용 */}
        <div className="flex-1 space-y-2">
          <input
            type="text"
            value={q.label}
            onChange={(e) => onUpdate(index, { label: e.target.value })}
            className="w-full px-2 py-1 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
            placeholder="문항 내용을 입력하세요"
          />
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="text"
              value={q.key}
              onChange={(e) => onUpdate(index, { key: e.target.value })}
              className="w-36 px-2 py-1 border border-border rounded text-xs focus:outline-none focus:ring-2 focus:ring-navy/20"
              placeholder="문항 키"
            />
            <select
              value={q.group || ''}
              onChange={(e) => {
                const group = e.target.value as QuestionGroup
                onUpdate(index, {
                  group,
                  isKillSignal: group === 'killsignal',
                  key: group === 'killsignal' && !q.key.startsWith('KS_')
                    ? `KS_${q.key}`
                    : q.key.replace(/^KS_/, ''),
                })
              }}
              className="px-2 py-1 border border-border rounded text-xs focus:outline-none focus:ring-2 focus:ring-navy/20"
            >
              {QUESTION_GROUPS.map((g) => (
                <option key={g.key} value={g.key}>{g.label}</option>
              ))}
            </select>
            <select
              value={q.type}
              onChange={(e) => onUpdate(index, { type: e.target.value as 'scale' | 'text' | 'choice' })}
              className="px-2 py-1 border border-border rounded text-xs focus:outline-none focus:ring-2 focus:ring-navy/20"
            >
              <option value="scale">4점 척도</option>
              <option value="text">주관식</option>
              <option value="choice">객관식</option>
            </select>
            {q.type === 'scale' && (
              <button
                onClick={() => onToggleExpand(q.key)}
                className={`text-xs px-2 py-0.5 rounded transition-colors ${
                  isExpanded ? 'bg-navy/10 text-navy' : 'text-text-muted hover:text-navy'
                }`}
              >
                답변 설명 {isExpanded ? '접기' : '편집'}
              </button>
            )}
            {q.type === 'choice' && (
              <button
                onClick={() => onToggleExpand(q.key)}
                className={`text-xs px-2 py-0.5 rounded transition-colors ${
                  isExpanded ? 'bg-navy/10 text-navy' : 'text-text-muted hover:text-navy'
                }`}
              >
                선택지 {isExpanded ? '접기' : '편집'}
              </button>
            )}
          </div>

          {/* 4점 척도 답변 설명 */}
          {q.type === 'scale' && isExpanded && (
            <div className="mt-2 p-3 bg-surface rounded-lg">
              <p className="text-xs font-medium text-text-muted mb-2">4점 척도 답변 설명</p>
              <div className="grid grid-cols-4 gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i}>
                    <label className="text-xs text-text-muted block mb-1">{i + 1}점</label>
                    <input
                      type="text"
                      value={q.scaleLabels?.[i] || DEFAULT_SCALE_LABELS[i]}
                      onChange={(e) => {
                        const labels = [...(q.scaleLabels || [...DEFAULT_SCALE_LABELS])]
                        labels[i] = e.target.value
                        onUpdate(index, { scaleLabels: labels })
                      }}
                      className="w-full px-2 py-1 border border-border rounded text-xs focus:outline-none focus:ring-2 focus:ring-navy/20"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 객관식 선택지 편집 */}
          {q.type === 'choice' && isExpanded && (
            <div className="mt-2 p-3 bg-surface rounded-lg">
              <p className="text-xs font-medium text-text-muted mb-2">객관식 선택지</p>
              <div className="space-y-2">
                {(q.choices || []).map((choice, ci) => (
                  <div key={ci} className="flex items-center gap-2">
                    <span className="text-xs text-text-muted w-5">{ci + 1}.</span>
                    <input
                      type="text"
                      value={choice}
                      onChange={(e) => {
                        const choices = [...(q.choices || [])]
                        choices[ci] = e.target.value
                        onUpdate(index, { choices })
                      }}
                      className="flex-1 px-2 py-1 border border-border rounded text-xs focus:outline-none focus:ring-2 focus:ring-navy/20"
                      placeholder={`선택지 ${ci + 1}`}
                    />
                    <button
                      onClick={() => {
                        const choices = (q.choices || []).filter((_, i) => i !== ci)
                        onUpdate(index, { choices })
                      }}
                      className="text-text-muted hover:text-nogo p-0.5"
                      disabled={(q.choices || []).length <= 1}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => onUpdate(index, { choices: [...(q.choices || []), ''] })}
                  className="text-xs text-navy hover:underline mt-1"
                >
                  + 선택지 추가
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 삭제 */}
        <button onClick={() => onRemove(index)} className="text-text-muted hover:text-nogo p-1 mt-0.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </Card>
  )
}
