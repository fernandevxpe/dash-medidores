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

const SLIDE_COUNT = 11

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
  const [slide, setSlide] = useState(0)
  const [intervalSec, setIntervalSec] = useState(() => {
    const n = Number(localStorage.getItem(LS_INTERVAL))
    return Number.isFinite(n) && n >= 3 && n <= 120 ? n : 10
  })
  const [running, setRunning] = useState(true)
  const [diasExtras, setDiasExtras] = useState(loadExtras)
  const [calMode, setCalMode] = useState<CalendarViewMode>('junto')
  const [selDay, setSelDay] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

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
    if (!running) return
    const t = window.setInterval(() => {
      setSlide((s) => (s + 1) % SLIDE_COUNT)
    }, intervalSec * 1000)
    return () => window.clearInterval(t)
  }, [running, intervalSec])

  const goFs = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    if (!document.fullscreenElement) void el.requestFullscreen().catch(() => {})
    else void document.exitFullscreen()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setRunning(false)
      if (e.key === 'ArrowRight') setSlide((s) => (s + 1) % SLIDE_COUNT)
      if (e.key === 'ArrowLeft') setSlide((s) => (s - 1 + SLIDE_COUNT) % SLIDE_COUNT)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
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

  const slideWrap = 'relative flex min-h-[calc(100vh-11rem)] flex-col overflow-y-auto'

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-xpe-bg bg-[radial-gradient(ellipse_at_top,_rgba(168,85,247,0.22),_transparent_55%)] text-white"
    >
      <div className="mx-auto flex max-w-[1920px] flex-col px-3 py-3 sm:px-6 sm:py-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display text-xl font-bold sm:text-3xl">
              Medidores <span className="text-xpe-neon">XPE</span>
              <span className="text-zinc-500"> · Painel TV</span>
            </p>
            <p className="text-sm text-zinc-500">
              Slide {slide + 1}/{SLIDE_COUNT} · ← → · Esc pausa · intervalo ideal 10–15s
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-zinc-400">
              Intervalo (s)
              <input
                type="number"
                min={3}
                max={120}
                value={intervalSec}
                onChange={(e) => setIntervalSec(Number(e.target.value) || 10)}
                className="w-16 rounded-lg border border-xpe-border bg-xpe-surface px-2 py-1 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={() => setRunning((r) => !r)}
              className="rounded-full border border-xpe-border px-4 py-2 text-xs font-semibold hover:bg-white/5 sm:text-sm"
            >
              {running ? 'Pausar' : 'Retomar'}
            </button>
            <button
              type="button"
              onClick={goFs}
              className="rounded-full bg-xpe-purple/30 px-4 py-2 text-xs font-semibold text-xpe-neon ring-1 ring-xpe-neon/30 hover:bg-xpe-purple/45 sm:text-sm"
            >
              Tela cheia
            </button>
            <Link
              to="/"
              className="rounded-full border border-white/10 px-4 py-2 text-xs text-zinc-300 hover:bg-white/5 sm:text-sm"
            >
              Sair
            </Link>
          </div>
        </div>

        <div className="relative min-h-[calc(100vh-6rem)] rounded-3xl border border-xpe-border bg-xpe-surface/55 p-3 shadow-[0_0_100px_-30px_rgba(57,255,156,0.28)] sm:p-6">
          <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-xpe-purple/10 via-transparent to-xpe-neon/5" />

          {slide === 0 && (
            <div className={`${slideWrap} grid grid-cols-2 gap-4 lg:grid-cols-4`}>
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
          )}

          {slide === 1 && (
            <div className={`${slideWrap} grid gap-8 lg:grid-cols-2`}>
              <div>
                <h3 className="mb-4 font-display text-2xl text-white">Medidores · frota</h3>
                <SegmentedStatusBar segments={medidorSeg} />
              </div>
              <div>
                <h3 className="mb-4 font-display text-2xl text-white">Analisadores · catálogo</h3>
                <SegmentedStatusBar segments={analSeg} />
              </div>
            </div>
          )}

          {slide === 2 && (
            <div className={slideWrap}>
              <h3 className="mb-4 font-display text-2xl text-white">Volume mensal · instalações × desinstalações</h3>
              <div className="h-[min(480px,52vh)] min-h-[280px]">
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
          )}

          {slide === 3 && (
            <div className={slideWrap}>
              <h3 className="mb-2 font-display text-2xl text-white">Calendário operacional</h3>
              <CalendarOperational
                eventos={bundle.eventos}
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
          )}

          {slide === 4 && (
            <div className={slideWrap}>
              <h3 className="mb-4 font-display text-2xl text-white">Previsões de desinstalação (ciclos abertos)</h3>
              <div className="max-h-[72vh] overflow-y-auto rounded-2xl border border-white/10">
                <table className="w-full text-left text-base">
                  <thead className="sticky top-0 bg-xpe-bg/95 text-sm uppercase tracking-wider text-xpe-muted">
                    <tr>
                      <th className="p-3">Data</th>
                      <th className="p-3">Cliente</th>
                      <th className="p-3">Local</th>
                      <th className="p-3">ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prevList.slice(0, 24).map((p, i) => (
                      <tr key={i} className="border-t border-white/5 text-zinc-200">
                        <td className="p-3 font-medium text-amber-200">
                          {format(new Date(p.dataPrevista + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                        </td>
                        <td className="p-3">{p.cliente ?? '—'}</td>
                        <td className="p-3">{p.localizacao ?? '—'}</td>
                        <td className="p-3 font-mono text-sm text-xpe-neon-dim">{p.idMedidor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {slide === 5 && (
            <div className={slideWrap}>
              <h3 className="mb-4 font-display text-2xl text-white">Instalações e desinstalações · por dia</h3>
              <div className="h-[min(480px,55vh)]">
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
          )}

          {slide === 6 && (
            <div className={slideWrap}>
              <h3 className="mb-4 font-display text-2xl text-white">Por semana ISO</h3>
              <div className="h-[min(480px,55vh)]">
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
          )}

          {slide === 7 && (
            <div className={slideWrap}>
              <h3 className="mb-4 font-display text-2xl text-white">Instalações · semana do mês</h3>
              <div className="h-[min(420px,50vh)]">
                <BarVolume
                  data={semMes.map((x) => ({ label: x.semanaMes, total: x.total }))}
                  dataKey="total"
                  xKey="label"
                  color="#38bdf8"
                />
              </div>
            </div>
          )}

          {slide === 8 && (
            <div className={`${slideWrap} gap-6 lg:grid lg:grid-cols-2`}>
              <div>
                <h3 className="mb-4 font-display text-2xl text-white">Prazo de medição (~{prazo.diasPadrao}d)</h3>
                <ul className="space-y-4 text-lg text-zinc-300">
                  <li className="rounded-xl border border-white/10 bg-black/20 p-4">
                    Ciclos abertos: <strong className="text-white">{prazo.totalCiclosAbertos}</strong> · Dentro prazo:{' '}
                    {prazo.ciclosAtivosDentro} · <span className="text-amber-200">Fora / pendente desinst.: {prazo.ciclosAtivosFora}</span>
                  </li>
                  <li className="rounded-xl border border-white/10 bg-black/20 p-4">
                    Concluídos: dentro ≤{prazo.diasPadrao}d: {prazo.ciclosConcluidosDentro} · fora: {prazo.ciclosConcluidosFora}
                  </li>
                  <li className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                    Média dias (ciclo concluído):{' '}
                    <strong className="text-emerald-200">{prazo.mediaDiasCicloConcluido.toFixed(1)}</strong>
                  </li>
                </ul>
              </div>
              <div className="flex min-h-[320px] flex-col">
                <h3 className="mb-4 font-display text-2xl text-white">Concluídos · prazo por mês</h3>
                <div className="min-h-[280px] flex-1">
                  <BarPrazoCiclos data={prazoMes} diasPrazo={prazo.diasPadrao} />
                </div>
              </div>
            </div>
          )}

          {slide === 9 && (
            <div className={`${slideWrap} gap-6 lg:grid lg:grid-cols-2`}>
              <div>
                <h3 className="mb-4 font-display text-2xl text-white">Últimas instalações</h3>
                <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
                  {ultimas.map((u, i) => (
                    <div key={i} className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-base">
                      <p className="font-mono text-sm text-xpe-neon">{u.idMedidor}</p>
                      <p className="text-zinc-200">{u.cliente ?? '—'}</p>
                      <p className="text-sm text-zinc-500">
                        {u.data.slice(0, 10)} · prev. remoção {u.previsaoRemocao.slice(0, 10)} (dia útil)
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="mb-4 font-display text-2xl text-white">Últimas desinstalações (real)</h3>
                <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1 text-base">
                  {ultDes.map((u, i) => (
                    <div key={i} className="rounded-xl border border-xpe-purple/20 bg-xpe-purple/5 px-3 py-2">
                      <span className="text-xpe-purple">{u.data.slice(0, 10)}</span> · {u.cliente ?? '—'} ·{' '}
                      {u.localizacao ?? '—'} · <span className="font-mono text-sm">{u.idMedidor}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {slide === 10 && (
            <div className={`${slideWrap} items-center justify-center text-center`}>
              <p className="font-display text-3xl font-bold text-white sm:text-5xl">
                Painel sincronizado com a <span className="text-xpe-neon">planilha exportada</span>
              </p>
              <p className="mt-6 max-w-2xl text-lg text-zinc-400">
                Calendário com previsão em dia útil (+dias opcional) · detalhes ao clicar no dia · apresentação
                pensada para TV em tela cheia.
              </p>
              <p className="mt-10 text-sm text-zinc-600">Gerado em {bundle.geradoEm}</p>
            </div>
          )}

          <div className="absolute bottom-4 left-1/2 flex max-w-[90vw] -translate-x-1/2 flex-wrap justify-center gap-1.5">
            {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Slide ${i + 1}`}
                onClick={() => setSlide(i)}
                className={`h-2 w-2 rounded-full transition ${
                  i === slide ? 'w-8 bg-xpe-neon shadow-[0_0_12px_#39ff9c]' : 'bg-zinc-600 hover:bg-zinc-400'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
