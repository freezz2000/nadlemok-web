import type { Verdict, ProjectStatus, PanelMatchStatus } from '@/lib/types'

type BadgeVariant = 'go' | 'cgo' | 'nogo' | 'info' | 'default' | 'warning'

const variantStyles: Record<BadgeVariant, string> = {
  go: 'bg-go-bg text-go border-go/20',
  cgo: 'bg-cgo-bg text-cgo border-cgo/20',
  nogo: 'bg-nogo-bg text-nogo border-nogo/20',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  default: 'bg-surface text-text-muted border-border',
}

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

export default function Badge({ variant = 'default', className = '', children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  )
}

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const config: Record<Verdict, { variant: BadgeVariant; label: string }> = {
    'GO': { variant: 'go', label: 'Go - 출시 적합' },
    'CONDITIONAL GO': { variant: 'cgo', label: 'Conditional Go - 조건부' },
    'NO-GO': { variant: 'nogo', label: 'No-Go - 출시 보류' },
  }
  const { variant, label } = config[verdict]
  return <Badge variant={variant}>{label}</Badge>
}

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const config: Record<ProjectStatus, { variant: BadgeVariant; label: string }> = {
    pending: { variant: 'warning', label: '승인 대기' },
    draft: { variant: 'default', label: '설문 설정중' },
    confirmed: { variant: 'info', label: '관리자 확정' },
    approved: { variant: 'go', label: '고객 승인완료' },
    recruiting: { variant: 'info', label: '패널 모집중' },
    matching: { variant: 'warning', label: '패널 매칭중' },
    testing: { variant: 'warning', label: '테스트 진행중' },
    analyzing: { variant: 'info', label: '분석중' },
    completed: { variant: 'go', label: '완료' },
    rejected: { variant: 'nogo', label: '반려' },
  }
  const { variant, label } = config[status]
  return <Badge variant={variant}>{label}</Badge>
}

export function MatchStatusBadge({ status }: { status: PanelMatchStatus }) {
  const config: Record<PanelMatchStatus, { variant: BadgeVariant; label: string }> = {
    matched: { variant: 'info', label: '매칭됨' },
    accepted: { variant: 'warning', label: '수락' },
    completed: { variant: 'go', label: '완료' },
    dropped: { variant: 'nogo', label: '이탈' },
  }
  const { variant, label } = config[status]
  return <Badge variant={variant}>{label}</Badge>
}
