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
            contentStyle={{
              background: '#120b1f',
              border: '1px solid rgba(168,85,247,0.35)',
              borderRadius: 12,
              color: '#f4f4f5',
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: '#f4f4f5' }} />
          <Bar dataKey={keyInst} name={nameInst} fill={colorInst} radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey={keyDes} name={nameDes} fill={colorDes} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
