'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Card, { CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Link from 'next/link'
import { CATEGORIES, PRODUCT_LINES, AVAILABLE_CATEGORIES } from '@/lib/template-constants'
import type { SurveyTemplate } from '@/lib/types'

export default function TemplatesPage() {
  const supabase = createClient()
  const [templates, setTemplates] = useState<SurveyTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('화장품')
  const [activeProductLine, setActiveProductLine] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newForm, setNewForm] = useState({ name: '', category: '화장품', product_line: '' })

  useEffect(() => { loadTemplates() }, [])

  async function loadTemplates() {
    const { data } = await supabase
      .from('survey_templates')
      .select('*')
      .order('created_at', { ascending: false })
    setTemplates(data || [])
    setLoading(false)
  }

  async function createTemplate() {
    if (!newForm.name) return
    const { data } = await supabase
      .from('survey_templates')
      .insert({
        name: newForm.name,
        description: '',
        category: newForm.category,
        product_line: newForm.product_line || null,
        questions: [],
      })
      .select()
      .single()

    if (data) {
      window.location.href = `/admin/templates/${data.id}`
    }
  }

  const filteredTemplates = templates.filter((t) => {
    if (t.category !== activeCategory) return false
    if (activeProductLine && t.product_line !== activeProductLine) return false
    return true
  })

  const productLines = PRODUCT_LINES[activeCategory] || []
  const isAvailable = AVAILABLE_CATEGORIES.includes(activeCategory)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text">설문 템플릿</h1>
        <Button onClick={() => setShowCreate(true)}>새 템플릿 만들기</Button>
      </div>

      {/* 카테고리 탭 */}
      <div className="flex gap-1 mb-4 bg-surface rounded-lg p-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => { setActiveCategory(cat); setActiveProductLine('') }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              activeCategory === cat
                ? 'bg-white text-navy shadow-sm'
                : 'text-text-muted hover:text-text'
            }`}
          >
            {cat}
            {!AVAILABLE_CATEGORIES.includes(cat) && (
              <span className="ml-1 text-xs text-text-muted/60">(준비중)</span>
            )}
          </button>
        ))}
      </div>

      {!isAvailable ? (
        /* 준비중 카테고리 */
        <Card className="text-center py-16">
          <div className="text-4xl mb-4">&#128679;</div>
          <p className="text-lg font-medium text-text mb-2">{activeCategory} 카테고리는 준비중입니다</p>
          <p className="text-sm text-text-muted">곧 서비스가 제공될 예정입니다.</p>
        </Card>
      ) : (
        <>
          {/* 제품군 서브탭 */}
          {productLines.length > 0 && (
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setActiveProductLine('')}
                className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                  !activeProductLine
                    ? 'bg-navy text-white'
                    : 'border border-border text-text-muted hover:border-navy/30'
                }`}
              >
                전체
              </button>
              {productLines.map((pl) => (
                <button
                  key={pl}
                  onClick={() => setActiveProductLine(pl)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                    activeProductLine === pl
                      ? 'bg-navy text-white'
                      : 'border border-border text-text-muted hover:border-navy/30'
                  }`}
                >
                  {pl}
                </button>
              ))}
            </div>
          )}

          {/* 템플릿 목록 */}
          {loading ? (
            <p className="text-text-muted">로딩중...</p>
          ) : filteredTemplates.length === 0 ? (
            <Card className="text-center py-12">
              <p className="text-text-muted mb-2">
                {activeProductLine
                  ? `${activeProductLine} 제품군에 등록된 템플릿이 없습니다.`
                  : '등록된 템플릿이 없습니다.'}
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className="text-navy text-sm font-medium hover:underline"
              >
                새 템플릿 만들기
              </button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((t) => (
                <Link key={t.id} href={`/admin/templates/${t.id}`}>
                  <Card className="hover:border-navy/30 transition-colors cursor-pointer h-full">
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle>{t.name}</CardTitle>
                      {t.is_default && <Badge variant="info">기본</Badge>}
                    </div>
                    <p className="text-sm text-text-muted mb-3">{t.description || '설명 없음'}</p>
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <span className="px-1.5 py-0.5 bg-surface rounded">{t.category}</span>
                      {t.product_line && (
                        <span className="px-1.5 py-0.5 bg-surface rounded">{t.product_line}</span>
                      )}
                      <span className="ml-auto">{t.questions?.length || 0}개 문항</span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {/* 새 템플릿 생성 모달 */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="새 템플릿 만들기">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">템플릿 이름</label>
            <input
              type="text"
              value={newForm.name}
              onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
              placeholder="예: 크림 기본 설문"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">카테고리</label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => {
                const available = AVAILABLE_CATEGORIES.includes(cat)
                return (
                  <button
                    key={cat}
                    type="button"
                    disabled={!available}
                    onClick={() => setNewForm({ ...newForm, category: cat, product_line: '' })}
                    className={`p-2.5 rounded-lg border text-sm text-center transition-all ${
                      newForm.category === cat
                        ? 'border-navy bg-navy/5 font-medium'
                        : available
                          ? 'border-border hover:border-navy/30'
                          : 'border-border text-text-muted/40 cursor-not-allowed bg-surface/50'
                    }`}
                  >
                    {cat}
                    {!available && <span className="block text-xs mt-0.5">준비중</span>}
                  </button>
                )
              })}
            </div>
          </div>
          {PRODUCT_LINES[newForm.category]?.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">제품군</label>
              <div className="flex flex-wrap gap-2">
                {PRODUCT_LINES[newForm.category].map((pl) => (
                  <button
                    key={pl}
                    type="button"
                    onClick={() => setNewForm({ ...newForm, product_line: pl })}
                    className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${
                      newForm.product_line === pl
                        ? 'border-navy bg-navy/5 font-medium'
                        : 'border-border hover:border-navy/30'
                    }`}
                  >
                    {pl}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>취소</Button>
            <Button onClick={createTemplate} disabled={!newForm.name}>생성</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
