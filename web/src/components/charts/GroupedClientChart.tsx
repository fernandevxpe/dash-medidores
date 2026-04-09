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

const MED_ATIVO = '#22c55e'
const MED_PASSADO = '#a855f7'
const ANAL_ATIVO = '#4ade80'
const ANAL_PASSADO = '#c084fc'

/** Legenda própria: evita ícones pretos do Recharts quando a cor vem só de Cells (sem fill na série). */
function LegendaClientesEquipamentos() {
  return (
    <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 px-2 pb-1 text-[11px] leading-snug text-zinc-300">
      <li className="flex max-w-[min(100%,280px)] items-start gap-2">
        <span className="mt-0.5 flex shrink-0 gap-0.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: MED_ATIVO }} />
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: MED_PASSADO }} />
        </span>
        <span>
          <span className="font-medium text-zinc-200">Medidores</span> — verde: cliente ativo · roxo: só histórico
        </span>
      </li>
      <li className="flex max-w-[min(100%,280px)] items-start gap-2">
        <span className="mt-0.5 flex shrink-0 gap-0.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: ANAL_ATIVO }} />
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: ANAL_PASSADO }} />
        </span>
        <span>
          <span className="font-medium text-zinc-200">Analisadores</span> — mesma regra de ativo / histórico
        </span>
      </li>
    </ul>
  )
}

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
    <div className="flex w-full flex-col gap-2">
      <div className="h-[240px] w-full min-h-0 shrink-0 sm:h-[270px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={short} margin={{ top: 8, right: 8, left: -12, bottom: 28 }}>
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
              contentStyle={chartTooltipContentStyle}
              itemStyle={chartTooltipItemStyle}
              labelStyle={chartTooltipLabelStyle}
              labelFormatter={(_, payload) => (payload[0]?.payload as { cliente: string }).cliente}
              formatter={(value, name) => [`${value}`, String(name)]}
            />
            <Bar
              dataKey="medidores"
              name="Medidores (únicos)"
              fill={MED_ATIVO}
              radius={[4, 4, 0, 0]}
              maxBarSize={16}
            >
              {short.map((entry, i) => (
                <Cell key={`m-${i}`} fill={entry.situacao === 'ativo' ? MED_ATIVO : MED_PASSADO} />
              ))}
            </Bar>
            <Bar
              dataKey="analisadores"
              name="Analisadores (IDs)"
              fill={ANAL_ATIVO}
              radius={[4, 4, 0, 0]}
              maxBarSize={16}
            >
              {short.map((entry, i) => (
                <Cell key={`a-${i}`} fill={entry.situacao === 'ativo' ? ANAL_ATIVO : ANAL_PASSADO} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <LegendaClientesEquipamentos />
      <div className="flex flex-wrap justify-center gap-4 text-[10px] text-zinc-500">
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
