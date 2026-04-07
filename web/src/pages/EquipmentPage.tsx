import { Fragment, useMemo, useState } from 'react'
import { useDashboardData } from '../context/DashboardDataContext'
import { Card } from '../components/ui/Card'
import {
  analisadoresSinteticos,
  eventosPorMedidor,
  isInstalacao,
  isManutencao,
  medidoresSinteticos,
  previsaoDesinstalacaoDiaUtil,
  ultimoEventoPorId,
} from '../analytics/metrics'

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

  const historicoInstalacoes = useMemo(() => {
    if (!bundle || !expandedId) return []
    return eventosPorMedidor(bundle.eventos, expandedId).filter(isInstalacao)
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

  const byStatus = useMemo(() => {
    if (!bundle) return new Map<string, string>()
    const m = new Map<string, string>()
    for (const r of medidoresSinteticos(bundle)) m.set(r.id, r.status)
    for (const r of analisadoresSinteticos(bundle)) m.set(r.id, r.status)
    return m
  }, [bundle])

  if (loadState !== 'ready' || !bundle) {
    return <div className="py-20 text-center text-xpe-muted">Carregando…</div>
  }

  return (
    <div className="space-y-5">
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
                            Instalações registradas (planilha completa)
                          </p>
                          {historicoInstalacoes.length === 0 ? (
                            <p>Nenhuma instalação neste ID.</p>
                          ) : (
                            <ul className="grid gap-1 sm:grid-cols-2">
                              {historicoInstalacoes.map((e, i) => (
                                <li key={i} className="text-xs">
                                  <span className="text-xpe-neon-dim">{e.data.slice(0, 10)}</span> ·{' '}
                                  {e.localizacao ?? '—'} · {e.cliente ?? '—'}
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
                            Instalações registradas (planilha completa)
                          </p>
                          {historicoInstalacoes.length === 0 ? (
                            <p>Nenhuma instalação neste ID.</p>
                          ) : (
                            <ul className="grid gap-1 sm:grid-cols-2">
                              {historicoInstalacoes.map((e, i) => (
                                <li key={i} className="text-xs">
                                  <span className="text-xpe-neon-dim">{e.data.slice(0, 10)}</span> ·{' '}
                                  {e.localizacao ?? '—'} · {e.cliente ?? '—'}
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
            <ul className="space-y-2 border-l border-xpe-border pl-4">
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
          </div>
        )}
      </Card>
    </div>
  )
}
