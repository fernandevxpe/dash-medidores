import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  chartLegendWrapperStyle,
  chartTooltipContentStyle,
  chartTooltipItemStyle,
  chartTooltipLabelStyle,
} from './chartTheme'

/** Ciclos concluídos por mês da desinstalação: dentro vs fora do prazo (N dias). */
export function BarPrazoCiclos({
  data,
  diasPrazo,
}: {
  data: { mes: string; dentro: number; fora: number }[]
  diasPrazo: number
}) {
  const chartData = data.map((d) => ({
    ...d,
    label: d.mes,
  }))
  return (
    <div className="h-[260px] w-full sm:h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 6" stroke="rgba(168,85,247,0.12)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#a1a1aa', fontSize: 10 }}
            axisLine={{ stroke: 'rgba(168,85,247,0.2)' }}
            tickLine={false}
          />
          <YAxis tick={{ fill: '#a1a1aa', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: 'rgba(168,85,247,0.08)' }}
            contentStyle={chartTooltipContentStyle}
            itemStyle={chartTooltipItemStyle}
            labelStyle={chartTooltipLabelStyle}
          />
          <Legend
            wrapperStyle={{ ...chartLegendWrapperStyle, fontSize: 12 }}
            formatter={(value) => <span className="text-zinc-300">{value}</span>}
          />
          <Bar
            dataKey="dentro"
            name={`≤ ${diasPrazo} dias`}
            fill="#39ff9c"
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
          />
          <Bar dataKey="fora" name="Fora do prazo" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
