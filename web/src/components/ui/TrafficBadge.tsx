import type { TrafficLevel } from '../../types/dashboard'

const styles: Record<TrafficLevel, string> = {
  good:
    'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/40 shadow-[0_0_20px_-4px_rgba(52,211,153,0.5)]',
  warn:
    'bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/40 shadow-[0_0_16px_-4px_rgba(251,191,36,0.35)]',
  bad: 'bg-rose-500/15 text-rose-200 ring-1 ring-rose-400/45 shadow-[0_0_18px_-4px_rgba(251,113,133,0.45)]',
}

const labels: Record<TrafficLevel, string> = {
  good: 'Bom',
  warn: 'Atenção',
  bad: 'Crítico',
}

export function TrafficBadge({ level, compact }: { level: TrafficLevel; compact?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider sm:text-xs ${styles[level]}`}
      title={labels[level]}
    >
      {!compact && <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current opacity-90" />}
      {labels[level]}
    </span>
  )
}

export function TrafficBar({ level }: { level: TrafficLevel }) {
  const pct = level === 'good' ? 100 : level === 'warn' ? 55 : 25
  const color =
    level === 'good' ? 'from-emerald-400 to-xpe-neon' : level === 'warn' ? 'from-amber-400 to-amber-500' : 'from-rose-500 to-rose-600'
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
      <div
        className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-500`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
