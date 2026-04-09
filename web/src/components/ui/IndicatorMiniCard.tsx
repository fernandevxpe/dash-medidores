import type { LucideIcon } from 'lucide-react'

export type IndicatorAccent = 'neon' | 'violet' | 'amber' | 'sky' | 'neutral'

const accentWrap: Record<IndicatorAccent, string> = {
  neon: 'border-emerald-500/20 bg-emerald-500/[0.06] text-xpe-neon',
  violet: 'border-violet-500/25 bg-violet-500/[0.08] text-violet-200',
  amber: 'border-amber-500/25 bg-amber-500/[0.07] text-amber-200',
  sky: 'border-sky-500/25 bg-sky-500/[0.07] text-sky-200',
  neutral: 'border-white/10 bg-white/[0.04] text-zinc-300',
}

/**
 * KPI compacto com ícone — uso em Equipamentos e Indicadores.
 */
export function IndicatorMiniCard({
  icon: Icon,
  label,
  value,
  foot,
  accent = 'neutral',
}: {
  icon: LucideIcon
  label: string
  value: string
  foot?: string
  accent?: IndicatorAccent
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 transition-colors hover:border-white/[0.14] hover:bg-white/[0.045]">
      <div className="flex gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${accentWrap[accent]}`}
          aria-hidden
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.65} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight text-white">{value}</p>
          {foot ? <p className="mt-1 text-[11px] leading-snug text-zinc-500">{foot}</p> : null}
        </div>
      </div>
    </div>
  )
}
