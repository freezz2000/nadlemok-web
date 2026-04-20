'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Card, { CardTitle } from '@/components/ui/Card'

interface ClientPanel {
  id: string
  panel_id: string
  phone: string | null
  added_at: string
  profile: { name: string }[] | null
}

export default function ClientPanelsPage() {
  const supabase = createClient()
  const [panels, setPanels] = useState<ClientPanel[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('client_panels')
        .select(`
          id, panel_id, phone, added_at,
          profile:profiles!panel_id(name)
        `)
        .order('added_at', { ascending: false })

      setPanels((data as ClientPanel[]) || [])
      setLoading(false)
    }
    load()
  }, [supabase])

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">내 패널 목록</h1>
        <p className="text-sm text-text-muted mt-1">
          초대 링크를 통해 가입한 패널입니다. 새 프로젝트 진행 시 이 목록에서 선택해 초대할 수 있습니다.
        </p>
      </div>

      <Card>
        <CardTitle>전체 패널 ({panels.length}명)</CardTitle>

        {loading ? (
          <div className="py-8 text-center">
            <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : panels.length === 0 ? (
          <div className="py-8 text-center text-text-muted text-sm">
            아직 초대를 수락한 패널이 없습니다.<br />
            프로젝트에서 카카오 알림톡을 발송해보세요.
          </div>
        ) : (
          <div className="mt-4 divide-y divide-gray-50">
            {panels.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-text">
                    {p.profile?.[0]?.name || '이름 미등록'}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {p.phone || '번호 미등록'}
                  </p>
                </div>
                <p className="text-xs text-text-muted flex-shrink-0 ml-4">
                  {new Date(p.added_at).toLocaleDateString('ko-KR')} 가입
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
