export function SegmentedStatusBar({
  segments,
}: {
  segments: { key: string; label: string; value: number; color: string }[]
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  const vis = segments.filter((s) => s.value > 0)
  return (
    <div className="w-full">
      <div className="flex h-4 overflow-hidden rounded-full border border-white/10 bg-zinc-900/80 shadow-inner">
        {vis.map((s) => (
          <div
            key={s.key}
            className="min-w-0 transition-all"
            style={{
              width: `${(s.value / total) * 100}%`,
              backgroundColor: s.color,
            }}
            title={`${s.label}: ${s.value}`}
          />
        ))}
      </div>
      <ul className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {segments.map((s) => (
          <li
            key={s.key}
            className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2 text-zinc-100">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="truncate">{s.label}</span>
            </span>
            <span className="shrink-0 font-mono text-xs text-zinc-300">
              <span className="font-semibold text-white">{s.value}</span>
              <span className="text-zinc-300"> · </span>
              <span className="text-xpe-neon">{((s.value / total) * 100).toFixed(1)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
