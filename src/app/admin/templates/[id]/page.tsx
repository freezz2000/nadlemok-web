'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import * as XLSX from 'xlsx'
import { CATEGORIES, PRODUCT_LINES, AVAILABLE_CATEGORIES, QUESTION_GROUPS, DEFAULT_SCALE_LABELS, getGroupConfig } from '@/lib/template-constants'
import type { SurveyTemplate, SurveyQuestion, QuestionGroup } from '@/lib/types'
import SurveyQuestionCard from '@/components/SurveyQuestionCard'

export default function TemplateEditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [template, setTemplate] = useState<SurveyTemplate | null>(null)
  const [saving, setSaving] = useState(false)
  const [showAddQuestion, setShowAddQuestion] = useState(false)
  const [newGroup, setNewGroup] = useState<QuestionGroup>('usage')
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  useEffect(() => { loadTemplate() }, [id])

  async function loadTemplate() {
    const { data } = await supabase.from('survey_templates').select('*').eq('id', id).single()
    if (data) {
      // type이 없는 구형 문항은 기본값 'scale'로 정규화
      data.questions = (data.questions || []).map((q: SurveyQuestion) => ({ ...q, type: (q.type || 'scale') as SurveyQuestion['type'] }))
    }
    setTemplate(data)
  }

  async function save() {
    if (!template) return
    setSaving(true)
    await supabase.from('survey_templates').update({
      name: template.name,
      description: template.description,
      category: template.category,
      product_line: template.product_line,
      questions: template.questions,
    }).eq('id', id)
    setSaving(false)
  }

  function addQuestion(group: QuestionGroup) {
    if (!template) return
    const groupConfig = getGroupConfig(group)
    const isKS = group === 'killsignal'
    const prefix = isKS ? 'KS_' : ''
    const newQ: SurveyQuestion = {
      key: `${prefix}q_${Date.now()}`,
      label: '',
      type: 'scale',
      scale: 4,
      scaleLabels: [...DEFAULT_SCALE_LABELS],
      isKillSignal: isKS,
      group,
      order: template.questions.length + 1,
    }
    setTemplate({ ...template, questions: [...template.questions, newQ] })
    setShowAddQuestion(false)
  }

  function handleExcelUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !template) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      const data = evt.target?.result
      const workbook = XLSX.read(data, { type: 'binary' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet)

      const groupMap: Record<string, QuestionGroup> = {
        'killsignal': 'killsignal', 'kill signal': 'killsignal', 'ks': 'killsignal', 'kill_signal': 'killsignal',
        '사용감': 'usage', 'usage': 'usage',
        '기능성': 'function', 'function': 'function',
        'claim risk': 'claim_risk', 'claim_risk': 'claim_risk', '클레임': 'claim_risk',
        '검증문항': 'verification', 'verification': 'verification', '검증': 'verification',
        '종합평가': 'overall', 'overall': 'overall', '종합': 'overall',
      }

      const newQuestions: SurveyQuestion[] = rows.map((row, i) => {
        const groupRaw = (row['그룹'] || row['group'] || row['Group'] || '').toLowerCase().trim()
        const group = groupMap[groupRaw] || 'usage'
        const typeRaw = (row['타입'] || row['type'] || row['Type'] || 'scale').toLowerCase().trim()
        const type = typeRaw === '주관식' || typeRaw === 'text' ? 'text' : 'scale' as 'scale' | 'text'
        const isKS = group === 'killsignal'
        const key = row['키'] || row['key'] || row['Key'] || `${isKS ? 'KS_' : ''}q_${Date.now()}_${i}`

        const q: SurveyQuestion = {
          key,
          label: row['문항'] || row['label'] || row['Label'] || row['질문'] || '',
          type,
          isKillSignal: isKS,
          group,
          order: template.questions.length + i + 1,
        }

        if (type === 'scale') {
          q.scale = 4
          const l1 = row['1점'] || row['1점 설명'] || ''
          const l2 = row['2점'] || row['2점 설명'] || ''
          const l3 = row['3점'] || row['3점 설명'] || ''
          const l4 = row['4점'] || row['4점 설명'] || ''
          if (l1 || l2 || l3 || l4) {
            q.scaleLabels = [
              l1 || DEFAULT_SCALE_LABELS[0],
              l2 || DEFAULT_SCALE_LABELS[1],
              l3 || DEFAULT_SCALE_LABELS[2],
              l4 || DEFAULT_SCALE_LABELS[3],
            ]
          } else {
            q.scaleLabels = [...DEFAULT_SCALE_LABELS]
          }
        }

        return q
      }).filter((q) => q.label)

      setTemplate({ ...template, questions: [...template.questions, ...newQuestions] })
      setShowAddQuestion(false)
    }
    reader.readAsBinaryString(file)
    e.target.value = ''
  }

  function downloadSampleExcel() {
    const sampleData = [
      { '그룹': 'killsignal', '키': 'KS_따가움', '문항': '사용 시 따가움이나 화끈거림을 느꼈다', '타입': '4점척도', '1점': '전혀 아니다', '2점': '아니다', '3점': '그렇다', '4점': '매우 그렇다' },
      { '그룹': '사용감', '키': '부드럽게발림', '문항': '부드럽게 잘 발린다', '타입': '4점척도', '1점': '전혀 아니다', '2점': '아니다', '3점': '그렇다', '4점': '매우 그렇다' },
      { '그룹': '기능성', '키': '보습체감', '문항': '보습 효과를 체감한다', '타입': '4점척도', '1점': '전혀 아니다', '2점': '아니다', '3점': '그렇다', '4점': '매우 그렇다' },
      { '그룹': 'claim risk', '키': '광고일치', '문항': '마케팅 문구가 실제 사용감과 일치한다', '타입': '4점척도', '1점': '전혀 아니다', '2점': '아니다', '3점': '그렇다', '4점': '매우 그렇다' },
      { '그룹': '종합평가', '키': '전반만족도', '문항': '이 제품에 전반적으로 만족한다', '타입': '4점척도', '1점': '전혀 아니다', '2점': '아니다', '3점': '그렇다', '4점': '매우 그렇다' },
      { '그룹': '종합평가', '키': 'open_weakness', '문항': '이 제품의 단점을 자유롭게 적어주세요', '타입': '주관식', '1점': '', '2점': '', '3점': '', '4점': '' },
    ]
    const ws = XLSX.utils.json_to_sheet(sampleData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '설문문항')
    ws['!cols'] = [{ wch: 12 }, { wch: 16 }, { wch: 40 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }]
    XLSX.writeFile(wb, '설문문항_샘플.xlsx')
  }

  function addTextQuestion() {
    if (!template) return
    const newQ: SurveyQuestion = {
      key: `open_${Date.now()}`,
      label: '',
      type: 'text',
      isKillSignal: false,
      group: 'overall',
      order: template.questions.length + 1,
    }
    setTemplate({ ...template, questions: [...template.questions, newQ] })
    setShowAddQuestion(false)
  }

  function addChoiceQuestion() {
    if (!template) return
    const newQ: SurveyQuestion = {
      key: `choice_${Date.now()}`,
      label: '',
      type: 'choice',
      choices: ['예', '아니오'],
      isKillSignal: false,
      group: 'overall',
      order: template.questions.length + 1,
    }
    setTemplate({ ...template, questions: [...template.questions, newQ] })
    setShowAddQuestion(false)
  }

  function updateQuestion(index: number, updates: Partial<SurveyQuestion>) {
    if (!template) return
    const questions = [...template.questions]
    questions[index] = { ...questions[index], ...updates }
    setTemplate({ ...template, questions })
  }

  function removeQuestion(index: number) {
    if (!template) return
    setTemplate({ ...template, questions: template.questions.filter((_, i) => i !== index) })
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    if (!template) return
    const questions = [...template.questions]
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= questions.length) return
    ;[questions[index], questions[newIndex]] = [questions[newIndex], questions[index]]
    setTemplate({ ...template, questions })
  }

  if (!template) return <p className="text-text-muted">로딩중...</p>

  // 그룹별로 문항 분류
  const groupedQuestions = QUESTION_GROUPS.map((g) => ({
    ...g,
    questions: template.questions
      .map((q, i) => ({ ...q, _index: i }))
      .filter((q) => q.group === g.key),
  }))
  const ungroupedQuestions = template.questions
    .map((q, i) => ({ ...q, _index: i }))
    .filter((q) => !q.group)

  const productLines = PRODUCT_LINES[template.category || ''] || []

  const groupBadgeVariant = (color: string) => {
    const map: Record<string, 'nogo' | 'info' | 'go' | 'warning' | 'default'> = {
      nogo: 'nogo', info: 'info', go: 'go', warning: 'warning', default: 'default',
    }
    return map[color] || 'default'
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/admin/templates')} className="text-text-muted hover:text-text">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-text">템플릿 편집</h1>
        </div>
        <Button onClick={save} loading={saving}>저장</Button>
      </div>

      {/* 기본 정보 */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">템플릿 이름</label>
            <input
              type="text"
              value={template.name}
              onChange={(e) => setTemplate({ ...template, name: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">카테고리</label>
            <select
              value={template.category || ''}
              onChange={(e) => setTemplate({ ...template, category: e.target.value, product_line: '' })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat} disabled={!AVAILABLE_CATEGORIES.includes(cat)}>
                  {cat}{!AVAILABLE_CATEGORIES.includes(cat) ? ' (준비중)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">제품군</label>
            <select
              value={template.product_line || ''}
              onChange={(e) => setTemplate({ ...template, product_line: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
              disabled={productLines.length === 0}
            >
              <option value="">선택 안 함</option>
              {productLines.map((pl) => (
                <option key={pl} value={pl}>{pl}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">설명</label>
            <input
              type="text"
              value={template.description || ''}
              onChange={(e) => setTemplate({ ...template, description: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
            />
          </div>
        </div>
      </Card>

      {/* 문항 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text">문항 ({template.questions.length}개)</h2>
        <Button variant="secondary" size="sm" onClick={() => setShowAddQuestion(true)}>문항 추가</Button>
      </div>

      {/* 그룹별 문항 목록 */}
      {groupedQuestions.map((group) => (
        group.questions.length > 0 && (
          <div key={group.key} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant={groupBadgeVariant(group.color)}>{group.label}</Badge>
              <span className="text-xs text-text-muted">{group.description}</span>
              <span className="text-xs text-text-muted ml-auto">{group.questions.length}개</span>
            </div>
            <div className="space-y-2">
              {group.questions.map((q) => (
                <SurveyQuestionCard
                  key={q.key}
                  question={q}
                  index={q._index}
                  total={template.questions.length}
                  expandedKey={expandedKey}
                  onToggleExpand={(key) => setExpandedKey(expandedKey === key ? null : key)}
                  onUpdate={updateQuestion}
                  onRemove={removeQuestion}
                  onMove={moveQuestion}
                />
              ))}
            </div>
          </div>
        )
      ))}

      {/* 그룹 미지정 문항 */}
      {ungroupedQuestions.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Badge>미분류</Badge>
            <span className="text-xs text-text-muted">{ungroupedQuestions.length}개</span>
          </div>
          <div className="space-y-2">
            {ungroupedQuestions.map((q) => (
              <SurveyQuestionCard
                key={q.key}
                question={q}
                index={q._index}
                total={template.questions.length}
                expandedKey={expandedKey}
                onToggleExpand={(key) => setExpandedKey(expandedKey === key ? null : key)}
                onUpdate={updateQuestion}
                onRemove={removeQuestion}
                onMove={moveQuestion}
              />
            ))}
          </div>
        </div>
      )}

      {template.questions.length === 0 && (
        <Card className="text-center py-8">
          <p className="text-text-muted mb-2">아직 문항이 없습니다.</p>
          <button onClick={() => setShowAddQuestion(true)} className="text-navy text-sm font-medium hover:underline">
            문항 추가하기
          </button>
        </Card>
      )}

      {/* 문항 추가 모달 */}
      <Modal open={showAddQuestion} onClose={() => setShowAddQuestion(false)} title="문항 추가" size="md">
        <div className="space-y-3">
          <p className="text-sm text-text-muted mb-2">추가할 문항 그룹을 선택하세요</p>
          {QUESTION_GROUPS.map((g) => (
            <button
              key={g.key}
              onClick={() => addQuestion(g.key)}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-navy/30 hover:bg-surface/50 transition-all text-left"
            >
              <Badge variant={groupBadgeVariant(g.color)}>{g.label}</Badge>
              <div className="flex-1">
                <p className="text-sm font-medium text-text">{g.description}</p>
                <p className="text-xs text-text-muted">4점 척도 문항</p>
              </div>
            </button>
          ))}
          <div className="border-t border-border pt-3 mt-3 space-y-2">
            <button
              onClick={addTextQuestion}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-navy/30 hover:bg-surface/50 transition-all text-left"
            >
              <Badge>주관식</Badge>
              <div className="flex-1">
                <p className="text-sm font-medium text-text">주관식 문항</p>
                <p className="text-xs text-text-muted">자유 텍스트 입력</p>
              </div>
            </button>
            <button
              onClick={addChoiceQuestion}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-navy/30 hover:bg-surface/50 transition-all text-left"
            >
              <Badge variant="info">객관식</Badge>
              <div className="flex-1">
                <p className="text-sm font-medium text-text">객관식 문항</p>
                <p className="text-xs text-text-muted">선택지 중 하나 선택</p>
              </div>
            </button>
          </div>

          {/* 엑셀 업로드 */}
          <div className="border-t border-border pt-4 mt-4">
            <p className="text-sm font-medium text-text mb-2">엑셀로 일괄 업로드</p>
            <p className="text-xs text-text-muted mb-3">
              엑셀 파일로 여러 문항을 한 번에 추가합니다. 열: 그룹 / 키 / 문항 / 타입 / 1점 / 2점 / 3점 / 4점
            </p>
            <div className="flex items-center gap-2">
              <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-navy/30 hover:bg-surface/50 transition-all">
                <svg className="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="text-sm text-text-muted">.xlsx 파일 선택</span>
                <input type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} className="hidden" />
              </label>
            </div>
            <button onClick={downloadSampleExcel} className="text-xs text-navy hover:underline mt-2">
              샘플 엑셀 다운로드
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
