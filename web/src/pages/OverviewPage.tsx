import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale/pt-BR'
import {
  Activity,
  CircleDashed,
  FlaskConical,
  HardDrive,
  Layers,
  Wrench,
} from 'lucide-react'
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
  equipamentoEstadoAgregado,
  historicoAcoesEquipamentosRecentes,
  inferTipoFromIdMedidor,
  listaEquipamentosDisponiveisComMetricas,
  medidorStatusDistribuicao,
  medidoresDistintosPorCliente,
  resumoPrazoMedicao,
  trafficForCapacity,
} from '../analytics/metrics'

function pct(n: number, total: number) {
  return total > 0 ? ((n / total) * 100).toFixed(1) : '0.0'
}

function fmtData(iso: string) {
  try {
    return format(parseISO(iso.slice(0, 19)), 'dd/MM/yyyy HH:mm', { locale: ptBR })
  } catch {
    return iso.slice(0, 16)
  }
}

export function OverviewPage() {
  const { bundle, loadState, error, eventosFiltrados } = useDashboardData()

  const [histQ, setHistQ] = useState('')
  const [histTipoEq, setHistTipoEq] = useState<'todos' | 'medidor' | 'analisador'>('todos')
  const [histAcao, setHistAcao] = useState<'todos' | 'instalacao' | 'desinstalacao'>('todos')
  const [histOrdem, setHistOrdem] = useState<'recente' | 'antigo'>('recente')
  const [histSoAtivos, setHistSoAtivos] = useState(false)

  const derived = useMemo(() => {
    if (!bundle) return null
    const cap = capacityMetrics(bundle)
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
      { key: 'l', label: 'Disponível', value: anal[2]?.value ?? 0, color: '#64748b' },
    ]
    const mesDual = bucketMonthInstalacaoDesinstalacao(eventosFiltrados)
    const diaDual = bucketDayInstalacaoDesinstalacao(eventosFiltrados)
    const semDual = bucketIsoWeekInstalacaoDesinstalacao(eventosFiltrados)
    const clientes = medidoresDistintosPorCliente(eventosFiltrados).map((row) => ({
      ...row,
      situacao: clienteEstaAtivo(bundle.eventos, row.cliente) ? ('ativo' as const) : ('passado' as const),
    }))
    const dias = bundle.config.diasMedicaoPadrao
    const historicoBase = historicoAcoesEquipamentosRecentes(eventosFiltrados, dias, 30, 30)
    const disponiveisLista = listaEquipamentosDisponiveisComMetricas(bundle)
    const prazo = resumoPrazoMedicao(bundle)
    const prazoMes = bucketMesCiclosConcluidosPrazo(bundle)
    return {
      cap,
      medidorSeg,
      analSeg,
      mesDual,
      diaDual,
      semDual,
      clientes,
      historicoBase,
      disponiveisLista,
      prazo,
      prazoMes,
      dias,
    }
  }, [bundle, eventosFiltrados])

  const historicoFiltrado = useMemo(() => {
    if (!bundle || !derived) return []
    const q = histQ.trim().toLowerCase()
    let rows = derived.historicoBase.filter((r) => {
      if (histAcao !== 'todos' && r.acao !== histAcao) return false
      const tInf = inferTipoFromIdMedidor(r.idMedidor)
      const tipoRow = tInf === 'medidor' ? 'medidor' : tInf === 'analisador' ? 'analisador' : null
      if (histTipoEq !== 'todos' && tipoRow !== histTipoEq) return false
      if (histSoAtivos) {
        const st = equipamentoEstadoAgregado(bundle, r.idMedidor)
        if (st === 'disponivel') return false
      }
      if (q) {
        const id = r.idMedidor.toLowerCase()
        const c = (r.cliente ?? '').toLowerCase()
        const l = (r.localizacao ?? '').toLowerCase()
        if (!id.includes(q) && !c.includes(q) && !l.includes(q)) return false
      }
      return true
    })
    rows = [...rows].sort((a, b) =>
      histOrdem === 'recente' ? b.data.localeCompare(a.data) : a.data.localeCompare(b.data),
    )
    return rows
  }, [
    bundle,
    derived,
    histQ,
    histTipoEq,
    histAcao,
    histOrdem,
    histSoAtivos,
  ])

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
    medidorSeg,
    analSeg,
    mesDual,
    diaDual,
    semDual,
    clientes,
    disponiveisLista,
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

      <p className="text-center text-[11px] text-zinc-500">
        Última atualização recebida: <span className="text-zinc-300">{bundle.geradoEm}</span>
      </p>

      {/* Totais separados */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiTile
          icon={HardDrive}
          label="Total de medidores (frota)"
          value={cap.totalMedidores}
          hint="Referência observada na base exportada"
        />
        <KpiTile
          icon={FlaskConical}
          label="Total de analisadores (catálogo)"
          value={cap.totalAnalisadoresCatalogo}
          hint="Unidades no catálogo operacional"
        />
        <KpiTile
          icon={Layers}
          label="Total de equipamentos"
          value={cap.totalEquipamentosFrota}
          hint="Medidores + analisadores (soma das referências)"
        />
      </div>

      {/* Medidores: uso / manutenção / disponível com denominador */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiTile
          icon={Activity}
          label="Medidores · em uso"
          value={`${cap.instalados} / ${cap.totalMedidores}`}
          hint={`${pct(cap.instalados, cap.totalMedidores)}% da frota`}
          traffic={trafficForCapacity(cap.pctCapacidadeMedidor)}
        />
        <KpiTile
          icon={Wrench}
          label="Medidores · manutenção"
          value={`${cap.manutencaoMedidores} / ${cap.totalMedidores}`}
          hint={`${pct(cap.manutencaoMedidores, cap.totalMedidores)}% da frota`}
        />
        <KpiTile
          icon={CircleDashed}
          label="Medidores · disponíveis"
          value={`${cap.disponiveis} / ${cap.totalMedidores}`}
          hint={`${pct(cap.disponiveis, cap.totalMedidores)}% da frota`}
        />
      </div>

      {/* Analisadores */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiTile
          icon={Activity}
          label="Analisadores · em uso"
          value={`${cap.analisadoresInstalados} / ${cap.totalAnalisadoresCatalogo}`}
          hint={`${pct(cap.analisadoresInstalados, cap.totalAnalisadoresCatalogo)}% do catálogo`}
          traffic={trafficForCapacity(cap.pctCapacidadeAnalisador)}
        />
        <KpiTile
          icon={Wrench}
          label="Analisadores · manutenção"
          value={`${cap.analisadoresManutencao} / ${cap.totalAnalisadoresCatalogo}`}
          hint={`${pct(cap.analisadoresManutencao, cap.totalAnalisadoresCatalogo)}% do catálogo`}
        />
        <KpiTile
          icon={CircleDashed}
          label="Analisadores · disponíveis"
          value={`${cap.analisadoresLivres} / ${cap.totalAnalisadoresCatalogo}`}
          hint={`${pct(cap.analisadoresLivres, cap.totalAnalisadoresCatalogo)}% do catálogo`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Medidores · distribuição da frota"
          subtitle="Cada linha: quantidade / total medidores · percentual do total"
        >
          <SegmentedStatusBar segments={medidorSeg} fleetTotal={cap.totalMedidores} />
          <p className="mt-3 text-center text-[11px] text-xpe-muted">
            Total medidores: <span className="text-zinc-300">{cap.totalMedidores}</span>
          </p>
        </Card>
        <Card
          title="Analisadores · distribuição do catálogo"
          subtitle="Cada linha: quantidade / catálogo · percentual do total"
        >
          <SegmentedStatusBar segments={analSeg} fleetTotal={cap.totalAnalisadoresCatalogo} />
          <p className="mt-3 text-center text-[11px] text-xpe-muted">
            Total catálogo: <span className="text-zinc-300">{cap.totalAnalisadoresCatalogo}</span>
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
        subtitle="Verde = cliente com slot ativo hoje (histórico completo) · Roxo = somente histórico"
        className="overflow-hidden"
      >
        <GroupedClientChart data={clientes} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Volume por dia" subtitle="Instalações e desinstalações (histórico atual)">
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

      <Card
        title="Equipamentos disponíveis agora"
        subtitle="Medidores e analisadores sem slot ativo · tempo desde a última desinstalação e taxa de utilização histórica (medição vs. ociosidade)"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-xpe-border text-[10px] uppercase tracking-wider text-xpe-muted">
                <th className="pb-2 pr-2">ID</th>
                <th className="pb-2 pr-2">Tipo</th>
                <th className="pb-2 pr-2">Disponível desde</th>
                <th className="pb-2 pr-2">Dias disponível</th>
                <th className="pb-2">Taxa utilização (hist.)</th>
              </tr>
            </thead>
            <tbody>
              {disponiveisLista.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-zinc-500">
                    Nenhum equipamento disponível no replay atual.
                  </td>
                </tr>
              ) : (
                disponiveisLista.map((row) => (
                  <tr key={`${row.tipo}-${row.id}`} className="border-b border-white/5 text-zinc-300">
                    <td className="py-2 pr-2 font-mono text-[11px] text-xpe-neon-dim">{row.id}</td>
                    <td className="py-2 pr-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                          row.tipo === 'medidor'
                            ? 'bg-xpe-purple/25 text-xpe-neon'
                            : 'bg-violet-500/20 text-violet-200'
                        }`}
                      >
                        {row.tipo === 'medidor' ? 'Medidor' : 'Analisador'}
                      </span>
                    </td>
                    <td className="py-2 pr-2 text-zinc-400">
                      {row.disponivelDesdeIso ? fmtData(row.disponivelDesdeIso) : '—'}
                    </td>
                    <td className="py-2 pr-2 tabular-nums">
                      {row.diasDisponivel !== null ? `${row.diasDisponivel.toFixed(1)} d` : '—'}
                    </td>
                    <td className="py-2 tabular-nums text-zinc-200">{row.taxaUtilizacaoPct.toFixed(1)}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card
        title="Histórico de ações · instalações e desinstalações"
        subtitle={`Base: últimas 30 instalações e 30 desinstalações · previsão +${bundle.config.diasMedicaoPadrao}d (dia útil) nas instalações`}
      >
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
          <div className="min-w-[180px] flex-1">
            <label className="mb-1 block text-[10px] uppercase tracking-wide text-zinc-500">
              Buscar (ID, cliente, local)
            </label>
            <input
              type="search"
              value={histQ}
              onChange={(e) => setHistQ(e.target.value)}
              placeholder="Filtrar…"
              className="w-full rounded-xl border border-xpe-border bg-xpe-bg px-3 py-2 text-sm text-white placeholder:text-zinc-600"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wide text-zinc-500">Ação</label>
            <select
              value={histAcao}
              onChange={(e) => setHistAcao(e.target.value as typeof histAcao)}
              className="w-full min-w-[140px] rounded-xl border border-xpe-border bg-xpe-bg px-3 py-2 text-sm text-white"
            >
              <option value="todos">Todas</option>
              <option value="instalacao">Instalação</option>
              <option value="desinstalacao">Desinstalação</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wide text-zinc-500">Equipamento</label>
            <select
              value={histTipoEq}
              onChange={(e) => setHistTipoEq(e.target.value as typeof histTipoEq)}
              className="w-full min-w-[140px] rounded-xl border border-xpe-border bg-xpe-bg px-3 py-2 text-sm text-white"
            >
              <option value="todos">Todos</option>
              <option value="medidor">Medidor</option>
              <option value="analisador">Analisador</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wide text-zinc-500">Ordem da data</label>
            <select
              value={histOrdem}
              onChange={(e) => setHistOrdem(e.target.value as typeof histOrdem)}
              className="w-full min-w-[160px] rounded-xl border border-xpe-border bg-xpe-bg px-3 py-2 text-sm text-white"
            >
              <option value="recente">Mais recente primeiro</option>
              <option value="antigo">Mais antigo primeiro</option>
            </select>
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={histSoAtivos}
              onChange={(e) => setHistSoAtivos(e.target.checked)}
              className="rounded border-xpe-border"
            />
            Só equipamento ativo hoje
          </label>
        </div>
        <p className="mb-2 text-[11px] text-zinc-500">
          Mostrando <span className="text-zinc-300">{historicoFiltrado.length}</span> linha(s) após filtros.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-xpe-border text-[10px] uppercase tracking-wider text-xpe-muted">
                <th className="pb-2 pr-2">Data</th>
                <th className="pb-2 pr-2">Ação</th>
                <th className="pb-2 pr-2">Tipo</th>
                <th className="pb-2 pr-2">ID</th>
                <th className="pb-2 pr-2">Local</th>
                <th className="pb-2 pr-2">Cliente</th>
                <th className="pb-2">Prev. remoção</th>
              </tr>
            </thead>
            <tbody>
              {historicoFiltrado.map((r, i) => {
                const tipoEq = inferTipoFromIdMedidor(r.idMedidor)
                return (
                  <tr key={`${r.acao}-${r.data}-${r.idMedidor}-${i}`} className="border-b border-white/5 text-zinc-300 hover:bg-white/[0.03]">
                    <td className="py-2 pr-2 whitespace-nowrap text-zinc-400">{fmtData(r.data)}</td>
                    <td className="py-2 pr-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                          r.acao === 'instalacao'
                            ? 'bg-emerald-500/20 text-emerald-200'
                            : 'bg-xpe-purple/25 text-xpe-purple'
                        }`}
                      >
                        {r.acao === 'instalacao' ? 'Inst.' : 'Desinst.'}
                      </span>
                    </td>
                    <td className="py-2 pr-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                          tipoEq === 'medidor'
                            ? 'bg-xpe-purple/25 text-xpe-neon'
                            : tipoEq === 'analisador'
                              ? 'bg-violet-500/20 text-violet-200'
                              : 'bg-zinc-700 text-zinc-400'
                        }`}
                      >
                        {tipoEq === 'medidor' ? 'Med.' : tipoEq === 'analisador' ? 'Anal.' : '?'}
                      </span>
                    </td>
                    <td className="py-2 pr-2 font-mono text-[11px]">{r.idMedidor}</td>
                    <td className="py-2 pr-2">{r.localizacao ?? '—'}</td>
                    <td className="py-2 pr-2">{r.cliente ?? '—'}</td>
                    <td className="py-2 text-xpe-purple">
                      {r.previsaoRemocao ? r.previsaoRemocao.slice(0, 10) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-center text-[11px] text-zinc-500">
        Gerado em {bundle.geradoEm} · <span className="text-xpe-neon">Apresentação</span> para modo tela cheia
      </p>
    </div>
  )
}
