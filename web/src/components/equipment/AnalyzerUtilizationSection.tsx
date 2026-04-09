import { useCallback, useMemo, useState } from 'react'
import { format } from 'date-fns'
import {
  Activity,
  BarChart3,
  Boxes,
  Calendar,
  CircleDashed,
  Gauge,
  Hourglass,
  Layers,
  LineChart as LineChartIcon,
  Percent,
  Timer,
  Wrench,
} from 'lucide-react'
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DashboardBundle } from '../../types/dashboard'
import type { IndicadoresTemporaisGlobais } from '../../analytics/metrics'
import {
  analisadoresSinteticos,
  colunaSerieAnalisador,
  metricasDetalhadasPorAnalisador,
  serieDiariaAnalisadoresUtilizacao,
  totaisAgregadosMetricasAnalisadores,
} from '../../analytics/metrics'
import {
  chartTooltipContentStyle,
  chartTooltipItemStyle,
  chartTooltipLabelStyle,
} from '../charts/chartTheme'
import { Card } from '../ui/Card'
import { IndicatorMiniCard } from '../ui/IndicatorMiniCard'

const STICKY_TH = 'sticky z-20 border-b border-white/10 bg-[#120b1f] px-2 py-2'
const STICKY_TD = 'sticky z-10 border-b border-white/5 bg-[#120b1f] px-2 py-1.5'

function defaultSelecaoAnalisadores(chaves: string[]) {
  const s = new Set<string>()
  for (let i = 0; i < Math.min(8, chaves.length); i++) s.add(chaves[i]!)
  return s
}

const CORES_ANALISADOR = [
  '#a855f7',
  '#39ff9c',
  '#fbbf24',
  '#38bdf8',
  '#f472b6',
  '#94a3b8',
  '#fb923c',
  '#4ade80',
  '#c084fc',
  '#2dd4bf',
  '#f87171',
  '#818cf8',
]

const CAP_SERIES = [
  { key: 'emCampoFrota', label: 'Em campo', color: '#a855f7' },
  { key: 'totalCatalogo', label: 'Catálogo (ref.)', color: '#64748b' },
  { key: 'pctEmCampoFrota', label: '% em campo', color: '#39ff9c' },
] as const

type Props = {
  bundle: DashboardBundle
  globaisAnalisadores: IndicadoresTemporaisGlobais
  cap: {
    totalAnalisadoresCatalogo: number
    analisadoresInstalados: number
    analisadoresManutencao: number
    analisadoresLivres: number
  }
}

function fmtDia(iso: string | null) {
  if (!iso) return '—'
  try {
    return format(new Date(iso), 'dd/MM/yyyy HH:mm')
  } catch {
    return iso.slice(0, 16)
  }
}

function EstadoAnalisadorBadge({ status }: { status: string }) {
  const cls =
    status === 'instalado'
      ? 'border-emerald-500/45 bg-emerald-500/15 text-emerald-300'
      : status === 'manutencao'
        ? 'border-amber-500/45 bg-amber-500/15 text-amber-200'
        : 'border-violet-500/45 bg-violet-500/15 text-violet-200'
  const label = status === 'instalado' ? 'Em uso' : status === 'manutencao' ? 'Manutenção' : 'Disponível'
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${cls}`}
    >
      {label}
    </span>
  )
}

function LegendToggleRow({
  entries,
  hidden,
  onToggle,
  hint,
}: {
  entries: readonly { key: string; label: string; color: string }[]
  hidden: Set<string>
  onToggle: (key: string) => void
  hint?: string
}) {
  return (
    <div className="mt-2 space-y-1">
      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-[11px]">
        {entries.map((e) => {
          const off = hidden.has(e.key)
          return (
            <li key={e.key}>
              <button
                type="button"
                onClick={() => onToggle(e.key)}
                className={`flex items-center gap-1.5 rounded-md px-1 py-0.5 transition-opacity hover:bg-white/5 ${
                  off ? 'opacity-40 line-through' : 'text-zinc-200'
                }`}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: e.color }} />
                {e.label}
              </button>
            </li>
          )
        })}
      </ul>
      {hint ? <p className="text-center text-[10px] text-zinc-500">{hint}</p> : null}
    </div>
  )
}

export function AnalyzerUtilizationSection({ bundle, globaisAnalisadores, cap }: Props) {
  const [asOfMs] = useState(() => Date.now())
  const { chavesAnalisador, rows } = useMemo(
    () => serieDiariaAnalisadoresUtilizacao(bundle, asOfMs),
    [bundle, asOfMs],
  )
  const metricas = useMemo(() => metricasDetalhadasPorAnalisador(bundle, asOfMs), [bundle, asOfMs])
  const totais = useMemo(() => totaisAgregadosMetricasAnalisadores(metricas), [metricas])
  const estadoPorId = useMemo(() => {
    const m = new Map<string, string>()
    for (const a of analisadoresSinteticos(bundle)) {
      m.set(a.id, a.status)
    }
    return m
  }, [bundle])

  const [hiddenCap, setHiddenCap] = useState<Set<string>>(() => new Set())
  const toggleCap = useCallback((key: string) => {
    setHiddenCap((prev) => {
      const n = new Set(prev)
      if (n.has(key)) n.delete(key)
      else n.add(key)
      return n
    })
  }, [])

  type ModoLinhas = 'auto' | Set<string>
  const [modoLinhas, setModoLinhas] = useState<ModoLinhas>('auto')
  const [hiddenLines, setHiddenLines] = useState<Set<string>>(() => new Set())

  const selecionadosParaLinhas = useMemo(() => {
    if (modoLinhas === 'auto') return defaultSelecaoAnalisadores(chavesAnalisador)
    const n = new Set<string>()
    for (const id of modoLinhas) {
      if (chavesAnalisador.includes(id)) n.add(id)
    }
    return n
  }, [modoLinhas, chavesAnalisador])

  const lineLegendEntries = useMemo(
    () =>
      [...selecionadosParaLinhas].map((id, i) => ({
        key: colunaSerieAnalisador(id),
        label: `#${id}`,
        color: CORES_ANALISADOR[i % CORES_ANALISADOR.length]!,
      })),
    [selecionadosParaLinhas],
  )

  const validLineKeys = useMemo(() => new Set(lineLegendEntries.map((e) => e.key)), [lineLegendEntries])
  const hiddenLinesActive = useMemo(() => {
    const n = new Set<string>()
    for (const k of hiddenLines) {
      if (validLineKeys.has(k)) n.add(k)
    }
    return n
  }, [hiddenLines, validLineKeys])

  const toggleLine = useCallback((key: string) => {
    setHiddenLines((prev) => {
      const n = new Set(prev)
      if (n.has(key)) n.delete(key)
      else n.add(key)
      return n
    })
  }, [])

  function alternarAnalisadorLinha(id: string) {
    setModoLinhas((prev) => {
      const base = prev === 'auto' ? defaultSelecaoAnalisadores(chavesAnalisador) : new Set(prev)
      if (base.has(id)) base.delete(id)
      else base.add(id)
      return base
    })
  }

  if (chavesAnalisador.length === 0) {
    return (
      <Card
        title="Análise detalhada · Analisadores"
        subtitle="Capacidade, séries diárias e métricas por equipamento"
      >
        <p className="text-sm text-zinc-500">Sem analisadores no catálogo da frota.</p>
      </Card>
    )
  }

  return (
    <Card
      title="Análise detalhada · Utilização dos analisadores"
      subtitle="Capacidade operacional ao longo do tempo, estado diário por equipamento e tabela de métricas (ciclos vs. calendário)"
    >
      <p className="mb-3 text-xs text-zinc-500">
        Catálogo: {cap.totalAnalisadoresCatalogo} unidades · Hoje: {cap.analisadoresInstalados} em uso,{' '}
        {cap.analisadoresManutencao} manutenção, {cap.analisadoresLivres} disponíveis (painel principal).
      </p>

      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Indicadores globais</p>
      <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <IndicatorMiniCard
          icon={Boxes}
          accent="violet"
          label="Quantidade"
          value={String(globaisAnalisadores.quantidadeEquipamentos)}
        />
        <IndicatorMiniCard
          icon={Activity}
          accent="violet"
          label="Em uso"
          value={String(globaisAnalisadores.emUso)}
        />
        <IndicatorMiniCard
          icon={CircleDashed}
          accent="neutral"
          label="Disponíveis"
          value={String(globaisAnalisadores.disponiveis)}
        />
        <IndicatorMiniCard
          icon={Wrench}
          accent="amber"
          label="Manutenção"
          value={String(globaisAnalisadores.manutencao)}
        />
        <IndicatorMiniCard
          icon={Timer}
          accent="sky"
          label="Média medição"
          value={`${globaisAnalisadores.mediaMedicaoDias.toFixed(1)} d`}
          foot="instalação até manutenção ou desinstalação"
        />
        <IndicatorMiniCard
          icon={Hourglass}
          accent="violet"
          label="Média ociosidade"
          value={`${globaisAnalisadores.mediaOciosidadeDias.toFixed(1)} d`}
          foot="só após 1.ª desinst.; desde 1.ª instalação; manutenção excluída"
        />
        <IndicatorMiniCard
          icon={Wrench}
          accent="amber"
          label="Média manutenção"
          value={`${globaisAnalisadores.mediaManutencaoDias.toFixed(1)} d`}
          foot="fora de medição e ociosidade"
        />
        <IndicatorMiniCard
          icon={Gauge}
          accent="violet"
          label="Taxa de uso"
          value={`${(globaisAnalisadores.taxaUso * 100).toFixed(1)}%`}
          foot="medição / (medição + ociosidade)"
        />
      </div>

      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Indicadores da análise (somas e série diária)
      </p>
      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <IndicatorMiniCard
          icon={Layers}
          accent="violet"
          label="Taxa uso (ciclos) · ponderada"
          value={`${(totais.taxaUsoCiclosPonderada * 100).toFixed(1)}%`}
          foot="Σ dias medição / (Σ medição + Σ ociosidade)"
        />
        <IndicatorMiniCard
          icon={Percent}
          accent="violet"
          label="Média taxa uso (ciclos) / eq."
          value={`${(totais.mediaTaxaUsoCiclosPorEquipamento * 100).toFixed(1)}%`}
          foot="média simples entre analisadores"
        />
        <IndicatorMiniCard
          icon={Calendar}
          accent="sky"
          label="Média % tempo em campo"
          value={`${totais.mediaPctTempoEmCampoCalendario.toFixed(1)}%`}
          foot="média dos % dias 1 ao fim do dia"
        />
        <IndicatorMiniCard
          icon={Timer}
          accent="neutral"
          label="Σ dias medição (ciclos)"
          value={`${totais.somaDiasMedicaoCiclos.toFixed(0)} d`}
        />
        <IndicatorMiniCard
          icon={Activity}
          accent="amber"
          label="Σ dias ociosidade (ciclos)"
          value={`${totais.somaDiasOciosidadeCiclos.toFixed(0)} d`}
        />
        <IndicatorMiniCard
          icon={Wrench}
          accent="amber"
          label="Σ dias manutenção (ciclos)"
          value={`${totais.somaDiasManutencaoCiclos.toFixed(0)} d`}
          foot="fora de medição e ociosidade"
        />
        <IndicatorMiniCard
          icon={BarChart3}
          accent="neon"
          label="Eventos (planilha)"
          value={String(totais.totalEventos)}
        />
        <IndicatorMiniCard
          icon={Calendar}
          accent="sky"
          label="Série · dias cobertos"
          value={String(rows.length)}
        />
      </div>

      <div className="space-y-6 pt-2">
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            <LineChartIcon className="h-4 w-4 text-violet-400" />
            Capacidade operacional · frota de analisadores ao longo do tempo
          </p>
          <div className="h-[280px] w-full rounded-xl border border-white/10 bg-white/[0.02] p-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 6" stroke="rgba(168,85,247,0.12)" />
                <XAxis dataKey="dia" tick={{ fill: '#a1a1aa', fontSize: 10 }} minTickGap={28} />
                <YAxis
                  yAxisId="n"
                  tick={{ fill: '#a1a1aa', fontSize: 10 }}
                  allowDecimals={false}
                  label={{ value: 'Unidades', angle: -90, position: 'insideLeft', fill: '#71717a', fontSize: 10 }}
                />
                <YAxis
                  yAxisId="pct"
                  orientation="right"
                  tick={{ fill: '#a1a1aa', fontSize: 10 }}
                  domain={[0, 100]}
                  label={{ value: '% catálogo', angle: 90, position: 'insideRight', fill: '#71717a', fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={chartTooltipContentStyle}
                  itemStyle={chartTooltipItemStyle}
                  labelStyle={chartTooltipLabelStyle}
                  formatter={(v, name) => {
                    if (name === 'pctEmCampoFrota' && v != null) return [`${Number(v).toFixed(1)}%`, '% em campo']
                    return [v as string | number, String(name)]
                  }}
                  labelFormatter={(l) => `Dia ${l}`}
                />
                {!hiddenCap.has('emCampoFrota') && (
                  <Area
                    yAxisId="n"
                    type="monotone"
                    dataKey="emCampoFrota"
                    name="Em campo"
                    fill="rgba(168,85,247,0.25)"
                    stroke="#a855f7"
                    strokeWidth={1.5}
                  />
                )}
                {!hiddenCap.has('totalCatalogo') && (
                  <Line
                    yAxisId="n"
                    type="monotone"
                    dataKey="totalCatalogo"
                    name="Catálogo (ref.)"
                    stroke="#64748b"
                    strokeDasharray="4 4"
                    dot={false}
                    strokeWidth={1}
                  />
                )}
                {!hiddenCap.has('pctEmCampoFrota') && (
                  <Line
                    yAxisId="pct"
                    type="monotone"
                    dataKey="pctEmCampoFrota"
                    name="% em campo"
                    stroke="#39ff9c"
                    dot={false}
                    strokeWidth={1.2}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <LegendToggleRow
            entries={CAP_SERIES}
            hidden={hiddenCap}
            onToggle={toggleCap}
            hint="Clique na legenda para ocultar ou voltar a mostrar cada série."
          />
          <p className="mt-1 text-[11px] text-zinc-500">
            Área: unidades em campo. Linha tracejada: catálogo nominal. Verde: % em campo sobre analisadores já
            instalados até aquele dia.
          </p>
        </div>

        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            <LineChartIcon className="h-4 w-4 text-xpe-neon-dim" />
            Estado diário por analisador (0 = disponível, 1 = em campo; sem dados antes da 1.ª instalação)
          </p>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {chavesAnalisador.map((id) => {
              const on = selecionadosParaLinhas.has(id)
              return (
                <label
                  key={id}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] ${
                    on ? 'border-violet-500/50 bg-violet-500/10 text-violet-200' : 'border-white/10 text-zinc-500'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="accent-violet-500"
                    checked={on}
                    onChange={() => alternarAnalisadorLinha(id)}
                  />
                  #{id}
                </label>
              )
            })}
            <button
              type="button"
              className="rounded-lg border border-white/15 px-2 py-1 text-[11px] text-zinc-400 hover:border-violet-500/40 hover:text-zinc-200"
              onClick={() => setModoLinhas('auto')}
            >
              Sugestão (8 primeiros)
            </button>
          </div>
          <div className="h-[320px] w-full rounded-xl border border-white/10 bg-white/[0.02] p-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 6" stroke="rgba(168,85,247,0.12)" />
                <XAxis dataKey="dia" tick={{ fill: '#a1a1aa', fontSize: 10 }} minTickGap={28} />
                <YAxis
                  domain={[-0.05, 1.05]}
                  tick={{ fill: '#a1a1aa', fontSize: 10 }}
                  ticks={[0, 1]}
                  tickFormatter={(v) => (v === 1 ? 'Campo' : 'Livre')}
                />
                <Tooltip
                  contentStyle={chartTooltipContentStyle}
                  itemStyle={chartTooltipItemStyle}
                  labelStyle={chartTooltipLabelStyle}
                />
                {[...selecionadosParaLinhas].map((id, i) => {
                  const dk = colunaSerieAnalisador(id)
                  if (hiddenLinesActive.has(dk)) return null
                  return (
                    <Line
                      key={id}
                      type="stepAfter"
                      dataKey={dk}
                      name={`#${id}`}
                      stroke={CORES_ANALISADOR[i % CORES_ANALISADOR.length]}
                      dot={false}
                      strokeWidth={1.8}
                      connectNulls={false}
                      isAnimationActive={rows.length < 400}
                    />
                  )
                })}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <LegendToggleRow
            entries={lineLegendEntries}
            hidden={hiddenLinesActive}
            onToggle={toggleLine}
            hint="Clique na legenda para ocultar ou mostrar a linha do analisador."
          />
          {selecionadosParaLinhas.size === 0 && (
            <p className="mt-1 text-xs text-amber-200/90">Selecione pelo menos um analisador para ver as linhas.</p>
          )}
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Tabela · indicadores operacionais e registos
          </p>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[1180px] text-left text-[11px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-zinc-500">
                  <th className={`${STICKY_TH} left-0 min-w-[6.5rem] shadow-[4px_0_12px_-4px_rgba(0,0,0,0.65)]`}>
                    ID
                  </th>
                  <th
                    className={`${STICKY_TH} left-[6.5rem] min-w-[5.75rem] shadow-[4px_0_12px_-4px_rgba(0,0,0,0.65)]`}
                  >
                    Estado hoje
                  </th>
                  <th className="border-b border-white/10 bg-white/[0.03] px-2 py-2">Ciclos medição</th>
                  <th className="border-b border-white/10 bg-white/[0.03] px-2 py-2">Ciclos ocios.</th>
                  <th className="border-b border-white/10 bg-white/[0.03] px-2 py-2">Méd. d. ocioso</th>
                  <th className="border-b border-white/10 bg-white/[0.03] px-2 py-2">Taxa uso</th>
                  <th className="border-b border-white/10 bg-white/[0.03] px-2 py-2">Dias manut. (Σ)</th>
                  <th className="border-b border-white/10 bg-white/[0.03] px-2 py-2">Dias campo (cal.)</th>
                  <th className="border-b border-white/10 bg-white/[0.03] px-2 py-2">Dias livre (cal.)</th>
                  <th className="border-b border-white/10 bg-white/[0.03] px-2 py-2">% tempo campo</th>
                  <th className="border-b border-white/10 bg-white/[0.03] px-2 py-2"># eventos</th>
                  <th className="border-b border-white/10 bg-white/[0.03] px-2 py-2">1.ª instalação</th>
                  <th className="border-b border-white/10 bg-white/[0.03] px-2 py-2">Último evento</th>
                </tr>
              </thead>
              <tbody>
                {metricas.map((r) => {
                  const st = estadoPorId.get(r.idDisplay) ?? 'disponivel'
                  const cMed = r.ciclosMedicaoFechados + r.ciclosMedicaoAbertos
                  const cOcio = r.ciclosOciosidadeFechados + r.ciclosOciosidadeAbertos
                  return (
                    <tr key={r.idCanon} className="hover:bg-white/[0.02]">
                      <td
                        className={`${STICKY_TD} left-0 min-w-[6.5rem] font-mono text-violet-300 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.65)]`}
                      >
                        {r.idDisplay}
                      </td>
                      <td
                        className={`${STICKY_TD} left-[6.5rem] min-w-[5.75rem] shadow-[4px_0_12px_-4px_rgba(0,0,0,0.65)]`}
                      >
                        <EstadoAnalisadorBadge status={st} />
                      </td>
                      <td className="border-b border-white/5 tabular-nums text-zinc-200">{cMed}</td>
                      <td className="border-b border-white/5 tabular-nums text-zinc-200">{cOcio}</td>
                      <td className="border-b border-white/5 tabular-nums text-zinc-300">
                        {r.mediaOciosidadeDias.toFixed(1)} d
                      </td>
                      <td className="border-b border-white/5 tabular-nums font-medium text-zinc-100">
                        {(r.taxaUsoCiclos * 100).toFixed(1)}%
                      </td>
                      <td className="border-b border-white/5 tabular-nums text-amber-200/90">
                        {r.diasManutencaoCiclos.toFixed(1)}
                      </td>
                      <td className="border-b border-white/5 tabular-nums text-xpe-neon-dim">{r.diasEmCampoCalendario}</td>
                      <td className="border-b border-white/5 tabular-nums text-zinc-400">{r.diasDisponivelCalendario}</td>
                      <td className="border-b border-white/5 tabular-nums font-medium text-zinc-200">
                        {r.pctTempoEmCampoCalendario.toFixed(1)}%
                      </td>
                      <td className="border-b border-white/5 tabular-nums text-zinc-400">{r.totalEventos}</td>
                      <td className="border-b border-white/5 whitespace-nowrap text-zinc-400">
                        {fmtDia(r.primeiraInstalacaoIso)}
                      </td>
                      <td className="border-b border-white/5 whitespace-nowrap text-zinc-400">
                        {fmtDia(r.ultimoRegistroIso)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Card>
  )
}
