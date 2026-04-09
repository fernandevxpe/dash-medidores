import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale/pt-BR'
import { Link } from 'react-router-dom'
import { useDashboardData } from '../context/DashboardDataContext'
import { KpiTile } from '../components/ui/KpiTile'
import { SegmentedStatusBar } from '../components/charts/SegmentedStatusBar'
import { BarVolumeDual } from '../components/charts/BarVolumeDual'
import { BarPrazoCiclos } from '../components/charts/BarPrazoCiclos'
import { BarVolume } from '../components/charts/BarVolume'
import {
  CalendarOperational,
  type CalendarViewMode,
} from '../components/calendar/CalendarOperational'
import {
  analyzerDonutSlices,
  bucketDayInstalacaoDesinstalacao,
  bucketIsoWeekInstalacaoDesinstalacao,
  bucketMesCiclosConcluidosPrazo,
  bucketMonthInstalacaoDesinstalacao,
  bucketWeekOfMonth,
  calendarFleetContext,
  capacityMetrics,
  medidorStatusDistribuicao,
  previsoesDesinstalacaoCiclosAbertos,
  resumoPrazoMedicao,
  trafficForCapacity,
  trafficForUnknownShare,
  unknownLocationShare,
  ultimasDesinstalacoes,
  ultimasInstalacoes,
} from '../analytics/metrics'

const LS_INTERVAL = 'xpe-presentation-interval-sec'
const EXTRA_LS = 'xpe-previsao-dias-extras'
const LS_SLIDES_ENABLED = 'xpe-presentation-slides-enabled'

type PresentationSlideId =
  | 'kpis'
  | 'status-bars'
  | 'volume-mes'
  | 'calendario'
  | 'previsoes'
  | 'volume-dia'
  | 'semana-iso'
  | 'semana-mes'
  | 'prazo'
  | 'ultimas'
  | 'encerramento'

const PRESENTATION_SLIDES: {
  id: PresentationSlideId
  label: string
  group: string
  /** Padrão “gestão global” (~8 slides principais). */
  defaultOn: boolean
}[] = [
  { id: 'kpis', label: 'KPIs · frota, capacidade e qualidade de local', group: 'Visão geral', defaultOn: true },
  { id: 'status-bars', label: 'Medidores e analisadores · barras de status', group: 'Visão geral', defaultOn: true },
  { id: 'volume-mes', label: 'Volume mensal · instalações × desinstalações', group: 'Volume temporal', defaultOn: true },
  { id: 'calendario', label: 'Calendário operacional', group: 'Operação', defaultOn: true },
  { id: 'previsoes', label: 'Previsões de desinstalação (ciclos abertos)', group: 'Operação', defaultOn: true },
  { id: 'volume-dia', label: 'Instalações e desinstalações · por dia', group: 'Volume temporal', defaultOn: true },
  { id: 'semana-iso', label: 'Por semana ISO', group: 'Volume temporal', defaultOn: false },
  { id: 'semana-mes', label: 'Instalações · semana do mês (S1–S5)', group: 'Volume temporal', defaultOn: false },
  { id: 'prazo', label: 'Prazo de medição e concluídos por mês', group: 'Prazo & ciclos', defaultOn: true },
  { id: 'ultimas', label: 'Últimas instalações e desinstalações', group: 'Operação recente', defaultOn: true },
  { id: 'encerramento', label: 'Encerramento · planilha e TV', group: 'Outros', defaultOn: false },
]

type PresentationSlideRow = (typeof PRESENTATION_SLIDES)[number]

const ALL_SLIDE_IDS = new Set(PRESENTATION_SLIDES.map((s) => s.id))

const PRESENTATION_SLIDE_GROUPS: [string, PresentationSlideRow[]][] = (() => {
  const g = new Map<string, PresentationSlideRow[]>()
  for (const s of PRESENTATION_SLIDES) {
    if (!g.has(s.group)) g.set(s.group, [])
    g.get(s.group)!.push(s)
  }
  return [...g.entries()]
})()

function defaultEnabledIds(): Set<PresentationSlideId> {
  return new Set(PRESENTATION_SLIDES.filter((s) => s.defaultOn).map((s) => s.id))
}

function loadEnabledIds(): Set<PresentationSlideId> {
  try {
    const raw = localStorage.getItem(LS_SLIDES_ENABLED)
    if (raw) {
      const arr = JSON.parse(raw) as unknown
      if (Array.isArray(arr) && arr.length > 0) {
        const next = new Set<PresentationSlideId>()
        for (const x of arr) {
          if (typeof x === 'string' && ALL_SLIDE_IDS.has(x as PresentationSlideId)) {
            next.add(x as PresentationSlideId)
          }
        }
        if (next.size > 0) return next
      }
    }
  } catch {
    /* ignore */
  }
  return defaultEnabledIds()
}

function persistEnabledIds(ids: Set<PresentationSlideId>) {
  try {
    localStorage.setItem(LS_SLIDES_ENABLED, JSON.stringify([...ids]))
  } catch {
    /* ignore */
  }
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

export function PresentationPage() {
  const { bundle, loadState, eventosFiltrados } = useDashboardData()
  const [slideIdx, setSlideIdx] = useState(0)
  const [enabledIds, setEnabledIds] = useState<Set<PresentationSlideId>>(loadEnabledIds)
  const [menuOpen, setMenuOpen] = useState(true)
  const [intervalSec, setIntervalSec] = useState(() => {
    const n = Number(localStorage.getItem(LS_INTERVAL))
    return Number.isFinite(n) && n >= 3 && n <= 120 ? n : 10
  })
  const [running, setRunning] = useState(true)
  const [diasExtras, setDiasExtras] = useState(loadExtras)
  const [calMode, setCalMode] = useState<CalendarViewMode>('junto')
  const [selDay, setSelDay] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const enabledOrder = useMemo(
    () => PRESENTATION_SLIDES.filter((s) => enabledIds.has(s.id)),
    [enabledIds],
  )

  const nSlides = Math.max(1, enabledOrder.length)
  const safeSlideIdx = enabledOrder.length === 0 ? 0 : Math.min(slideIdx, enabledOrder.length - 1)
  const activeSlide = enabledOrder[safeSlideIdx] ?? enabledOrder[0]
  const activeId = activeSlide?.id ?? 'kpis'

  const persistExtras = useCallback((n: number) => {
    const v = Math.max(0, Math.min(60, n))
    setDiasExtras(v)
    try {
      localStorage.setItem(EXTRA_LS, String(v))
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(LS_INTERVAL, String(intervalSec))
  }, [intervalSec])

  useEffect(() => {
    if (!running || enabledOrder.length <= 0) return
    const n = enabledOrder.length
    const t = window.setInterval(() => {
      setSlideIdx((s) => {
        const cur = Math.min(s, n - 1)
        return (cur + 1) % n
      })
    }, intervalSec * 1000)
    return () => window.clearInterval(t)
  }, [running, intervalSec, enabledOrder.length])

  const goFs = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    if (!document.fullscreenElement) void el.requestFullscreen().catch(() => {})
    else void document.exitFullscreen()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = enabledOrder.length
      if (n <= 0) return
      if (e.key === 'Escape') setRunning(false)
      if (e.key === 'ArrowRight')
        setSlideIdx((s) => {
          const cur = Math.min(s, n - 1)
          return (cur + 1) % n
        })
      if (e.key === 'ArrowLeft')
        setSlideIdx((s) => {
          const cur = Math.min(s, n - 1)
          return (cur - 1 + n) % n
        })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabledOrder.length])

  const toggleSlide = useCallback((id: PresentationSlideId) => {
    setEnabledIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        if (next.size === 0) next.add('kpis')
      } else {
        next.add(id)
      }
      persistEnabledIds(next)
      return next
    })
  }, [])

  const restoreDefaults = useCallback(() => {
    const d = defaultEnabledIds()
    setEnabledIds(d)
    persistEnabledIds(d)
    setSlideIdx(0)
  }, [])

  const selectAll = useCallback(() => {
    const all = new Set(PRESENTATION_SLIDES.map((s) => s.id))
    setEnabledIds(all)
    persistEnabledIds(all)
    setSlideIdx(0)
  }, [])

  const d = useMemo(() => {
    if (!bundle) return null
    const cap = capacityMetrics(bundle)
    const unk = unknownLocationShare(eventosFiltrados)
    const md = medidorStatusDistribuicao(bundle)
    const medidorSeg = [
      { key: 'inst', label: 'Em uso', value: md.instalado, color: '#39ff9c' },
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
    const semMes = bucketWeekOfMonth(eventosFiltrados)
    const ultimas = ultimasInstalacoes(eventosFiltrados, 12, bundle.config.diasMedicaoPadrao)
    const ultDes = ultimasDesinstalacoes(eventosFiltrados, 14)
    const prazo = resumoPrazoMedicao(bundle)
    const prazoMes = bucketMesCiclosConcluidosPrazo(bundle)
    const hoje = format(new Date(), 'yyyy-MM-dd')
    const prevList = previsoesDesinstalacaoCiclosAbertos(
      bundle.eventos,
      bundle.config.diasMedicaoPadrao,
      diasExtras,
    ).filter((p) => p.dataPrevista >= hoje)
    return {
      cap,
      unk,
      medidorSeg,
      analSeg,
      mesDual,
      diaDual,
      semDual,
      semMes,
      ultimas,
      ultDes,
      prazo,
      prazoMes,
      prevList,
    }
  }, [bundle, eventosFiltrados, diasExtras])

  const calFleet = useMemo(
    () =>
      bundle
        ? calendarFleetContext(bundle)
        : { medidorIds: [] as string[], analisadorCanonIds: [] as string[] },
    [bundle],
  )

  if (loadState !== 'ready' || !bundle || !d) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-xpe-bg text-xpe-muted">
        Carregando apresentação…
      </div>
    )
  }

  const {
    cap,
    unk,
    medidorSeg,
    analSeg,
    mesDual,
    diaDual,
    semDual,
    semMes,
    ultimas,
    ultDes,
    prazo,
    prazoMes,
    prevList,
  } = d

  const slideWrap =
    'relative flex min-h-0 flex-1 flex-col overflow-y-auto 2xl:overflow-hidden'
  const chartBox =
    'min-h-[clamp(260px,48dvh,820px)] w-full max-h-[min(820px,58dvh)] flex-1 2xl:max-h-[min(900px,62dvh)]'
  const titleTv = 'mb-3 font-display text-[clamp(1.15rem,2.2vw,2.75rem)] font-semibold text-white lg:mb-4'

  const renderSlide = () => {
    switch (activeId) {
      case 'kpis':
        return (
          <div className={`${slideWrap} grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5 2xl:gap-6`}>
            <KpiTile label="Total medidores" value={cap.totalMedidores} />
            <KpiTile
              label="Medidores em campo"
              value={`${cap.instaladosCampo}`}
              traffic={trafficForCapacity(cap.pctCapacidadeMedidor)}
              foot={`${cap.instalados} uso + ${cap.manutencaoMedidores} manut. · ${cap.pctCapacidadeMedidor.toFixed(0)}% frota`}
            />
            <KpiTile
              label="Analisadores em campo"
              value={`${cap.analisadoresEmUso}/${cap.totalAnalisadoresCatalogo}`}
              traffic={trafficForCapacity(cap.pctCapacidadeAnalisador)}
              foot={`${cap.analisadoresLivres} livres`}
            />
            <KpiTile
              label="Qualidade local"
              value={`${unk.toFixed(0)}%`}
              traffic={trafficForUnknownShare(unk)}
              hint="Sem local / desconhecido"
            />
          </div>
        )
      case 'status-bars':
        return (
          <div className={`${slideWrap} grid gap-6 lg:grid-cols-2 lg:gap-10 2xl:gap-12`}>
            <div>
              <h3 className={titleTv}>Medidores · frota</h3>
              <SegmentedStatusBar segments={medidorSeg} />
            </div>
            <div>
              <h3 className={titleTv}>Analisadores · catálogo</h3>
              <SegmentedStatusBar segments={analSeg} />
            </div>
          </div>
        )
      case 'volume-mes':
        return (
          <div className={slideWrap}>
            <h3 className={titleTv}>Volume mensal · instalações × desinstalações</h3>
            <div className={chartBox}>
              <BarVolumeDual
                data={mesDual.map((row) => ({
                  label: row.mes,
                  instalacoes: row.instalacoes,
                  desinstalacoes: row.desinstalacoes,
                }))}
                xKey="label"
                keyInst="instalacoes"
                keyDes="desinstalacoes"
              />
            </div>
          </div>
        )
      case 'calendario':
        return (
          <div className={`${slideWrap} min-h-0`}>
            <h3 className={titleTv}>Calendário operacional</h3>
            <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-2 lg:p-4 2xl:p-5">
              <CalendarOperational
                eventos={bundle.eventos}
                fleet={{ medidorIds: calFleet.medidorIds, analisadorCanonIds: calFleet.analisadorCanonIds }}
                diasMedicao={bundle.config.diasMedicaoPadrao}
                diasExtras={diasExtras}
                onDiasExtrasChange={persistExtras}
                mode={calMode}
                onModeChange={setCalMode}
                variant="presentation"
                selectedDayKey={selDay}
                onSelectDay={setSelDay}
              />
            </div>
          </div>
        )
      case 'previsoes':
        return (
          <div className={slideWrap}>
            <h3 className={titleTv}>Previsões de desinstalação (ciclos abertos)</h3>
            <div className="max-h-[min(72dvh,920px)] overflow-y-auto rounded-2xl border border-white/10">
              <table className="w-full text-left text-[clamp(0.8rem,1.2vw,1.05rem)]">
                <thead className="sticky top-0 bg-xpe-bg/95 text-[clamp(0.65rem,1vw,0.85rem)] uppercase tracking-wider text-xpe-muted">
                  <tr>
                    <th className="p-2 lg:p-3">Data</th>
                    <th className="p-2 lg:p-3">Cliente</th>
                    <th className="p-2 lg:p-3">Local</th>
                    <th className="p-2 lg:p-3">ID</th>
                  </tr>
                </thead>
                <tbody>
                  {prevList.slice(0, 28).map((p, i) => (
                    <tr key={i} className="border-t border-white/5 text-zinc-200">
                      <td className="p-2 font-medium text-amber-200 lg:p-3">
                        {format(new Date(p.dataPrevista + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                      </td>
                      <td className="p-2 lg:p-3">{p.cliente ?? '—'}</td>
                      <td className="p-2 lg:p-3">{p.localizacao ?? '—'}</td>
                      <td className="p-2 font-mono text-sm text-xpe-neon-dim lg:p-3">{p.idMedidor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      case 'volume-dia':
        return (
          <div className={slideWrap}>
            <h3 className={titleTv}>Instalações e desinstalações · por dia</h3>
            <div className={chartBox}>
              <BarVolumeDual
                data={diaDual.map((row) => ({
                  label: row.dia,
                  instalacoes: row.instalacoes,
                  desinstalacoes: row.desinstalacoes,
                }))}
                xKey="label"
                keyInst="instalacoes"
                keyDes="desinstalacoes"
              />
            </div>
          </div>
        )
      case 'semana-iso':
        return (
          <div className={slideWrap}>
            <h3 className={titleTv}>Por semana ISO</h3>
            <div className={chartBox}>
              <BarVolumeDual
                data={semDual.map((row) => ({
                  label: row.semana,
                  instalacoes: row.instalacoes,
                  desinstalacoes: row.desinstalacoes,
                }))}
                xKey="label"
                keyInst="instalacoes"
                keyDes="desinstalacoes"
              />
            </div>
          </div>
        )
      case 'semana-mes':
        return (
          <div className={slideWrap}>
            <h3 className={titleTv}>Instalações · semana do mês</h3>
            <div className={chartBox}>
              <BarVolume
                data={semMes.map((x) => ({ label: x.semanaMes, total: x.total }))}
                dataKey="total"
                xKey="label"
                color="#38bdf8"
              />
            </div>
          </div>
        )
      case 'prazo':
        return (
          <div className={`${slideWrap} gap-6 lg:grid lg:grid-cols-2 lg:gap-8 2xl:gap-10`}>
            <div>
              <h3 className={titleTv}>Prazo de medição (~{prazo.diasPadrao}d)</h3>
              <ul className="space-y-3 text-[clamp(0.85rem,1.25vw,1.15rem)] text-zinc-300 lg:space-y-4">
                <li className="rounded-xl border border-white/10 bg-black/20 p-3 lg:p-4">
                  Ciclos abertos: <strong className="text-white">{prazo.totalCiclosAbertos}</strong> · Dentro prazo:{' '}
                  {prazo.ciclosAtivosDentro} ·{' '}
                  <span className="text-amber-200">Fora / pendente desinst.: {prazo.ciclosAtivosFora}</span>
                </li>
                <li className="rounded-xl border border-white/10 bg-black/20 p-3 lg:p-4">
                  Concluídos: dentro ≤{prazo.diasPadrao}d: {prazo.ciclosConcluidosDentro} · fora:{' '}
                  {prazo.ciclosConcluidosFora}
                </li>
                <li className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 lg:p-4">
                  Média dias (ciclo concluído):{' '}
                  <strong className="text-emerald-200">{prazo.mediaDiasCicloConcluido.toFixed(1)}</strong>
                </li>
              </ul>
            </div>
            <div className="flex min-h-[280px] flex-col lg:min-h-[320px]">
              <h3 className={titleTv}>Concluídos · prazo por mês</h3>
              <div className="min-h-[240px] flex-1 lg:min-h-[280px]">
                <BarPrazoCiclos data={prazoMes} diasPrazo={prazo.diasPadrao} />
              </div>
            </div>
          </div>
        )
      case 'ultimas':
        return (
          <div className={`${slideWrap} gap-6 lg:grid lg:grid-cols-2 lg:gap-8`}>
            <div>
              <h3 className={titleTv}>Últimas instalações</h3>
              <div className="max-h-[min(70dvh,880px)] space-y-2 overflow-y-auto pr-1 lg:space-y-3">
                {ultimas.map((u, i) => (
                  <div key={i} className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2 lg:px-4 lg:py-3">
                    <p className="font-mono text-[clamp(0.75rem,1.1vw,0.95rem)] text-xpe-neon">{u.idMedidor}</p>
                    <p className="text-zinc-200">{u.cliente ?? '—'}</p>
                    <p className="text-sm text-zinc-500">
                      {u.data.slice(0, 10)} · prev. remoção {u.previsaoRemocao.slice(0, 10)} (dia útil)
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className={titleTv}>Últimas desinstalações (real)</h3>
              <div className="max-h-[min(70dvh,880px)] space-y-2 overflow-y-auto pr-1 text-[clamp(0.85rem,1.15vw,1rem)]">
                {ultDes.map((u, i) => (
                  <div key={i} className="rounded-xl border border-xpe-purple/20 bg-xpe-purple/5 px-3 py-2">
                    <span className="text-xpe-purple">{u.data.slice(0, 10)}</span> · {u.cliente ?? '—'} ·{' '}
                    {u.localizacao ?? '—'} · <span className="font-mono text-sm">{u.idMedidor}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      case 'encerramento':
        return (
          <div className={`${slideWrap} items-center justify-center px-4 text-center`}>
            <p className="font-display text-[clamp(1.5rem,4vw,3.5rem)] font-bold text-white">
              Painel sincronizado com a <span className="text-xpe-neon">planilha exportada</span>
            </p>
            <p className="mt-6 max-w-3xl text-[clamp(0.95rem,1.5vw,1.25rem)] text-zinc-400">
              Calendário com previsão em dia útil (+dias opcional) · detalhes ao clicar no dia · apresentação pensada para
              TV em tela cheia (2K/4K).
            </p>
            <p className="mt-10 text-sm text-zinc-600">Gerado em {bundle.geradoEm}</p>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div
      ref={containerRef}
      className="min-h-[100dvh] bg-xpe-bg bg-[radial-gradient(ellipse_at_top,_rgba(168,85,247,0.22),_transparent_55%)] text-white"
    >
      <div className="mx-auto flex w-full max-w-[min(100%,2560px)] flex-col px-[clamp(0.75rem,2vw,2.5rem)] py-[clamp(0.5rem,1.5vw,1.25rem)]">
        <div className="mb-3 flex flex-col gap-3 xl:flex-row xl:flex-wrap xl:items-start xl:justify-between 2xl:gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-display text-[clamp(1.1rem,2.5vw,2.25rem)] font-bold">
              Medidores <span className="text-xpe-neon">XPE</span>
              <span className="text-zinc-500"> · Painel TV</span>
            </p>
            <p className="mt-1 text-[clamp(0.7rem,1.1vw,0.95rem)] text-zinc-500">
              Slide {safeSlideIdx + 1}/{nSlides}: <span className="text-zinc-300">{activeSlide?.label}</span> · ← → · Esc
              pausa · intervalo 10–15s recomendado
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-[clamp(0.65rem,1vw,0.8rem)] text-zinc-400">
              Intervalo (s)
              <input
                type="number"
                min={3}
                max={120}
                value={intervalSec}
                onChange={(e) => setIntervalSec(Number(e.target.value) || 10)}
                className="w-14 rounded-lg border border-xpe-border bg-xpe-surface px-2 py-1.5 text-sm 2xl:w-16 2xl:py-2"
              />
            </label>
            <button
              type="button"
              onClick={() => setRunning((r) => !r)}
              className="rounded-full border border-xpe-border px-3 py-2 text-[clamp(0.65rem,1vw,0.85rem)] font-semibold hover:bg-white/5 sm:px-4 2xl:px-5 2xl:text-sm"
            >
              {running ? 'Pausar' : 'Retomar'}
            </button>
            <button
              type="button"
              onClick={goFs}
              className="rounded-full bg-xpe-purple/30 px-3 py-2 text-[clamp(0.65rem,1vw,0.85rem)] font-semibold text-xpe-neon ring-1 ring-xpe-neon/30 hover:bg-xpe-purple/45 sm:px-4 2xl:px-5 2xl:text-sm"
            >
              Tela cheia
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="rounded-full border border-white/15 px-3 py-2 text-[clamp(0.65rem,1vw,0.85rem)] text-zinc-200 hover:bg-white/5 2xl:px-4 2xl:text-sm"
            >
              {menuOpen ? 'Ocultar menu de slides' : 'Mostrar menu de slides'}
            </button>
            <Link
              to="/"
              className="rounded-full border border-white/10 px-3 py-2 text-[clamp(0.65rem,1vw,0.85rem)] text-zinc-300 hover:bg-white/5 2xl:px-4 2xl:text-sm"
            >
              Sair
            </Link>
          </div>
        </div>

        {menuOpen && (
          <details
            open
            className="mb-3 rounded-2xl border border-xpe-border/80 bg-xpe-surface/40 p-3 backdrop-blur-sm lg:p-4 2xl:p-5"
          >
            <summary className="cursor-pointer list-none font-display text-sm font-semibold text-white lg:text-base 2xl:text-lg">
              Slides da apresentação — marque o que entra na rotação (padrão: ~8 visões de gestão global)
            </summary>
            <p className="mt-2 text-[11px] text-zinc-500 lg:text-xs">
              A escolha fica guardada neste navegador. É preciso manter pelo menos um slide ativo.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 border-b border-white/10 pb-3">
              <button
                type="button"
                onClick={restoreDefaults}
                className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-100 hover:bg-amber-500/20"
              >
                Restaurar padrão gestão global
              </button>
              <button
                type="button"
                onClick={selectAll}
                className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5"
              >
                Selecionar todos
              </button>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 2xl:gap-5">
              {PRESENTATION_SLIDE_GROUPS.map(([groupName, slides]) => (
                <div key={groupName}>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-xpe-muted lg:text-xs">
                    {groupName}
                  </p>
                  <ul className="space-y-2">
                    {slides.map((s) => (
                      <li key={s.id}>
                        <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-transparent px-1 py-0.5 hover:border-white/10 hover:bg-white/[0.04]">
                          <input
                            type="checkbox"
                            checked={enabledIds.has(s.id)}
                            onChange={() => toggleSlide(s.id)}
                            className="mt-1 shrink-0 rounded border-xpe-border"
                          />
                          <span className="text-[11px] leading-snug text-zinc-200 lg:text-sm">{s.label}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </details>
        )}

        <div
          className="relative flex min-h-[min(88dvh,1400px)] flex-1 flex-col rounded-3xl border border-xpe-border bg-xpe-surface/55 p-[clamp(0.75rem,1.8vw,1.75rem)] shadow-[0_0_100px_-30px_rgba(57,255,156,0.28)] lg:min-h-[min(86dvh,1200px)] 2xl:min-h-[min(85dvh,1600px)] 2xl:p-8"
        >
          <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-xpe-purple/10 via-transparent to-xpe-neon/5" />

          <div className="relative z-[1] flex min-h-0 flex-1 flex-col">{renderSlide()}</div>

          <div className="relative z-[1] mt-4 flex max-w-full flex-wrap justify-center gap-1.5 pb-1 sm:gap-2">
            {enabledOrder.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={s.label}
                title={s.label}
                onClick={() => setSlideIdx(i)}
                className={`h-2 rounded-full transition sm:h-2.5 ${
                  i === safeSlideIdx
                    ? 'w-8 bg-xpe-neon shadow-[0_0_12px_#39ff9c] sm:w-10'
                    : 'w-2 bg-zinc-600 hover:bg-zinc-400 sm:w-2.5'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
