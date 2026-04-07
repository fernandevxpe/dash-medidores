import { useMemo } from 'react'
import { useDashboardData } from '../context/DashboardDataContext'
import { Card } from '../components/ui/Card'
import { KpiTile } from '../components/ui/KpiTile'
import { SegmentedStatusBar } from '../components/charts/SegmentedStatusBar'
import { BarVolumeDual } from '../components/charts/BarVolumeDual'
import { BarPrazoCiclos } from '../components/charts/BarPrazoCiclos'
import { GroupedClientChart } from '../components/charts/GroupedClientChart'
import {
  analyzerDonutSlices,
  bucketMesCiclosConcluidosPrazo,
  bucketMonthInstalacaoDesinstalacao,
  bucketDayInstalacaoDesinstalacao,
  bucketIsoWeekInstalacaoDesinstalacao,
  capacityMetrics,
  clienteEstaAtivo,
  medidorStatusDistribuicao,
  medidoresDistintosPorCliente,
  resumoPrazoMedicao,
  tipoEquipamentoDe,
  trafficForCapacity,
  trafficForUnknownShare,
  unknownLocationShare,
  ultimasDesinstalacoes,
  ultimasInstalacoes,
} from '../analytics/metrics'
import { format, parseISO } from 'date-fns'

export function OverviewPage() {
  const { bundle, loadState, error, eventosFiltrados, rangeStart, rangeEnd, setRange } = useDashboardData()

  const derived = useMemo(() => {
    if (!bundle) return null
    const cap = capacityMetrics(bundle)
    const unk = unknownLocationShare(eventosFiltrados)
    const md = medidorStatusDistribuicao(bundle)
    const medidorSeg = [
      { key: 'inst', label: 'Em uso (instalado)', value: md.instalado, color: '#39ff9c' },
      { key: 'man', label: 'Manutenção', value: md.manutencao, color: '#fbbf24' },
      { key: 'disp', label: 'Disponível', value: md.disponivel, color: '#a855f7' },
    ]
    const anal = analyzerDonutSlices(bundle)
    const analSeg = [
      { key: 'u', label: 'Em uso', value: anal[0]?.value ?? 0, color: '#39ff9c' },
      { key: 'm', label: 'Manutenção', value: anal[1]?.value ?? 0, color: '#fbbf24' },
      { key: 'l', label: 'Livre', value: anal[2]?.value ?? 0, color: '#64748b' },
    ]
    const mesDual = bucketMonthInstalacaoDesinstalacao(eventosFiltrados)
    const diaDual = bucketDayInstalacaoDesinstalacao(eventosFiltrados)
    const semDual = bucketIsoWeekInstalacaoDesinstalacao(eventosFiltrados)
    const clientes = medidoresDistintosPorCliente(eventosFiltrados).map((row) => ({
      ...row,
      situacao: clienteEstaAtivo(bundle.eventos, row.cliente) ? ('ativo' as const) : ('passado' as const),
    }))
    const dias = bundle.config.diasMedicaoPadrao
    const ultimas = ultimasInstalacoes(eventosFiltrados, 20, dias)
    const des = ultimasDesinstalacoes(eventosFiltrados, 12)
    const prazo = resumoPrazoMedicao(bundle)
    const prazoMes = bucketMesCiclosConcluidosPrazo(bundle)
    return {
      cap,
      unk,
      medidorSeg,
      analSeg,
      mesDual,
      diaDual,
      semDual,
      clientes,
      ultimas,
      des,
      prazo,
      prazoMes,
    }
  }, [bundle, eventosFiltrados])

  if (loadState === 'loading' || !bundle) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center font-display text-xpe-muted">
        Carregando dados…
      </div>
    )
  }

  if (!derived) return null

  const {
    cap,
    unk,
    medidorSeg,
    analSeg,
    mesDual,
    diaDual,
    semDual,
    clientes,
    ultimas,
    des,
    prazo,
    prazoMes,
  } = derived

  return (
    <div className="space-y-5 sm:space-y-6">
      {error && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-100">
          {error}
        </div>
      )}

      {bundle.fontePlanilha && (
        <p className="text-center text-[11px] text-zinc-500">
          Fonte: <span className="text-zinc-300">{bundle.fontePlanilha}</span>
        </p>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-xpe-border bg-xpe-surface/50 p-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-xpe-muted">Filtro de período</p>
          <p className="mt-1 text-sm text-zinc-400">
            Afeta gráficos e tabelas por data (KPIs de estoque usam sempre o histórico completo).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="flex flex-col text-[10px] uppercase text-zinc-500">
            Início
            <input
              type="date"
              className="mt-1 rounded-lg border border-xpe-border bg-xpe-bg px-2 py-1.5 text-sm text-white"
              value={rangeStart ? format(rangeStart, 'yyyy-MM-dd') : ''}
              onChange={(e) => setRange(e.target.value ? parseISO(e.target.value) : null, rangeEnd)}
            />
          </label>
          <label className="flex flex-col text-[10px] uppercase text-zinc-500">
            Fim
            <input
              type="date"
              className="mt-1 rounded-lg border border-xpe-border bg-xpe-bg px-2 py-1.5 text-sm text-white"
              value={rangeEnd ? format(rangeEnd, 'yyyy-MM-dd') : ''}
              onChange={(e) => setRange(rangeStart, e.target.value ? parseISO(e.target.value) : null)}
            />
          </label>
          <button
            type="button"
            className="self-end rounded-lg border border-xpe-border px-3 py-2 text-xs text-zinc-300 hover:bg-white/5"
            onClick={() => setRange(null, null)}
          >
            Limpar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          label="Total de medidores"
          value={cap.totalMedidores}
          hint="Frota observada na base"
          foot="100% da frota de referência"
        />
        <KpiTile
          label="Medidores em uso / manut. / livres"
          value={`${cap.instalados} / ${cap.manutencaoMedidores} / ${cap.disponiveis}`}
          hint="Último evento por slot: instalação, manutenção ou desinstalação"
          traffic={trafficForCapacity(cap.pctCapacidadeMedidor)}
          foot={
            <>
              Em campo: {cap.instaladosCampo} ({cap.pctCapacidadeMedidor.toFixed(1)}%) · Inst.:{' '}
              {cap.pctMedidoresInstalados.toFixed(1)}% · Manut.: {cap.pctMedidoresManutencao.toFixed(1)}% · Disp.:{' '}
              {cap.totalMedidores > 0
                ? ((cap.disponiveis / cap.totalMedidores) * 100).toFixed(1)
                : '0'}
              %
            </>
          }
        />
        <KpiTile
          label="Analisadores uso / manut. / livres"
          value={`${cap.analisadoresInstalados} / ${cap.analisadoresManutencao} / ${cap.analisadoresLivres}`}
          hint="Catálogo × replay de eventos até hoje"
          traffic={trafficForCapacity(cap.pctCapacidadeAnalisador)}
          foot={
            <>
              Em campo: {cap.analisadoresEmUso} ({cap.pctCapacidadeAnalisador.toFixed(1)}%) · Livres:{' '}
              {cap.totalAnalisadoresCatalogo > 0
                ? ((cap.analisadoresLivres / cap.totalAnalisadoresCatalogo) * 100).toFixed(1)
                : '0'}
              %
            </>
          }
        />
        <KpiTile
          label="Qualidade de localização"
          value={`${unk.toFixed(1)}%`}
          hint='Eventos sem local ou "Desconhecido"'
          traffic={trafficForUnknownShare(unk)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Medidores · distribuição da frota"
          subtitle="Barras empilhadas com contagem e percentual · em campo inclui manutenção"
        >
          <SegmentedStatusBar segments={medidorSeg} />
          <p className="mt-3 text-center text-[11px] text-xpe-muted">
            Eventos: INSTALAÇÃO · MANUTENÇÃO · DESINSTALAÇÃO
          </p>
        </Card>
        <Card title="Analisadores · distribuição do catálogo" subtitle="Mesma lógica por slot (ID analisador_N)">
          <SegmentedStatusBar segments={analSeg} />
          <p className="mt-3 text-center text-[11px] text-xpe-muted">
            Catálogo {cap.totalAnalisadoresCatalogo} unidades (ajustável na exportação)
          </p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title={`Prazo de medição (~${bundle.config.diasMedicaoPadrao} dias)`}
          subtitle="Ciclos: ativo = instalado e ainda sem desinstalação · concluído = houve remoção"
        >
          <ul className="grid gap-2 text-sm text-zinc-300 sm:grid-cols-2">
            <li className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
              <span className="text-zinc-500">Ciclos abertos</span>
              <p className="font-display text-xl text-white">{prazo.totalCiclosAbertos}</p>
              <p className="text-[11px] text-zinc-500">
                Dentro do prazo: {prazo.ciclosAtivosDentro} · Fora: {prazo.ciclosAtivosFora} (pendente desinstalar)
              </p>
            </li>
            <li className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
              <span className="text-zinc-500">Ciclos concluídos</span>
              <p className="font-display text-xl text-white">
                {prazo.ciclosConcluidosDentro + prazo.ciclosConcluidosFora}
              </p>
              <p className="text-[11px] text-zinc-500">
                Dentro ≤{prazo.diasPadrao}d: {prazo.ciclosConcluidosDentro} · Fora: {prazo.ciclosConcluidosFora}
              </p>
            </li>
            <li className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 sm:col-span-2">
              <span className="text-zinc-500">Média dias (instalação → desinstalação), só concluídos</span>
              <p className="font-display text-xl text-emerald-200">
                {prazo.mediaDiasCicloConcluido.toFixed(1)} dias
              </p>
            </li>
          </ul>
        </Card>
        <Card
          title="Concluídos por mês e prazo"
          subtitle="Mês pela data da DESINSTALAÇÃO · compara duração do ciclo ao padrão"
        >
          <BarPrazoCiclos data={prazoMes} diasPrazo={prazo.diasPadrao} />
        </Card>
      </div>

      <Card
        title="Cliente (obra) · equipamentos em instalações"
        subtitle="Verde = cliente com slot ativo hoje (histórico completo) · Roxo = só histórico no período filtrado"
        className="overflow-hidden"
      >
        <GroupedClientChart data={clientes} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Volume por dia" subtitle="Instalações e desinstalações (período filtrado)">
          <BarVolumeDual
            data={diaDual.map((d) => ({
              label: d.dia,
              instalacoes: d.instalacoes,
              desinstalacoes: d.desinstalacoes,
            }))}
            xKey="label"
            keyInst="instalacoes"
            keyDes="desinstalacoes"
          />
        </Card>
        <Card title="Volume por semana ISO" subtitle="Agrupamento semanal">
          <BarVolumeDual
            data={semDual.map((d) => ({
              label: d.semana,
              instalacoes: d.instalacoes,
              desinstalacoes: d.desinstalacoes,
            }))}
            xKey="label"
            keyInst="instalacoes"
            keyDes="desinstalacoes"
          />
        </Card>
        <Card title="Volume por mês" subtitle="Mês calendário (AAAA-MM)">
          <BarVolumeDual
            data={mesDual.map((d) => ({
              label: d.mes,
              instalacoes: d.instalacoes,
              desinstalacoes: d.desinstalacoes,
            }))}
            xKey="label"
            keyInst="instalacoes"
            keyDes="desinstalacoes"
          />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Últimas 20 instalações" subtitle={`Planejamento: +${bundle.config.diasMedicaoPadrao} dias após cada data`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-xpe-border text-[10px] uppercase tracking-wider text-xpe-muted">
                  <th className="pb-2 pr-2">Data</th>
                  <th className="pb-2 pr-2">Tipo</th>
                  <th className="pb-2 pr-2">ID</th>
                  <th className="pb-2 pr-2">Local</th>
                  <th className="pb-2 pr-2">Cliente</th>
                  <th className="pb-2">Prev. +N dias</th>
                </tr>
              </thead>
              <tbody>
                {ultimas.map((r, i) => {
                  const tipo = tipoEquipamentoDe(r)
                  return (
                    <tr key={i} className="border-b border-white/5 text-zinc-300 hover:bg-white/[0.03]">
                      <td className="py-2 pr-2 whitespace-nowrap text-xpe-neon-dim">{r.data}</td>
                      <td className="py-2 pr-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                            tipo === 'medidor'
                              ? 'bg-xpe-purple/25 text-xpe-neon'
                              : tipo === 'analisador'
                                ? 'bg-violet-500/20 text-violet-200'
                                : 'bg-zinc-700 text-zinc-400'
                          }`}
                        >
                          {tipo === 'medidor' ? 'Med.' : tipo === 'analisador' ? 'Anal.' : '?'}
                        </span>
                      </td>
                      <td className="py-2 pr-2 font-mono text-[11px]">{r.idMedidor}</td>
                      <td className="py-2 pr-2">{r.localizacao ?? '—'}</td>
                      <td className="py-2 pr-2">{r.cliente ?? '—'}</td>
                      <td className="py-2 text-xpe-purple">{r.previsaoRemocao.slice(0, 10)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Últimas desinstalações" subtitle="Eventos DESINSTALAÇÃO mais recentes no período filtrado">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-xpe-border text-[10px] uppercase tracking-wider text-xpe-muted">
                  <th className="pb-2 pr-2">Data</th>
                  <th className="pb-2 pr-2">Tipo</th>
                  <th className="pb-2 pr-2">ID</th>
                  <th className="pb-2 pr-2">Local</th>
                  <th className="pb-2 pr-2">Cliente</th>
                </tr>
              </thead>
              <tbody>
                {des.map((r, i) => {
                  const tipoEq = tipoEquipamentoDe(r)
                  const tipoLabel =
                    tipoEq === 'medidor' ? 'Medidor' : tipoEq === 'analisador' ? 'Analisador' : '—'
                  return (
                    <tr key={i} className="border-b border-white/5 text-zinc-300 hover:bg-white/[0.03]">
                      <td className="py-2 pr-2 whitespace-nowrap text-xpe-purple">{r.data}</td>
                      <td className="py-2 pr-2">
                        <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-rose-200">
                          {tipoLabel}
                        </span>
                      </td>
                      <td className="py-2 pr-2 font-mono text-[11px]">{r.idMedidor}</td>
                      <td className="py-2 pr-2">{r.localizacao ?? '—'}</td>
                      <td className="py-2 pr-2">{r.cliente ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <p className="text-center text-[11px] text-zinc-500">
        Gerado em {bundle.geradoEm} · <span className="text-xpe-neon">Apresentação</span> para modo tela cheia
      </p>
    </div>
  )
}
