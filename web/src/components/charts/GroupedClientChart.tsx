import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const MED_ATIVO = '#22c55e'
const MED_PASSADO = '#a855f7'
const ANAL_ATIVO = '#4ade80'
const ANAL_PASSADO = '#c084fc'

export type ClienteEquipBarRow = {
  cliente: string
  medidores: number
  analisadores: number
  /** Cliente com ao menos um slot em campo hoje (histórico completo). */
  situacao?: 'ativo' | 'passado'
}

export function GroupedClientChart({ data }: { data: ClienteEquipBarRow[] }) {
  const short = data.slice(0, 12).map((d) => ({
    ...d,
    label: d.cliente.length > 14 ? d.cliente.slice(0, 12) + '…' : d.cliente,
    situacao: d.situacao ?? 'passado',
  }))
  return (
    <div className="h-[300px] w-full sm:h-[340px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={short} margin={{ top: 8, right: 8, left: -12, bottom: 48 }}>
          <CartesianGrid strokeDasharray="3 6" stroke="rgba(168,85,247,0.12)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#a1a1aa', fontSize: 9 }}
            axisLine={{ stroke: 'rgba(168,85,247,0.2)' }}
            tickLine={false}
            interval={0}
            angle={-28}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fill: '#a1a1aa', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              background: '#120b1f',
              border: '1px solid rgba(168,85,247,0.35)',
              borderRadius: 12,
              color: '#f4f4f5',
            }}
            labelFormatter={(_, payload) => (payload[0]?.payload as { cliente: string }).cliente}
            formatter={(value, name) => [`${value}`, String(name)]}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="medidores" name="Medidores (únicos)" radius={[4, 4, 0, 0]} maxBarSize={16}>
            {short.map((entry, i) => (
              <Cell key={`m-${i}`} fill={entry.situacao === 'ativo' ? MED_ATIVO : MED_PASSADO} />
            ))}
          </Bar>
          <Bar dataKey="analisadores" name="Analisadores (IDs)" radius={[4, 4, 0, 0]} maxBarSize={16}>
            {short.map((entry, i) => (
              <Cell key={`a-${i}`} fill={entry.situacao === 'ativo' ? ANAL_ATIVO : ANAL_PASSADO} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap justify-center gap-4 text-[10px] text-zinc-500">
        <span>
          <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: MED_ATIVO }} />
          Cliente ativo (instalação em campo)
        </span>
        <span>
          <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: MED_PASSADO }} />
          Somente histórico (sem slot ativo hoje)
        </span>
      </div>
    </div>
  )
}
