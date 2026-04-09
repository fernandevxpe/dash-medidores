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

export function BarVolumeDual({
  data,
  xKey,
  keyInst,
  keyDes,
  nameInst = 'Instalações',
  nameDes = 'Desinstalações',
  colorInst = '#39ff9c',
  colorDes = '#fb7185',
}: {
  data: Record<string, string | number>[]
  xKey: string
  keyInst: string
  keyDes: string
  nameInst?: string
  nameDes?: string
  colorInst?: string
  colorDes?: string
}) {
  return (
    <div className="h-[260px] w-full sm:h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 6" stroke="rgba(168,85,247,0.12)" vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={{ fill: '#f4f4f5', fontSize: 10 }}
            axisLine={{ stroke: 'rgba(168,85,247,0.2)' }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fill: '#f4f4f5', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
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
          <Bar dataKey={keyInst} name={nameInst} fill={colorInst} radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey={keyDes} name={nameDes} fill={colorDes} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
