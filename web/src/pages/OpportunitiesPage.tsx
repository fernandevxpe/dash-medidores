import { useMemo, useState, type ReactNode } from 'react'
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
import { useDashboardData } from '../context/DashboardDataContext'
import { Card } from '../components/ui/Card'
import { IndicatorMiniCard } from '../components/ui/IndicatorMiniCard'
import { BarVolumeDual } from '../components/charts/BarVolumeDual'
import {
  chartLegendWrapperStyle,
  chartTooltipContentStyle,
  chartTooltipItemStyle,
  chartTooltipLabelStyle,
} from '../components/charts/chartTheme'
import {
  bucketDayInstalacaoDesinstalacaoPorTipo,
  bucketIsoWeekInstalacaoDesinstalacaoPorTipo,
  comparacaoUltimasSemanasIso,
  contagemDisponiveisLongaBaixaUtilizacao,
  capacityMetrics,
  gerarInsightsOportunidades,
  historicosTemporaisDaFrota,
  listaEquipamentosDisponiveisComMetricas,
  metricasDetalhadasPorAnalisador,
  picosVolumeInstalacaoDesinstalacao,
  rankingAnalisadoresPorUtilizacao,
  rankingMedidoresPorTaxaUso,
  resumoCapacidadeTecnica,
  resumoPrazoMedicao,
  totaisAgregadosMetricasAnalisadores,
  unknownLocationShare,
  type CriterioRankingAnalisador,
  type InsightOportunidade,
  type MetricaDetalhadaAnalisador,
} from '../analytics/metrics'
import { Boxes, FlaskConical, Gauge, TrendingDown, TrendingUp } from 'lucide-react'

const MS_MIN_MED = 7 * 86_400_000
const DIAS_RECENTES_GRAFICO = 56

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-3 border-b border-xpe-border/60 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-300/95">
      {children}
    </h3>
  )
}

function severidadeClass(s: InsightOportunidade['severidade']) {
  if (s === 'positivo') return 'border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-100/95'
  if (s === 'critico') return 'border-rose-500/35 bg-rose-500/[0.07] text-rose-100/95'
  return 'border-amber-500/30 bg-amber-500/[0.06] text-amber-100/95'
}

export function OpportunitiesPage() {
  const { bundle, eventosFiltrados, loadState } = useDashboardData()
  const [criterioAn, setCriterioAn] = useState<CriterioRankingAnalisador>('taxaUsoCiclos')

  const d = useMemo(() => {
    if (!bundle) return null
    const cap = capacityMetrics(bundle)
    const resumoCap = resumoCapacidadeTecnica(cap)
    const metricasAn = metricasDetalhadasPorAnalisador(bundle)
    const totaisAn = totaisAgregadosMetricasAnalisadores(metricasAn)
    const historicos = historicosTemporaisDaFrota(bundle)
    const rankMed = rankingMedidoresPorTaxaUso(historicos, MS_MIN_MED, 5)
    const rankAnCiclos = rankingAnalisadoresPorUtilizacao(metricasAn, 'taxaUsoCiclos', 5)
    const rankAnCal = rankingAnalisadoresPorUtilizacao(metricasAn, 'pctTempoEmCampoCalendario', 5)

    const diaMed = bucketDayInstalacaoDesinstalacaoPorTipo(eventosFiltrados, 'medidor')
    const diaAn = bucketDayInstalacaoDesinstalacaoPorTipo(eventosFiltrados, 'analisador')
    const picosMed = picosVolumeInstalacaoDesinstalacao(diaMed)
    const picosAn = picosVolumeInstalacaoDesinstalacao(diaAn)

    const semMed = bucketIsoWeekInstalacaoDesinstalacaoPorTipo(eventosFiltrados, 'medidor')
    const semAn = bucketIsoWeekInstalacaoDesinstalacaoPorTipo(eventosFiltrados, 'analisador')
    const compMed = comparacaoUltimasSemanasIso(semMed, 4, 4)
    const compAn = comparacaoUltimasSemanasIso(semAn, 4, 4)

    const unknownShare = unknownLocationShare(eventosFiltrados)
    const listaDisp = listaEquipamentosDisponiveisComMetricas(bundle)
    const disponiveisLonga = contagemDisponiveisLongaBaixaUtilizacao(listaDisp)
    const resumoPrazo = resumoPrazoMedicao(bundle)

    const nMedidoresRanked = historicos.filter(
      (h) => h.tipo === 'medidor' && h.totalMedicaoMs + h.totalOciosidadeMs >= MS_MIN_MED,
    ).length
    const nAnalisadoresRanked = metricasAn.filter((m) => m.diasMedicaoCiclos + m.diasOciosidadeCiclos >= 1).length

    const insights = gerarInsightsOportunidades({
      cap,
      totaisAnalisadores: totaisAn,
      nMedidoresRanked,
      nAnalisadoresRanked,
      picosMedidor: picosMed,
      picosAnalisador: picosAn,
      comparacaoMedidor: compMed,
      comparacaoAnalisador: compAn,
      unknownShare,
      disponiveisLongaOciosidade: disponiveisLonga,
      resumoPrazo,
    })

    const diaMedChart = diaMed.slice(-DIAS_RECENTES_GRAFICO)
    const diaAnChart = diaAn.slice(-DIAS_RECENTES_GRAFICO)
    const semMedChart = semMed.slice(-20).map((r) => ({
      semana: r.semana,
      instalacoes: r.instalacoes,
      desinstalacoes: r.desinstalacoes,
    }))
    const semAnChart = semAn.slice(-20).map((r) => ({
      semana: r.semana,
      instalacoes: r.instalacoes,
      desinstalacoes: r.desinstalacoes,
    }))

    const dispOrdenados = [...listaDisp]
      .filter((x) => (x.diasDisponivel ?? 0) >= 14)
      .sort((a, b) => (b.diasDisponivel ?? 0) - (a.diasDisponivel ?? 0))
      .slice(0, 8)

    return {
      cap,
      resumoCap,
      metricasAn,
      totaisAn,
      rankMed,
      rankAnCiclos,
      rankAnCal,
      diaMedChart,
      diaAnChart,
      picosMed,
      picosAn,
      compMed,
      compAn,
      unknownShare,
      resumoPrazo,
      insights,
      semMedChart,
      semAnChart,
      dispOrdenados,
    }
  }, [bundle, eventosFiltrados])

  const rankAnAtivo =
    criterioAn === 'taxaUsoCiclos' ? d?.rankAnCiclos : d?.rankAnCal

  if (loadState !== 'ready' || !bundle || !d) {
    return <div className="py-20 text-center text-xpe-muted">Carregando…</div>
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-lg font-bold tracking-tight text-white sm:text-xl">Oportunidades</h1>
        <p className="mt-1 max-w-3xl text-sm text-zinc-400">
          Painel de melhorias: analisadores e medidores, rankings de utilização, volume operacional, picos e folga de
          capacidade técnica. Rankings de uso usam o histórico completo da planilha; gráficos respeitam o filtro de
          datas do Painel, quando ativo.
        </p>
      </div>

      <Card title="Leitura estratégica" subtitle="Regras automáticas sobre ocupação, prazo, dados e volume recente">
        <ul className="space-y-2">
          {d.insights.map((ins, i) => (
            <li
              key={i}
              className={`rounded-xl border px-3 py-2.5 text-sm ${severidadeClass(ins.severidade)}`}
            >
              <p className="font-semibold text-white">{ins.titulo}</p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-300">{ins.detalhe}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card
        title="Analisadores · capacidade e utilização"
        subtitle="Catálogo, folga técnica, melhores/piores indicadores e movimentação no período filtrado"
      >
        <div className="space-y-8">
          <section>
            <SectionTitle>Capacidade técnica (teto = catálogo)</SectionTitle>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <IndicatorMiniCard
                icon={FlaskConical}
                accent="violet"
                label="Teto catálogo"
                value={String(d.resumoCap.analisadores.tetoUnidades)}
              />
              <IndicatorMiniCard
                icon={Gauge}
                accent="neon"
                label="Em campo hoje"
                value={String(d.resumoCap.analisadores.emCampo)}
              />
              <IndicatorMiniCard
                icon={Boxes}
                accent="neutral"
                label="Folga até teto"
                value={`${d.resumoCap.analisadores.folgaUnidades} u.`}
              />
              <IndicatorMiniCard
                icon={TrendingUp}
                accent="sky"
                label="Ocupação atual"
                value={`${d.resumoCap.analisadores.pctOcupacao.toFixed(1)}%`}
              />
              <IndicatorMiniCard
                icon={TrendingDown}
                accent="amber"
                label="Até 100% ocupação"
                value={`+${d.resumoCap.analisadores.pctFolgaAteTeto.toFixed(1)}%`}
              />
              <IndicatorMiniCard
                icon={Gauge}
                accent="violet"
                label="Taxa uso média (ciclos)"
                value={`${(d.totaisAn.mediaTaxaUsoCiclosPorEquipamento * 100).toFixed(1)}%`}
              />
            </div>
            <p className="mt-2 text-[11px] text-zinc-500">
              «Capacidade máxima técnica» = todas as unidades do catálogo em instalação ou manutenção em campo; não
              inclui logística de equipes nem lead times.
            </p>
          </section>

          <section>
            <SectionTitle>Volume recente (4 semanas vs 4 anteriores)</SectionTitle>
            <p className="mb-2 text-xs text-zinc-400">
              Instalações + desinstalações: últimas {d.compAn.semanasRecentes} semanas ={' '}
              <span className="font-semibold text-white">{d.compAn.recenteTotal}</span> · anteriores{' '}
              {d.compAn.semanasAnteriores} = <span className="font-semibold text-white">{d.compAn.anteriorTotal}</span>
              {d.compAn.variacaoPctTotal != null && (
                <>
                  {' '}
                  · variação{' '}
                  <span
                    className={
                      d.compAn.variacaoPctTotal > 0 ? 'text-amber-200' : d.compAn.variacaoPctTotal < 0 ? 'text-emerald-200' : ''
                    }
                  >
                    {d.compAn.variacaoPctTotal > 0 ? '+' : ''}
                    {d.compAn.variacaoPctTotal.toFixed(0)}%
                  </span>
                </>
              )}
            </p>
          </section>

          <section>
            <SectionTitle>Instalações e desinstalações · por dia (analisadores)</SectionTitle>
            <BarVolumeDual
              data={d.diaAnChart.map((x) => ({
                name: x.dia.slice(5),
                instalacoes: x.instalacoes,
                desinstalacoes: x.desinstalacoes,
              }))}
              xKey="name"
              keyInst="instalacoes"
              keyDes="desinstalacoes"
            />
            <div className="mt-3 grid gap-2 text-xs text-zinc-400 sm:grid-cols-3">
              <p>
                Pico instalações/dia:{' '}
                <span className="font-medium text-zinc-200">{d.picosAn.maxInstalacoes}</span>
                {d.picosAn.diaMaxInstalacoes && (
                  <span className="text-zinc-500"> · {d.picosAn.diaMaxInstalacoes}</span>
                )}
              </p>
              <p>
                Pico desinstalações/dia:{' '}
                <span className="font-medium text-zinc-200">{d.picosAn.maxDesinstalacoes}</span>
                {d.picosAn.diaMaxDesinstalacoes && (
                  <span className="text-zinc-500"> · {d.picosAn.diaMaxDesinstalacoes}</span>
                )}
              </p>
              <p>
                Pico volume total/dia:{' '}
                <span className="font-medium text-zinc-200">{d.picosAn.maxVolumeTotal}</span>
                {d.picosAn.diaMaxVolumeTotal && (
                  <span className="text-zinc-500"> · {d.picosAn.diaMaxVolumeTotal}</span>
                )}
              </p>
            </div>
          </section>

          <section>
            <SectionTitle>Utilização semanal (ISO) · analisadores</SectionTitle>
            <div className="h-[260px] w-full sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.semAnChart} margin={{ top: 8, right: 8, left: -12, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 6" stroke="rgba(168,85,247,0.12)" vertical={false} />
                  <XAxis dataKey="semana" tick={{ fill: '#a1a1aa', fontSize: 9 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: '#a1a1aa', fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={chartTooltipContentStyle}
                    itemStyle={chartTooltipItemStyle}
                    labelStyle={chartTooltipLabelStyle}
                  />
                  <Legend wrapperStyle={chartLegendWrapperStyle} />
                  <Bar dataKey="instalacoes" name="Instalações" fill="#a855f7" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="desinstalacoes" name="Desinstalações" fill="#c084fc" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section>
            <SectionTitle>Melhores e piores · analisadores</SectionTitle>
            <div className="mb-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCriterioAn('taxaUsoCiclos')}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  criterioAn === 'taxaUsoCiclos'
                    ? 'bg-violet-500/25 text-violet-100 ring-1 ring-violet-400/40'
                    : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                }`}
              >
                Taxa de uso (ciclos)
              </button>
              <button
                type="button"
                onClick={() => setCriterioAn('pctTempoEmCampoCalendario')}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  criterioAn === 'pctTempoEmCampoCalendario'
                    ? 'bg-violet-500/25 text-violet-100 ring-1 ring-violet-400/40'
                    : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                }`}
              >
                % tempo em campo (calendário)
              </button>
            </div>
            <p className="mb-3 text-[11px] text-zinc-500">
              Ciclos: tempo em medição ÷ (medição + ociosidade). Calendário: dias em campo ÷ dias desde a 1.ª instalação.
            </p>
            <div className="grid gap-4 lg:grid-cols-2">
              <RankingAnalisadorTable
                titulo="Mais utilizados"
                linhas={rankAnAtivo?.melhores ?? []}
                criterio={criterioAn}
              />
              <RankingAnalisadorTable
                titulo="Menos utilizados"
                linhas={rankAnAtivo?.piores ?? []}
                criterio={criterioAn}
              />
            </div>
          </section>
        </div>
      </Card>

      <Card
        title="Medidores · capacidade e utilização"
        subtitle="Frota observada, taxa de uso temporal por equipamento e movimentação filtrada"
      >
        <div className="space-y-8">
          <section>
            <SectionTitle>Capacidade técnica (teto = frota observada)</SectionTitle>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <IndicatorMiniCard
                icon={Boxes}
                accent="neon"
                label="Teto frota"
                value={String(d.resumoCap.medidores.tetoUnidades)}
              />
              <IndicatorMiniCard
                icon={Gauge}
                accent="neon"
                label="Em campo hoje"
                value={String(d.resumoCap.medidores.emCampo)}
              />
              <IndicatorMiniCard
                icon={Boxes}
                accent="neutral"
                label="Folga até teto"
                value={`${d.resumoCap.medidores.folgaUnidades} u.`}
              />
              <IndicatorMiniCard
                icon={TrendingUp}
                accent="sky"
                label="Ocupação atual"
                value={`${d.resumoCap.medidores.pctOcupacao.toFixed(1)}%`}
              />
              <IndicatorMiniCard
                icon={TrendingDown}
                accent="amber"
                label="Até 100% ocupação"
                value={`+${d.resumoCap.medidores.pctFolgaAteTeto.toFixed(1)}%`}
              />
              <IndicatorMiniCard
                icon={Gauge}
                accent="neon"
                label="Ciclos fora do prazo"
                value={String(d.resumoPrazo.pendentesDesinstalar)}
              />
            </div>
          </section>

          <section>
            <SectionTitle>Volume recente (4 semanas vs 4 anteriores)</SectionTitle>
            <p className="mb-2 text-xs text-zinc-400">
              Últimas {d.compMed.semanasRecentes} semanas ={' '}
              <span className="font-semibold text-white">{d.compMed.recenteTotal}</span> · anteriores{' '}
              {d.compMed.semanasAnteriores} = <span className="font-semibold text-white">{d.compMed.anteriorTotal}</span>
              {d.compMed.variacaoPctTotal != null && (
                <>
                  {' '}
                  · variação{' '}
                  <span
                    className={
                      d.compMed.variacaoPctTotal > 0 ? 'text-amber-200' : d.compMed.variacaoPctTotal < 0 ? 'text-emerald-200' : ''
                    }
                  >
                    {d.compMed.variacaoPctTotal > 0 ? '+' : ''}
                    {d.compMed.variacaoPctTotal.toFixed(0)}%
                  </span>
                </>
              )}
            </p>
          </section>

          <section>
            <SectionTitle>Instalações e desinstalações · por dia (medidores)</SectionTitle>
            <BarVolumeDual
              data={d.diaMedChart.map((x) => ({
                name: x.dia.slice(5),
                instalacoes: x.instalacoes,
                desinstalacoes: x.desinstalacoes,
              }))}
              xKey="name"
              keyInst="instalacoes"
              keyDes="desinstalacoes"
            />
            <div className="mt-3 grid gap-2 text-xs text-zinc-400 sm:grid-cols-3">
              <p>
                Pico instalações/dia:{' '}
                <span className="font-medium text-zinc-200">{d.picosMed.maxInstalacoes}</span>
                {d.picosMed.diaMaxInstalacoes && (
                  <span className="text-zinc-500"> · {d.picosMed.diaMaxInstalacoes}</span>
                )}
              </p>
              <p>
                Pico desinstalações/dia:{' '}
                <span className="font-medium text-zinc-200">{d.picosMed.maxDesinstalacoes}</span>
                {d.picosMed.diaMaxDesinstalacoes && (
                  <span className="text-zinc-500"> · {d.picosMed.diaMaxDesinstalacoes}</span>
                )}
              </p>
              <p>
                Pico volume total/dia:{' '}
                <span className="font-medium text-zinc-200">{d.picosMed.maxVolumeTotal}</span>
                {d.picosMed.diaMaxVolumeTotal && (
                  <span className="text-zinc-500"> · {d.picosMed.diaMaxVolumeTotal}</span>
                )}
              </p>
            </div>
          </section>

          <section>
            <SectionTitle>Utilização semanal (ISO) · medidores</SectionTitle>
            <div className="h-[260px] w-full sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.semMedChart} margin={{ top: 8, right: 8, left: -12, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 6" stroke="rgba(168,85,247,0.12)" vertical={false} />
                  <XAxis dataKey="semana" tick={{ fill: '#a1a1aa', fontSize: 9 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: '#a1a1aa', fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={chartTooltipContentStyle}
                    itemStyle={chartTooltipItemStyle}
                    labelStyle={chartTooltipLabelStyle}
                  />
                  <Legend wrapperStyle={chartLegendWrapperStyle} />
                  <Bar dataKey="instalacoes" name="Instalações" fill="#39ff9c" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="desinstalacoes" name="Desinstalações" fill="#fb7185" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section>
            <SectionTitle>Melhores e piores · medidores (taxa de uso temporal)</SectionTitle>
            <p className="mb-3 text-[11px] text-zinc-500">
              Só equipamentos com pelo menos 7 dias de histórico (medição + ociosidade). Taxa = tempo em medição ÷
              (medição + ociosidade).
            </p>
            <div className="grid gap-4 lg:grid-cols-2">
              <RankingMedidorTable titulo="Maior taxa de uso" linhas={d.rankMed.melhores} />
              <RankingMedidorTable titulo="Menor taxa de uso" linhas={d.rankMed.piores} />
            </div>
          </section>

          <section>
            <SectionTitle>Prazo de medição (ciclos abertos)</SectionTitle>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3 text-sm text-zinc-300">
              <p>
                Prazo padrão: <span className="text-white">{d.resumoPrazo.diasPadrao}</span> dias · Ciclos concluídos
                dentro do prazo:{' '}
                <span className="text-xpe-neon">{d.resumoPrazo.ciclosConcluidosDentro}</span> · fora:{' '}
                <span className="text-amber-200">{d.resumoPrazo.ciclosConcluidosFora}</span>
              </p>
              <p className="mt-2">
                Abertos dentro do prazo: {d.resumoPrazo.ciclosAtivosDentro} · fora do prazo (ação):{' '}
                <span className="font-semibold text-rose-200">{d.resumoPrazo.ciclosAtivosFora}</span>
              </p>
            </div>
          </section>
        </div>
      </Card>

      <Card title="Gargalos transversais" subtitle="Qualidade dos dados e equipamentos parados">
        <div className="space-y-6">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3 text-sm">
            <p className="font-semibold text-zinc-200">Localização desconhecida ou vazia</p>
            <p className="mt-1 text-zinc-400">
              <span className="tabular-nums text-white">{d.unknownShare.toFixed(1)}%</span> dos eventos no período
              filtrado — reforçar o preenchimento na planilha melhora o rastreio por obra.
            </p>
          </div>
          <div>
            <SectionTitle>Disponíveis há mais tempo (prioridade de revisão)</SectionTitle>
            <p className="mb-2 text-xs text-zinc-500">Equipamentos com estado disponível e ≥ 14 dias neste estado.</p>
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full min-w-[480px] text-left text-xs">
                <thead className="border-b border-white/10 bg-white/[0.03] text-[10px] uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2">Dias disponível</th>
                    <th className="px-3 py-2">Taxa histórica</th>
                  </tr>
                </thead>
                <tbody>
                  {d.dispOrdenados.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-zinc-500">
                        Nenhum registo elegível.
                      </td>
                    </tr>
                  ) : (
                    d.dispOrdenados.map((row) => (
                      <tr key={row.id} className="border-b border-white/5 text-zinc-300">
                        <td className="px-3 py-2 font-mono text-xpe-neon-dim">{row.id}</td>
                        <td className="px-3 py-2 capitalize">{row.tipo}</td>
                        <td className="px-3 py-2 tabular-nums">
                          {row.diasDisponivel != null ? row.diasDisponivel.toFixed(0) : '—'}
                        </td>
                        <td className="px-3 py-2 tabular-nums">{row.taxaUtilizacaoPct.toFixed(1)}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

function RankingMedidorTable({
  titulo,
  linhas,
}: {
  titulo: string
  linhas: { id: string; taxaUso: number; mediaMedicaoDias: number; mediaOciosidadeDias: number }[]
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02]">
      <p className="border-b border-white/10 px-3 py-2 text-xs font-semibold text-zinc-200">{titulo}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-[10px] uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Taxa uso</th>
              <th className="px-3 py-2">Méd. med.</th>
              <th className="px-3 py-2">Méd. oc.</th>
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-3 text-zinc-500">
                  Sem dados suficientes.
                </td>
              </tr>
            ) : (
              linhas.map((r) => (
                <tr key={r.id} className="border-t border-white/5 text-zinc-300">
                  <td className="px-3 py-1.5 font-mono text-[11px] text-xpe-neon-dim">{r.id}</td>
                  <td className="px-3 py-1.5 tabular-nums font-medium text-white">{(r.taxaUso * 100).toFixed(1)}%</td>
                  <td className="px-3 py-1.5 tabular-nums">{r.mediaMedicaoDias.toFixed(1)} d</td>
                  <td className="px-3 py-1.5 tabular-nums">{r.mediaOciosidadeDias.toFixed(1)} d</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RankingAnalisadorTable({
  titulo,
  linhas,
  criterio,
}: {
  titulo: string
  linhas: MetricaDetalhadaAnalisador[]
  criterio: CriterioRankingAnalisador
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02]">
      <p className="border-b border-white/10 px-3 py-2 text-xs font-semibold text-zinc-200">{titulo}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-[10px] uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">{criterio === 'taxaUsoCiclos' ? 'Taxa (ciclos)' : '% calendário'}</th>
              <th className="px-3 py-2">Méd. med.</th>
              <th className="px-3 py-2">Méd. oc.</th>
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-3 text-zinc-500">
                  Sem dados suficientes.
                </td>
              </tr>
            ) : (
              linhas.map((r) => (
                <tr key={r.idCanon} className="border-t border-white/5 text-zinc-300">
                  <td className="px-3 py-1.5 font-mono text-[11px] text-violet-300">{r.idDisplay}</td>
                  <td className="px-3 py-1.5 tabular-nums font-medium text-white">
                    {criterio === 'taxaUsoCiclos'
                      ? `${(r.taxaUsoCiclos * 100).toFixed(1)}%`
                      : `${r.pctTempoEmCampoCalendario.toFixed(1)}%`}
                  </td>
                  <td className="px-3 py-1.5 tabular-nums">{r.mediaMedicaoDias.toFixed(1)} d</td>
                  <td className="px-3 py-1.5 tabular-nums">{r.mediaOciosidadeDias.toFixed(1)} d</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
