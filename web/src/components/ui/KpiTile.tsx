import type { ReactNode } from 'react'
import type { TrafficLevel } from '../../types/dashboard'
import { TrafficBadge, TrafficBar } from './TrafficBadge'

export function KpiTile({
  label,
  value,
  hint,
  traffic,
  foot,
}: {
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
      <div className="relative flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-xpe-muted sm:text-xs">{label}</p>
        {traffic && <TrafficBadge level={traffic} compact />}
      </div>
      <p className="relative mt-2 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">{value}</p>
      {hint && <p className="relative mt-1 text-xs text-zinc-400">{hint}</p>}
      {traffic && (
        <div className="relative mt-3">
          <TrafficBar level={traffic} />
        </div>
      )}
      {foot && <div className="relative mt-3 text-[11px] text-zinc-500">{foot}</div>}
    </div>
  )
}
