import { useMemo, useState } from 'react'
import { addDays, format } from 'date-fns'
import { ptBR } from 'date-fns/locale/pt-BR'
import { useDashboardData } from '../context/DashboardDataContext'
import { Card } from '../components/ui/Card'
import { CalendarOperational, type CalendarViewMode } from '../components/calendar/CalendarOperational'
import { previsoesDesinstalacaoCiclosAbertos } from '../analytics/metrics'

const MODE_LS = 'xpe-calendar-view-mode'
const EXTRA_LS = 'xpe-previsao-dias-extras'

const MODE_OPTIONS: { id: CalendarViewMode; label: string }[] = [
  { id: 'junto', label: 'Junto' },
  { id: 'medidores', label: 'Medidores' },
  { id: 'analisadores', label: 'Analisadores' },
]

function loadMode(): CalendarViewMode {
  try {
    const v = localStorage.getItem(MODE_LS) as CalendarViewMode | null
    if (v === 'junto' || v === 'medidores' || v === 'analisadores') return v
  } catch {
    /* ignore */
  }
  return 'junto'
}

function loadExtras(): number {
  try {
    const n = Number(localStorage.getItem(EXTRA_LS))
    if (Number.isFinite(n) && n >= 0 && n <= 60) return Math.floor(n)
  } catch {
    /* ignore */
  }
  return 0
}

export function CalendarPage() {
  const { bundle, loadState } = useDashboardData()
  const [mode, setMode] = useState<CalendarViewMode>(loadMode)
  const [diasExtras, setDiasExtras] = useState(loadExtras)
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null)
  const [filtroLista, setFiltroLista] = useState<'todos' | 'medidor' | 'analisador'>('todos')

  const setModePersist = (m: CalendarViewMode) => {
    setMode(m)
    try {
      localStorage.setItem(MODE_LS, m)
    } catch {
      /* ignore */
    }
  }

  const setExtrasPersist = (n: number) => {
    const v = Math.max(0, Math.min(60, n))
    setDiasExtras(v)
    try {
      localStorage.setItem(EXTRA_LS, String(v))
    } catch {
      /* ignore */
    }
  }

  const dias = bundle?.config.diasMedicaoPadrao ?? 8
  const eventos = bundle?.eventos ?? []

  const listaPrevisao = useMemo(() => {
    if (!bundle) return []
    const hoje = format(new Date(), 'yyyy-MM-dd')
    const limite = format(addDays(new Date(), 120), 'yyyy-MM-dd')
    return previsoesDesinstalacaoCiclosAbertos(eventos, dias, diasExtras)
      .filter((p) => p.dataPrevista >= hoje && p.dataPrevista <= limite)
      .filter((p) => {
        if (filtroLista === 'todos') return true
        if (filtroLista === 'medidor') return p.tipo === 'medidor'
        return p.tipo === 'analisador'
      })
  }, [bundle, eventos, dias, diasExtras, filtroLista])

  if (loadState !== 'ready' || !bundle) {
    return <div className="py-20 text-center text-xpe-muted">Carregando…</div>
  }

  return (
    <div className="space-y-5">
      <Card
        title="Calendário operacional"
        subtitle={`INSTALAÇÃO / DESINSTALAÇÃO / MANUTENÇÃO · previsão ${dias}d corridos + extra, ajustada ao dia útil`}
      >
        <CalendarOperational
          eventos={eventos}
          diasMedicao={dias}
          diasExtras={diasExtras}
          onDiasExtrasChange={setExtrasPersist}
          mode={mode}
          onModeChange={setModePersist}
          variant="page"
          selectedDayKey={selectedDayKey}
          onSelectDay={setSelectedDayKey}
        />
      </Card>

      <Card
        title="Próximas desinstalações (previstas)"
        subtitle={`Ciclos abertos · meta ${dias}d + ${diasExtras}d extra · fins de semana → segunda · até ~120 dias`}
        action={
          <div className="flex flex-wrap gap-1 rounded-full border border-xpe-border bg-xpe-bg/80 p-1">
            {(
              [
                { id: 'todos' as const, label: 'Todos' },
                { id: 'medidor' as const, label: 'Medidores' },
                { id: 'analisador' as const, label: 'Analisadores' },
              ]
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFiltroLista(opt.id)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  filtroLista === opt.id
                    ? 'bg-xpe-purple/35 text-xpe-neon ring-1 ring-xpe-neon/35'
                    : 'text-zinc-400 hover:bg-white/5'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-xpe-border text-[10px] uppercase tracking-wider text-xpe-muted">
                <th className="pb-2 pr-3">Data prevista</th>
                <th className="pb-2 pr-3">Cliente</th>
                <th className="pb-2 pr-3">Local</th>
                <th className="pb-2 pr-3">ID equipamento</th>
                <th className="pb-2">Instalação</th>
              </tr>
            </thead>
            <tbody>
              {listaPrevisao.slice(0, 80).map((p, i) => (
                <tr key={`${p.idMedidor}-${p.dataPrevista}-${i}`} className="border-b border-white/5 text-zinc-300">
                  <td className="py-2 pr-3 whitespace-nowrap font-medium text-amber-200">
                    {format(new Date(p.dataPrevista + 'T12:00:00'), 'dd/MM/yyyy (EEE)', { locale: ptBR })}
                  </td>
                  <td className="py-2 pr-3">{p.cliente ?? '—'}</td>
                  <td className="py-2 pr-3">{p.localizacao ?? '—'}</td>
                  <td className="py-2 pr-3 font-mono text-xs text-xpe-neon-dim">{p.idMedidor}</td>
                  <td className="py-2 text-xs text-zinc-500">{p.dataInstalacao.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {listaPrevisao.length === 0 && (
          <p className="py-6 text-center text-sm text-zinc-500">
            Nenhuma previsão no intervalo com o filtro atual.
          </p>
        )}
        <p className="mt-3 text-center text-[11px] text-zinc-600">
          Legenda visual: {MODE_OPTIONS.map((m) => m.label).join(' · ')} no calendário. Pontos verdes/roxos = um por
          evento na data.
        </p>
      </Card>
    </div>
  )
}
