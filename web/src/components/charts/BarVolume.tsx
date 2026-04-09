import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { chartTooltipContentStyle, chartTooltipItemStyle, chartTooltipLabelStyle } from './chartTheme'

export function BarVolume({
  data,
  dataKey,
  xKey,
  color = '#39ff9c',
  /** Se definido, usa o campo `fill` (ou este nome) em cada item como cor da barra. */
  colorField = 'fill',
}: {
  data: Record<string, string | number>[]
  dataKey: string
  xKey: string
  color?: string
  colorField?: string
}) {
  const useCells = data.some((d) => typeof d[colorField] === 'string')
  return (
    <div className="h-[240px] w-full sm:h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 6" stroke="rgba(168,85,247,0.12)" vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={{ fill: '#a1a1aa', fontSize: 10 }}
            axisLine={{ stroke: 'rgba(168,85,247,0.2)' }}
            tickLine={false}
          />
          <YAxis tick={{ fill: '#a1a1aa', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: 'rgba(168,85,247,0.08)' }}
            contentStyle={chartTooltipContentStyle}
            itemStyle={chartTooltipItemStyle}
            labelStyle={chartTooltipLabelStyle}
          />
          <Bar dataKey={dataKey} fill={color} radius={[6, 6, 0, 0]} maxBarSize={36}>
            {useCells
              ? data.map((entry, i) => (
                  <Cell key={i} fill={String(entry[colorField] ?? color)} />
                ))
              : null}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
