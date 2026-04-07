import { useMemo, useState } from 'react'
import { useDashboardData } from '../context/DashboardDataContext'
import { Card } from '../components/ui/Card'
import { BarVolume } from '../components/charts/BarVolume'
import {
  clienteEstaAtivo,
  detalheInstalacoesAtivasPorCliente,
  instalacoesPorCliente,
  isInstalacao,
  medidoresDistintosPorCliente,
  periodoMedicaoPorCliente,
} from '../analytics/metrics'

export function ClientsPage() {
  const { bundle, eventosFiltrados, loadState } = useDashboardData()
  const [q, setQ] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const { porQtd, periodos, comp } = useMemo(() => {
    const porQtd = instalacoesPorCliente(eventosFiltrados)
    const periodos = periodoMedicaoPorCliente(eventosFiltrados)
    const comp = medidoresDistintosPorCliente(eventosFiltrados)
    return { porQtd, periodos, comp }
  }, [eventosFiltrados])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return { porQtd, periodos, comp }
    return {
      porQtd: porQtd.filter((x) => x.cliente.toLowerCase().includes(s)),
      periodos: periodos.filter((x) => x.cliente.toLowerCase().includes(s)),
      comp: comp.filter((x) => x.cliente.toLowerCase().includes(s)),
    }
  }, [q, porQtd, periodos, comp])

  const ativosDetalhe = useMemo(() => {
    if (!bundle || !expanded) return []
    return detalheInstalacoesAtivasPorCliente(bundle.eventos, expanded)
  }, [bundle, expanded])

  const historicoInstalacoesCliente = useMemo(() => {
    if (!expanded) return []
    const alvo = (expanded.trim() || '(sem cliente)').toLowerCase()
    return eventosFiltrados
      .filter(
        (e) =>
          isInstalacao(e) && (e.cliente?.trim() || '(sem cliente)').toLowerCase() === alvo,
      )
      .sort((a, b) => b.data.localeCompare(a.data))
      .slice(0, 40)
  }, [eventosFiltrados, expanded])

  if (loadState !== 'ready' || !bundle) {
    return <div className="py-20 text-center text-xpe-muted">Carregando…</div>
  }

  const barData = porQtd.slice(0, 16).map((x) => {
    const ativo = clienteEstaAtivo(bundle.eventos, x.cliente)
    return {
      nome: x.cliente.slice(0, 18),
      total: x.total,
      fill: ativo ? '#22c55e' : '#a855f7',
    }
  })

  return (
    <div className="space-y-5">
      <Card title="Análise por cliente" subtitle="Barras: verde = slot ativo hoje · roxo = apenas histórico no período">
        <input
          type="search"
          placeholder="Buscar cliente (obra)…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="mb-4 w-full max-w-md rounded-xl border border-xpe-border bg-xpe-bg px-4 py-2 text-sm text-white placeholder:text-zinc-500"
        />
        <BarVolume data={barData} dataKey="total" xKey="nome" color="#a855f7" />
        <p className="mt-2 text-center text-[11px] text-zinc-500">
          Cores por estado global (histórico completo), não só pelo filtro.
        </p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Instalações por cliente" subtitle="Clique no cliente para ver onde há equipamento em campo">
          <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
            {filtered.porQtd.map((row) => {
              const ativo = clienteEstaAtivo(bundle.eventos, row.cliente)
              const open = expanded === row.cliente
              return (
                <div key={row.cliente}>
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : row.cliente)}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition ${
                      ativo
                        ? 'border-emerald-500/35 bg-emerald-500/10 hover:bg-emerald-500/15'
                        : 'border-purple-500/25 bg-purple-500/5 hover:bg-purple-500/10'
                    } ${open ? 'ring-1 ring-xpe-purple/40' : ''}`}
                  >
                    <span className="text-sm text-zinc-100">{row.cliente}</span>
                    <span className="flex items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                          ativo ? 'bg-emerald-500/30 text-emerald-200' : 'bg-purple-500/20 text-purple-200'
                        }`}
                      >
                        {ativo ? 'Ativo' : 'Passado'}
                      </span>
                      <span className="font-mono text-xpe-neon">{row.total}</span>
                    </span>
                  </button>
                </div>
              )
            })}
          </div>
        </Card>

        <Card title="Período de medição" subtitle="Primeira e última data com registro (período filtrado)">
          <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
            {filtered.periodos.map((row) => {
              const ativo = clienteEstaAtivo(bundle.eventos, row.cliente)
              return (
                <div
                  key={row.cliente}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    ativo ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-white/5 bg-white/[0.02]'
                  }`}
                >
                  <p className="font-medium text-white">{row.cliente}</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {row.inicio.slice(0, 10)} → {row.fim.slice(0, 10)} · {row.diasComRegistro} dias com evento
                  </p>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {expanded && (
        <Card
          title={`Detalhe: ${expanded}`}
          subtitle="Instalações ativas (replay hoje) e últimas instalações no período filtrado"
          action={
            <button
              type="button"
              className="text-xs text-zinc-400 hover:text-white"
              onClick={() => setExpanded(null)}
            >
              Fechar
            </button>
          }
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-xpe-muted">
                Em campo agora (ID + local)
              </p>
              {ativosDetalhe.length === 0 ? (
                <p className="text-sm text-zinc-500">Nenhum slot ativo para este cliente hoje.</p>
              ) : (
                <ul className="space-y-2">
                  {ativosDetalhe.map((s) => (
                    <li
                      key={s.slotKey}
                      className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-sm text-zinc-200"
                    >
                      <span className="font-mono text-xs text-xpe-neon-dim">{s.idMedidor}</span>
                      <span className="text-zinc-500"> · </span>
                      {s.localizacao}
                      {s.emManutencao && (
                        <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-200">
                          Manutenção
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-xpe-muted">
                Instalações recentes (período filtrado)
              </p>
              <ul className="max-h-[240px] space-y-1.5 overflow-y-auto pr-1 text-sm">
                {historicoInstalacoesCliente.map((e, i) => (
                  <li key={i} className="text-zinc-400">
                    <span className="text-xpe-purple">{e.data.slice(0, 10)}</span>{' '}
                    <span className="font-mono text-xs text-zinc-300">{e.idMedidor}</span> ·{' '}
                    {e.localizacao ?? '—'}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      <Card title="Composição · medidores (xp…) × analisadores" subtitle="Clique para expandir o mesmo painel de detalhe">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-xpe-border text-xs uppercase tracking-wider text-xpe-muted">
                <th className="pb-2">Cliente</th>
                <th className="pb-2">Medidores</th>
                <th className="pb-2">Analisadores</th>
                <th className="pb-2 w-24" />
              </tr>
            </thead>
            <tbody>
              {filtered.comp.map((row) => {
                const ativo = clienteEstaAtivo(bundle.eventos, row.cliente)
                return (
                  <tr
                    key={row.cliente}
                    className={`cursor-pointer border-b border-white/5 hover:bg-white/[0.04] ${
                      expanded === row.cliente ? 'bg-white/[0.06]' : ''
                    }`}
                    onClick={() => setExpanded(expanded === row.cliente ? null : row.cliente)}
                  >
                    <td className="py-2">
                      <span className={ativo ? 'text-emerald-300' : 'text-purple-300'}>{row.cliente}</span>
                    </td>
                    <td className="py-2 text-xpe-purple">{row.medidores}</td>
                    <td className="py-2 text-xpe-neon">{row.analisadores}</td>
                    <td className="py-2 text-right text-[11px] text-zinc-500">Ver ▾</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
