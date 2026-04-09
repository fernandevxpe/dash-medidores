export function SegmentedStatusBar({
  segments,
  fleetTotal,
}: {
  segments: { key: string; label: string; value: number; color: string }[]
  /** Denominador fixo (ex.: total da frota / catálogo) para exibir “valor / total (%)”. */
  fleetTotal?: number
}) {
  const sumSeg = segments.reduce((s, x) => s + x.value, 0) || 1
  const denom = fleetTotal && fleetTotal > 0 ? fleetTotal : sumSeg
  const vis = segments.filter((s) => s.value > 0)
  return (
    <div className="w-full">
      <div className="flex h-4 overflow-hidden rounded-full border border-white/10 bg-zinc-900/80 shadow-inner">
        {vis.map((s) => (
          <div
            key={s.key}
            className="min-w-0 transition-all"
            style={{
              width: `${(s.value / sumSeg) * 100}%`,
              backgroundColor: s.color,
            }}
            title={`${s.label}: ${s.value} / ${denom} (${denom > 0 ? ((s.value / denom) * 100).toFixed(1) : '0'}%)`}
          />
        ))}
      </div>
      <ul className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {segments.map((s) => (
          <li
            key={s.key}
            className="flex flex-col gap-1 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2 text-zinc-100">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="truncate font-medium">{s.label}</span>
            </span>
            <span className="pl-7 font-mono text-xs leading-relaxed text-zinc-300">
              <span className="font-semibold text-white">{s.value}</span>
              <span className="text-zinc-500"> / </span>
              <span className="text-zinc-400">{denom}</span>
              <span className="ml-1.5 rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[11px] text-xpe-neon">
                {denom > 0 ? ((s.value / denom) * 100).toFixed(1) : '0.0'}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
