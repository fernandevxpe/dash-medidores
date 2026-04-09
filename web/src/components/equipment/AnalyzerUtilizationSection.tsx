import { useMemo, useState } from 'react'
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
import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DashboardBundle } from '../../types/dashboard'
import type { IndicadoresTemporaisGlobais } from '../../analytics/metrics'
import {
  colunaSerieAnalisador,
  metricasDetalhadasPorAnalisador,
  serieDiariaAnalisadoresUtilizacao,
  totaisAgregadosMetricasAnalisadores,
} from '../../analytics/metrics'
import { Card } from '../ui/Card'
import { IndicatorMiniCard } from '../ui/IndicatorMiniCard'

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

export function AnalyzerUtilizationSection({ bundle, globaisAnalisadores, cap }: Props) {
  const [asOfMs] = useState(() => Date.now())
  const { chavesAnalisador, rows } = useMemo(
    () => serieDiariaAnalisadoresUtilizacao(bundle, asOfMs),
    [bundle, asOfMs],
  )
  const metricas = useMemo(() => metricasDetalhadasPorAnalisador(bundle, asOfMs), [bundle, asOfMs])
  const totais = useMemo(() => totaisAgregadosMetricasAnalisadores(metricas), [metricas])

  type ModoLinhas = 'auto' | Set<string>
  const [modoLinhas, setModoLinhas] = useState<ModoLinhas>('auto')

  const selecionadosParaLinhas = useMemo(() => {
    if (modoLinhas === 'auto') return defaultSelecaoAnalisadores(chavesAnalisador)
    const n = new Set<string>()
    for (const id of modoLinhas) {
      if (chavesAnalisador.includes(id)) n.add(id)
    }
    return n
  }, [modoLinhas, chavesAnalisador])

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
                  contentStyle={{
                    background: '#120b1f',
                    border: '1px solid rgba(168,85,247,0.35)',
                    color: '#fff',
                    fontSize: 11,
                  }}
                  formatter={(v, name) => {
                    if (name === 'pctEmCampoFrota' && v != null) return [`${Number(v).toFixed(1)}%`, '% em campo']
                    return [v as string | number, String(name)]
                  }}
                  labelFormatter={(l) => `Dia ${l}`}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area
                  yAxisId="n"
                  type="monotone"
                  dataKey="emCampoFrota"
                  name="Em campo"
                  fill="rgba(168,85,247,0.25)"
                  stroke="#a855f7"
                  strokeWidth={1.5}
                />
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
                <Line
                  yAxisId="pct"
                  type="monotone"
                  dataKey="pctEmCampoFrota"
                  name="% em campo"
                  stroke="#39ff9c"
                  dot={false}
                  strokeWidth={1.2}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-1 text-[11px] text-zinc-500">
            Área: unidades em campo. Linha tracejada: tamanho nominal do catálogo. Linha verde: % em campo sobre
            analisadores que já tinham 1.ª instalação até aquele dia.
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
                  contentStyle={{
                    background: '#120b1f',
                    border: '1px solid rgba(168,85,247,0.35)',
                    color: '#fff',
                    fontSize: 11,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {[...selecionadosParaLinhas].map((id, i) => (
                  <Line
                    key={id}
                    type="stepAfter"
                    dataKey={colunaSerieAnalisador(id)}
                    name={`#${id}`}
                    stroke={CORES_ANALISADOR[i % CORES_ANALISADOR.length]}
                    dot={false}
                    strokeWidth={1.8}
                    connectNulls={false}
                    isAnimationActive={rows.length < 400}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          {selecionadosParaLinhas.size === 0 && (
            <p className="mt-1 text-xs text-amber-200/90">Selecione pelo menos um analisador para ver as linhas.</p>
          )}
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Tabela · 1.ª instalação, ciclos e calendário
          </p>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[1280px] text-left text-[11px]">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-[10px] uppercase tracking-wider text-zinc-500">
                  <th className="px-2 py-2">ID</th>
                  <th className="px-2 py-2">1.ª instalação</th>
                  <th className="px-2 py-2">Último evento</th>
                  <th className="px-2 py-2"># ev.</th>
                  <th className="px-2 py-2">Dias med. (ciclos)</th>
                  <th className="px-2 py-2">Dias manut.</th>
                  <th className="px-2 py-2">Dias ocios. (ciclos)</th>
                  <th className="px-2 py-2">Taxa uso</th>
                  <th className="px-2 py-2">Méd. med.</th>
                  <th className="px-2 py-2">Méd. manut.</th>
                  <th className="px-2 py-2">Méd. ocios.</th>
                  <th className="px-2 py-2">Dias campo (cal.)</th>
                  <th className="px-2 py-2">Dias livre (cal.)</th>
                  <th className="px-2 py-2">% tempo campo</th>
                </tr>
              </thead>
              <tbody>
                {metricas.map((r) => (
                  <tr key={r.idCanon} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-2 py-1.5 font-mono text-violet-300">{r.idDisplay}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap text-zinc-300">{fmtDia(r.primeiraInstalacaoIso)}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap text-zinc-300">{fmtDia(r.ultimoRegistroIso)}</td>
                    <td className="px-2 py-1.5">{r.totalEventos}</td>
                    <td className="px-2 py-1.5">{r.diasMedicaoCiclos.toFixed(1)}</td>
                    <td className="px-2 py-1.5 text-amber-200/90">{r.diasManutencaoCiclos.toFixed(1)}</td>
                    <td className="px-2 py-1.5">{r.diasOciosidadeCiclos.toFixed(1)}</td>
                    <td className="px-2 py-1.5">{(r.taxaUsoCiclos * 100).toFixed(1)}%</td>
                    <td className="px-2 py-1.5">{r.mediaMedicaoDias.toFixed(1)}</td>
                    <td className="px-2 py-1.5">{r.mediaManutencaoDias.toFixed(1)}</td>
                    <td className="px-2 py-1.5">{r.mediaOciosidadeDias.toFixed(1)}</td>
                    <td className="px-2 py-1.5 text-xpe-neon-dim">{r.diasEmCampoCalendario}</td>
                    <td className="px-2 py-1.5 text-zinc-400">{r.diasDisponivelCalendario}</td>
                    <td className="px-2 py-1.5 font-medium text-zinc-200">
                      {r.pctTempoEmCampoCalendario.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Card>
  )
}
