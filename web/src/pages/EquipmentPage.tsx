import { Fragment, useMemo, useState } from 'react'
import {
  Activity,
  Boxes,
  CircleDashed,
  Gauge,
  Hourglass,
  Timer,
  Wrench,
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useDashboardData } from '../context/DashboardDataContext'
import { Card } from '../components/ui/Card'
import { IndicatorMiniCard } from '../components/ui/IndicatorMiniCard'
import {
  analisadoresSinteticos,
  capacityMetrics,
  eventosPorMedidor,
  historicoTemporalPorEquipamento,
  indicadoresTemporaisGlobais,
  isInstalacao,
  isManutencao,
  medidorStatusDistribuicao,
  medidoresSinteticos,
  previsaoDesinstalacaoDiaUtil,
  analyzerDonutSlices,
  ultimoEventoPorId,
} from '../analytics/metrics'
import type { HistoricoTemporalEquipamento, IntervaloTemporalEquipamento } from '../analytics/metrics'

function intervalosHistoricoMerged(h: HistoricoTemporalEquipamento): IntervaloTemporalEquipamento[] {
  return [
    ...h.intervalosMedicao,
    ...h.intervalosOciosidade,
    ...h.intervalosManutencao,
  ].sort((a, b) => a.inicio.localeCompare(b.inicio))
}

function intervaloTipoLabel(t: IntervaloTemporalEquipamento['tipo']) {
  if (t === 'medicao') return 'Medição'
  if (t === 'manutencao') return 'Manutenção'
  return 'Ociosidade'
}

function intervaloTipoClass(t: IntervaloTemporalEquipamento['tipo']) {
  if (t === 'medicao') return 'text-xpe-neon-dim'
  if (t === 'manutencao') return 'text-amber-300'
  return 'text-violet-300'
}
import { SegmentedStatusBar } from '../components/charts/SegmentedStatusBar'
import { AnalyzerUtilizationSection } from '../components/equipment/AnalyzerUtilizationSection'

function previsaoParaEquipamento(
  eventos: Parameters<typeof eventosPorMedidor>[0],
  id: string,
  dias: number,
): string | null {
  const evs = eventosPorMedidor(eventos, id).sort(
    (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime(),
  )
  const last = evs[0]
  if (!last) return null
  if (isInstalacao(last)) return previsaoDesinstalacaoDiaUtil(last.data, dias, 0).toISOString()
  if (isManutencao(last)) {
    for (const e of evs) {
      if (isInstalacao(e) && e.localizacao === last.localizacao)
        return previsaoDesinstalacaoDiaUtil(e.data, dias, 0).toISOString()
    }
  }
  return null
}

function EstadoBadge({ status }: { status: string }) {
  const cls =
    status === 'instalado'
      ? 'bg-xpe-neon/15 text-xpe-neon'
      : status === 'manutencao'
        ? 'bg-amber-500/20 text-amber-200'
        : 'bg-xpe-purple/20 text-xpe-purple'
  const label =
    status === 'instalado' ? 'em uso' : status === 'manutencao' ? 'manutenção' : 'disponível'
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${cls}`}>{label}</span>
  )
}

function UltimoEventoLabel({ s }: { s: string | null }) {
  const t =
    s === 'instalacao' ? 'Inst.' : s === 'manutencao' ? 'Manut.' : s === 'desinstalacao' ? 'Desinst.' : '—'
  return <span className="text-[10px] uppercase text-zinc-400">{t}</span>
}

export function EquipmentPage() {
  const { bundle, loadState } = useDashboardData()
  const [clienteQ, setClienteQ] = useState('')
  const [meterId, setMeterId] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const medRows = useMemo(() => {
    if (!bundle) return []
    const dias = bundle.config.diasMedicaoPadrao
    return medidoresSinteticos(bundle).map((m) => {
      const ev = ultimoEventoPorId(bundle.eventos, m.id)
      const prev = previsaoParaEquipamento(bundle.eventos, m.id, dias)
      return {
        id: m.id,
        status: m.status,
        cliente: ev?.cliente ?? '—',
        loc: ev?.localizacao ?? '—',
        data: ev?.data ?? null,
        ultimoStatus: ev?.statusExecucao ?? null,
        prev,
      }
    })
  }, [bundle])

  const analRows = useMemo(() => {
    if (!bundle) return []
    const dias = bundle.config.diasMedicaoPadrao
    return analisadoresSinteticos(bundle).map((m) => {
      const ev = ultimoEventoPorId(bundle.eventos, m.id)
      const prev = previsaoParaEquipamento(bundle.eventos, m.id, dias)
      return {
        id: m.id,
        status: m.status,
        cliente: ev?.cliente ?? '—',
        loc: ev?.localizacao ?? '—',
        data: ev?.data ?? null,
        ultimoStatus: ev?.statusExecucao ?? null,
        prev,
      }
    })
  }, [bundle])

  const historicoSelecionado = useMemo(() => {
    if (!bundle || !expandedId) return null
    return historicoTemporalPorEquipamento(bundle.eventos, expandedId)
  }, [bundle, expandedId])

  const filteredMed = useMemo(() => {
    const cq = clienteQ.trim().toLowerCase()
    const mq = meterId.trim().toLowerCase()
    return medRows.filter((r) => {
      if (mq && !r.id.toLowerCase().includes(mq)) return false
      if (cq && !r.cliente.toLowerCase().includes(cq)) return false
      return true
    })
  }, [medRows, clienteQ, meterId])

  const filteredAnal = useMemo(() => {
    const cq = clienteQ.trim().toLowerCase()
    const mq = meterId.trim().toLowerCase()
    return analRows.filter((r) => {
      if (mq && !r.id.toLowerCase().includes(mq)) return false
      if (cq && !r.cliente.toLowerCase().includes(cq)) return false
      return true
    })
  }, [analRows, clienteQ, meterId])

  const timeline = useMemo(() => {
    if (!bundle || !meterId.trim()) return []
    return eventosPorMedidor(bundle.eventos, meterId.trim())
  }, [bundle, meterId])

  const timelineMetricas = useMemo(() => {
    if (!bundle || !meterId.trim()) return null
    return historicoTemporalPorEquipamento(bundle.eventos, meterId.trim())
  }, [bundle, meterId])

  const byStatus = useMemo(() => {
    if (!bundle) return new Map<string, string>()
    const m = new Map<string, string>()
    for (const r of medidoresSinteticos(bundle)) m.set(r.id, r.status)
    for (const r of analisadoresSinteticos(bundle)) m.set(r.id, r.status)
    return m
  }, [bundle])

  const globaisTempo = useMemo(() => (bundle ? indicadoresTemporaisGlobais(bundle) : null), [bundle])
  const cap = useMemo(() => (bundle ? capacityMetrics(bundle) : null), [bundle])
  const medidorBars = useMemo(() => {
    if (!bundle) return []
    const d = medidorStatusDistribuicao(bundle)
    return [
      { name: 'Em uso', value: d.instalado, fill: '#39ff9c' },
      { name: 'Manutenção', value: d.manutencao, fill: '#fbbf24' },
      { name: 'Disponível', value: d.disponivel, fill: '#a855f7' },
    ]
  }, [bundle])
  const analBars = useMemo(() => {
    if (!bundle) return []
    const a = analyzerDonutSlices(bundle)
    return [
      { name: 'Em uso', value: a[0]?.value ?? 0, fill: '#39ff9c' },
      { name: 'Manutenção', value: a[1]?.value ?? 0, fill: '#fbbf24' },
      { name: 'Disponível', value: a[2]?.value ?? 0, fill: '#64748b' },
    ]
  }, [bundle])
  const medSeg = useMemo(
    () => medidorBars.map((x, i) => ({ key: `m-${i}`, label: x.name, value: x.value, color: x.fill })),
    [medidorBars],
  )
  const anSeg = useMemo(
    () => analBars.map((x, i) => ({ key: `a-${i}`, label: x.name, value: x.value, color: x.fill })),
    [analBars],
  )

  if (loadState !== 'ready' || !bundle || !globaisTempo || !cap) {
    return <div className="py-20 text-center text-xpe-muted">Carregando…</div>
  }

  return (
    <div className="space-y-5">
      <Card title="Indicadores globais · Medidores" subtitle="Uso, disponibilidade e tempos médios de ciclo">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <IndicatorMiniCard
            icon={Boxes}
            accent="neon"
            label="Quantidade"
            value={String(globaisTempo.medidores.quantidadeEquipamentos)}
          />
          <IndicatorMiniCard
            icon={Activity}
            accent="neon"
            label="Em uso"
            value={String(globaisTempo.medidores.emUso)}
          />
          <IndicatorMiniCard
            icon={CircleDashed}
            accent="neutral"
            label="Disponíveis"
            value={String(globaisTempo.medidores.disponiveis)}
          />
          <IndicatorMiniCard
            icon={Wrench}
            accent="amber"
            label="Manutenção"
            value={String(globaisTempo.medidores.manutencao)}
          />
          <IndicatorMiniCard
            icon={Timer}
            accent="sky"
            label="Média medição"
            value={`${globaisTempo.medidores.mediaMedicaoDias.toFixed(1)} d`}
            foot="instalação até desinstalação"
          />
          <IndicatorMiniCard
            icon={Hourglass}
            accent="violet"
            label="Média ociosidade"
            value={`${globaisTempo.medidores.mediaOciosidadeDias.toFixed(1)} d`}
            foot="só após 1.ª desinst.; desde 1.ª instalação; manutenção excluída"
          />
          <IndicatorMiniCard
            icon={Wrench}
            accent="amber"
            label="Média manutenção"
            value={`${globaisTempo.medidores.mediaManutencaoDias.toFixed(1)} d`}
            foot="fora de medição e ociosidade"
          />
          <IndicatorMiniCard
            icon={Gauge}
            accent="neon"
            label="Taxa de uso"
            value={`${(globaisTempo.medidores.taxaUso * 100).toFixed(1)}%`}
            foot="medição / (medição + ociosidade)"
          />
        </div>
      </Card>

      <AnalyzerUtilizationSection bundle={bundle} globaisAnalisadores={globaisTempo.analisadores} cap={cap} />

      <Card title="Status consolidado de frota" subtitle="Conteúdo migrado da guia Status">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-300">Medidores</p>
            <div className="h-[210px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={medidorBars} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 6" stroke="rgba(168,85,247,0.12)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#e4e4e7', fontSize: 11 }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    tick={{ fill: '#f4f4f5', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip contentStyle={{ background: '#120b1f', border: '1px solid rgba(168,85,247,0.35)', color: '#fff' }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={24}>
                    {medidorBars.map((_, i) => (
                      <Cell key={i} fill={medidorBars[i]!.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <SegmentedStatusBar segments={medSeg} />
          </div>
          <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-300">Analisadores</p>
            <div className="h-[210px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analBars} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 6" stroke="rgba(168,85,247,0.12)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#f4f4f5', fontSize: 11 }} interval={0} />
                  <YAxis tick={{ fill: '#f4f4f5', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#120b1f', border: '1px solid rgba(168,85,247,0.35)', color: '#fff' }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={44}>
                    {analBars.map((_, i) => (
                      <Cell key={i} fill={analBars[i]!.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <SegmentedStatusBar segments={anSeg} />
          </div>
        </div>
        <p className="mt-3 text-xs text-zinc-400">
          Catálogo analisadores: {cap.totalAnalisadoresCatalogo} · Medidores observados: {cap.totalMedidores}
        </p>
      </Card>

      <Card title="Busca operacional" subtitle="Por cliente (obra) ou ID do equipamento (xp… ou analisador_N)">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs uppercase text-zinc-500">
            Cliente
            <input
              value={clienteQ}
              onChange={(e) => setClienteQ(e.target.value)}
              className="mt-1 w-full rounded-xl border border-xpe-border bg-xpe-bg px-3 py-2 text-sm text-white"
              placeholder="Nome do cliente na planilha"
            />
          </label>
          <label className="text-xs uppercase text-zinc-500">
            ID
            <input
              value={meterId}
              onChange={(e) => setMeterId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-xpe-border bg-xpe-bg px-3 py-2 font-mono text-sm text-white"
              placeholder="xp000000… ou analisador_1"
            />
          </label>
        </div>
      </Card>

      <Card title="Medidores (frota xp…)" subtitle="Clique na linha para ver instalações e locais">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-xpe-border text-[10px] uppercase tracking-wider text-xpe-muted">
                <th className="w-8 pb-2" />
                <th className="pb-2">ID</th>
                <th className="pb-2">Estado</th>
                <th className="pb-2">Último evento</th>
                <th className="pb-2">Cliente</th>
                <th className="pb-2">Local</th>
                <th className="pb-2">Data</th>
                <th className="pb-2">Prev. +N</th>
              </tr>
            </thead>
            <tbody>
              {filteredMed.map((r) => {
                const open = expandedId === r.id
                return (
                  <Fragment key={r.id}>
                    <tr
                      className="cursor-pointer border-b border-white/5 hover:bg-white/[0.03]"
                      onClick={() => setExpandedId(open ? null : r.id)}
                    >
                      <td className="py-2 text-zinc-500">{open ? '▼' : '▶'}</td>
                      <td className="py-2 font-mono text-[11px] text-xpe-neon-dim">{r.id}</td>
                      <td className="py-2">
                        <EstadoBadge status={r.status} />
                      </td>
                      <td className="py-2">
                        <UltimoEventoLabel s={r.ultimoStatus} />
                      </td>
                      <td className="py-2 text-zinc-200">{r.cliente}</td>
                      <td className="py-2">{r.loc}</td>
                      <td className="py-2 whitespace-nowrap">{r.data?.slice(0, 16) ?? '—'}</td>
                      <td className="py-2 whitespace-nowrap text-xpe-purple">{r.prev?.slice(0, 10) ?? '—'}</td>
                    </tr>
                    {open && (
                      <tr className="border-b border-white/5 bg-white/[0.02]">
                        <td colSpan={8} className="px-4 py-3 text-sm text-zinc-400">
                          <p className="mb-2 text-[11px] font-medium uppercase text-xpe-muted">
                            Histórico temporal completo (fechado + em andamento)
                          </p>
                          {!historicoSelecionado || intervalosHistoricoMerged(historicoSelecionado).length === 0 ? (
                            <p>Sem ciclos calculados para este ID (sem 1.ª instalação registada).</p>
                          ) : (
                            <ul className="grid gap-1 sm:grid-cols-2">
                              {intervalosHistoricoMerged(historicoSelecionado).map((x, i) => (
                                <li key={i} className="text-xs">
                                  <span className={intervaloTipoClass(x.tipo)}>{intervaloTipoLabel(x.tipo)}</span>{' '}
                                  · {x.inicio.slice(0, 10)} → {x.fim.slice(0, 10)} · {x.duracaoDias.toFixed(1)}d{' '}
                                  {x.aberto ? '(aberto)' : '(fechado)'}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Analisadores (catálogo)" subtitle="Mesma interação — clique para instalações e locais">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-xpe-border text-[10px] uppercase tracking-wider text-xpe-muted">
                <th className="w-8 pb-2" />
                <th className="pb-2">ID</th>
                <th className="pb-2">Estado</th>
                <th className="pb-2">Último evento</th>
                <th className="pb-2">Cliente</th>
                <th className="pb-2">Local</th>
                <th className="pb-2">Data</th>
                <th className="pb-2">Prev. +N</th>
              </tr>
            </thead>
            <tbody>
              {filteredAnal.map((r) => {
                const open = expandedId === r.id
                return (
                  <Fragment key={r.id}>
                    <tr
                      className="cursor-pointer border-b border-white/5 hover:bg-white/[0.03]"
                      onClick={() => setExpandedId(open ? null : r.id)}
                    >
                      <td className="py-2 text-zinc-500">{open ? '▼' : '▶'}</td>
                      <td className="py-2 font-mono text-[11px] text-violet-300">{r.id}</td>
                      <td className="py-2">
                        <EstadoBadge status={r.status} />
                      </td>
                      <td className="py-2">
                        <UltimoEventoLabel s={r.ultimoStatus} />
                      </td>
                      <td className="py-2 text-zinc-200">{r.cliente}</td>
                      <td className="py-2">{r.loc}</td>
                      <td className="py-2 whitespace-nowrap">{r.data?.slice(0, 16) ?? '—'}</td>
                      <td className="py-2 whitespace-nowrap text-xpe-purple">{r.prev?.slice(0, 10) ?? '—'}</td>
                    </tr>
                    {open && (
                      <tr className="border-b border-white/5 bg-white/[0.02]">
                        <td colSpan={8} className="px-4 py-3 text-sm text-zinc-400">
                          <p className="mb-2 text-[11px] font-medium uppercase text-xpe-muted">
                            Histórico temporal completo (fechado + em andamento)
                          </p>
                          {!historicoSelecionado || intervalosHistoricoMerged(historicoSelecionado).length === 0 ? (
                            <p>Sem ciclos calculados para este ID (sem 1.ª instalação registada).</p>
                          ) : (
                            <ul className="grid gap-1 sm:grid-cols-2">
                              {intervalosHistoricoMerged(historicoSelecionado).map((x, i) => (
                                <li key={i} className="text-xs">
                                  <span className={intervaloTipoClass(x.tipo)}>{intervaloTipoLabel(x.tipo)}</span>{' '}
                                  · {x.inicio.slice(0, 10)} → {x.fim.slice(0, 10)} · {x.duracaoDias.toFixed(1)}d{' '}
                                  {x.aberto ? '(aberto)' : '(fechado)'}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Histórico por ID (busca)" subtitle="Todos os eventos da planilha para o ID informado acima">
        {!meterId.trim() ? (
          <p className="text-sm text-zinc-500">Informe um ID acima para ver a linha do tempo.</p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-zinc-400">
              Estado sintético: <span className="text-white">{byStatus.get(meterId.trim()) ?? '—'}</span>
            </p>
            {timelineMetricas && (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <IndicatorMiniCard
                  icon={Timer}
                  accent="sky"
                  label="Média medição"
                  value={`${timelineMetricas.mediaMedicaoDias.toFixed(1)} d`}
                  foot="até manutenção ou desinstalação"
                />
                <IndicatorMiniCard
                  icon={Wrench}
                  accent="amber"
                  label="Média manutenção"
                  value={`${timelineMetricas.mediaManutencaoDias.toFixed(1)} d`}
                  foot="fora de medição e ociosidade"
                />
                <IndicatorMiniCard
                  icon={Hourglass}
                  accent="violet"
                  label="Média ociosidade"
                  value={`${timelineMetricas.mediaOciosidadeDias.toFixed(1)} d`}
                  foot="após 1.ª desinstalação"
                />
                <IndicatorMiniCard
                  icon={Gauge}
                  accent="neon"
                  label="Taxa de uso"
                  value={`${(timelineMetricas.taxaUso * 100).toFixed(1)}%`}
                  foot="medição / (medição + ociosidade)"
                />
              </div>
            )}
            <ul className="mt-3 space-y-2 border-l border-xpe-border pl-4">
              {timeline.map((e, i) => (
                <li key={i} className="relative text-sm">
                  <span
                    className={`absolute -left-[21px] top-1.5 h-2 w-2 rounded-full shadow ${
                      e.statusExecucao === 'desinstalacao'
                        ? 'bg-xpe-purple shadow-[0_0_10px_#a855f7]'
                        : e.statusExecucao === 'manutencao'
                          ? 'bg-amber-400 shadow-[0_0_10px_#fbbf24]'
                          : 'bg-xpe-neon shadow-[0_0_10px_#39ff9c]'
                    }`}
                  />
                  <p className="font-mono text-xs text-xpe-neon-dim">{e.data}</p>
                  <p className="text-zinc-300">
                    <span className="uppercase text-[10px] text-zinc-500">{e.statusExecucao}</span> ·{' '}
                    {e.localizacao ?? '—'} · {e.cliente ?? '—'}
                  </p>
                </li>
              ))}
            </ul>
            {timeline.length === 0 && (
              <p className="text-sm text-amber-200/90">Nenhum evento para este ID.</p>
            )}
            {timelineMetricas && (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-zinc-300">
                <p className="font-semibold text-zinc-100">Intervalos calculados</p>
                <p>
                  Medição: {timelineMetricas.ciclosMedicaoFechados} fechado(s), {timelineMetricas.ciclosMedicaoAbertos}{' '}
                  aberto(s)
                </p>
                <p>
                  Ociosidade: {timelineMetricas.ciclosOciosidadeFechados} fechado(s),{' '}
                  {timelineMetricas.ciclosOciosidadeAbertos} aberto(s)
                </p>
                <p>
                  Manutenção: {timelineMetricas.ciclosManutencaoFechados} fechado(s),{' '}
                  {timelineMetricas.ciclosManutencaoAbertos} aberto(s)
                </p>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
