import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

const COLORS_M = ['#39ff9c', '#a855f7', '#fbbf24', '#fb7185', '#38bdf8']

export function StatusDonut({
  data,
  inner = 58,
}: {
  data: { name: string; value: number }[]
  inner?: number
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  return (
    <div className="h-[220px] w-full min-h-[200px] sm:h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={`${inner}%`}
            outerRadius="88%"
            paddingAngle={2}
            stroke="none"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS_M[i % COLORS_M.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: '#120b1f',
              border: '1px solid rgba(168,85,247,0.35)',
              borderRadius: 12,
              color: '#f4f4f5',
            }}
            formatter={(v, _n, p) => {
              const n = typeof v === 'number' ? v : Number(v)
              const name = (p?.payload as { name?: string } | undefined)?.name ?? ''
              return [`${n} (${((n / total) * 100).toFixed(1)}%)`, name]
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
