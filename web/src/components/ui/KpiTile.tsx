import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import type { TrafficLevel } from '../../types/dashboard'
import { TrafficBadge, TrafficBar } from './TrafficBadge'

export function KpiTile({
  icon: Icon,
  label,
  value,
  hint,
  traffic,
  foot,
}: {
  icon?: LucideIcon
  label: string
  value: ReactNode
  hint?: string
  traffic?: TrafficLevel
  foot?: ReactNode
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-xpe-border bg-gradient-to-br from-xpe-surface2/90 to-xpe-surface/90 p-4 sm:p-5">
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-xpe-purple/20 blur-2xl transition-opacity group-hover:opacity-100" />
      <div className="pointer-events-none absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-xpe-neon/10 blur-2xl" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {Icon ? (
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-xpe-neon/90 shadow-sm"
              aria-hidden
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.65} />
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-xpe-muted sm:text-xs">{label}</p>
            <p className="relative mt-2 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">{value}</p>
            {hint ? <p className="relative mt-1 text-xs text-zinc-400">{hint}</p> : null}
          </div>
        </div>
        {traffic ? <TrafficBadge level={traffic} compact /> : null}
      </div>
      {traffic && (
        <div className="relative mt-3">
          <TrafficBar level={traffic} />
        </div>
      )}
      {foot && <div className="relative mt-3 text-[11px] text-zinc-500">{foot}</div>}
    </div>
  )
}
