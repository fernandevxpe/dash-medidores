import { useEffect, useMemo, useState } from 'react'
import {
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
} from 'date-fns'
import { ptBR } from 'date-fns/locale/pt-BR'
import type { EventoRow } from '../../types/dashboard'
import {
  analisadorDistribuicaoFimDia,
  analisadoresDesinstalacaoPorDia,
  analisadoresInstalacaoPorDia,
  eventosDesinstalacaoNoDia,
  eventosInstalacaoNoDia,
  medidorDistribuicaoFimDia,
  medidoresDesinstalacaoPorDia,
  medidoresInstalacaoPorDia,
  type LinhaPrevisaoDesinstalacao,
  previsoesDesinstalacaoCiclosAbertos,
  tipoEquipamentoDe,
  utilizacaoOperacionalPercent,
} from '../../analytics/metrics'

export type CalendarViewMode = 'junto' | 'medidores' | 'analisadores'

const MODE_LABEL: Record<CalendarViewMode, string> = {
  junto: 'Junto',
  medidores: 'Medidores',
  analisadores: 'Analisadores',
}

function matchesCalendarMode(e: EventoRow, mode: CalendarViewMode): boolean {
  const t = tipoEquipamentoDe(e)
  if (mode === 'junto') return true
  if (mode === 'medidores') return t === 'medidor'
  if (mode === 'analisadores') return t === 'analisador'
  return true
}

function matchesPrevisaoTipo(tipo: LinhaPrevisaoDesinstalacao['tipo'], mode: CalendarViewMode): boolean {
  if (mode === 'junto') return true
  if (mode === 'medidores') return tipo === 'medidor'
  if (mode === 'analisadores') return tipo === 'analisador'
  return true
}

function classUtilizacaoCalendario(pct: number): string {
  if (pct > 90) return 'text-red-400'
  if (pct >= 75) return 'text-amber-300'
  return 'text-zinc-100'
}

function CalendarDotsInstDesPrev({
  nInst,
  nDes,
  prevMed,
  prevAn,
  mode,
  big,
}: {
  nInst: number
  nDes: number
  prevMed: number
  prevAn: number
  mode: CalendarViewMode
  big: boolean
}) {
  const dot = big
    ? 'h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5 lg:h-4 lg:w-4'
    : 'h-1.5 w-1.5 sm:h-2 sm:h-2'
  const txt = big
    ? 'text-xs font-semibold sm:text-sm md:text-base lg:text-[1.05rem]'
    : 'text-[7px] font-semibold sm:text-[8px]'

  const showPrevMed = mode !== 'analisadores' && prevMed > 0
  const showPrevAn = mode !== 'medidores' && prevAn > 0

  return (
    <div className="flex min-w-0 flex-col items-end gap-0.5">
      {nInst > 0 ? (
        <div className="flex items-center justify-end gap-0.5" title={`Instalações (${nInst})`}>
          <span className={`shrink-0 rounded-full shadow-sm ${dot}`} style={{ backgroundColor: '#22c55e' }} />
          <span className={`tabular-nums text-emerald-400 ${txt}`}>(+{nInst})</span>
        </div>
      ) : null}
      {nDes > 0 ? (
        <div className="flex items-center justify-end gap-0.5" title={`Desinstalações (${nDes})`}>
          <span className={`shrink-0 rounded-full shadow-sm ${dot}`} style={{ backgroundColor: '#a855f7' }} />
          <span className={`tabular-nums text-xpe-purple ${txt}`}>(-{nDes})</span>
        </div>
      ) : null}
      {showPrevMed || showPrevAn ? (
        <div
          className="flex flex-wrap items-center justify-end gap-0.5 text-right"
          title={`Previsão remoção · ${[showPrevMed ? `${prevMed} med.` : '', showPrevAn ? `${prevAn} anal.` : ''].filter(Boolean).join(' · ')}`}
        >
          <span className={`shrink-0 rounded-full shadow-sm ${dot}`} style={{ backgroundColor: '#fbbf24' }} />
          <span className={`text-amber-200/95 ${txt}`}>
            {showPrevMed ? `(-${prevMed} medidores)` : ''}
            {showPrevMed && showPrevAn ? ' ' : ''}
            {showPrevAn ? `(-${prevAn} analisadores)` : ''}
          </span>
        </div>
      ) : null}
    </div>
  )
}

export function CalendarOperational({
  eventos,
  fleet,
  diasMedicao,
  diasExtras,
  onDiasExtrasChange,
  mode,
  onModeChange,
  variant = 'page',
  selectedDayKey,
  onSelectDay,
}: {
  eventos: EventoRow[]
  fleet: { medidorIds: string[]; analisadorCanonIds: string[] }
  diasMedicao: number
  diasExtras: number
  onDiasExtrasChange: (n: number) => void
  mode: CalendarViewMode
  onModeChange: (m: CalendarViewMode) => void
  variant?: 'page' | 'presentation'
  selectedDayKey: string | null
  onSelectDay: (key: string | null) => void
}) {
  const [cursor, setCursor] = useState(() => new Date())
  /** Rascunho de dias extras; só afeta o calendário após Confirmar. */
  const [draftExtras, setDraftExtras] = useState(diasExtras)

  useEffect(() => {
    if (!selectedDayKey) return
    const id = requestAnimationFrame(() => setDraftExtras(diasExtras))
    return () => cancelAnimationFrame(id)
  }, [selectedDayKey, diasExtras])

  useEffect(() => {
    if (!selectedDayKey) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSelectDay(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedDayKey, onSelectDay])

  const clampExtras = (n: number) => Math.max(0, Math.min(60, Math.round(n)))
  const pendingExtrasChange = draftExtras !== diasExtras

  const stats = useMemo(
    () => ({
      mInst: medidoresInstalacaoPorDia(eventos),
      mDes: medidoresDesinstalacaoPorDia(eventos),
      aInst: analisadoresInstalacaoPorDia(eventos),
      aDes: analisadoresDesinstalacaoPorDia(eventos),
    }),
    [eventos],
  )

  const hojeKey = format(new Date(), 'yyyy-MM-dd')

  const contagemInstPorDia = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of eventos) {
      if (e.statusExecucao !== 'instalacao') continue
      if (!matchesCalendarMode(e, mode)) continue
      const d = e.data.slice(0, 10)
      m.set(d, (m.get(d) ?? 0) + 1)
    }
    return m
  }, [eventos, mode])

  const contagemDesPorDia = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of eventos) {
      if (e.statusExecucao !== 'desinstalacao') continue
      if (!matchesCalendarMode(e, mode)) continue
      const d = e.data.slice(0, 10)
      m.set(d, (m.get(d) ?? 0) + 1)
    }
    return m
  }, [eventos, mode])

  const previsoesLista = useMemo(
    () => previsoesDesinstalacaoCiclosAbertos(eventos, diasMedicao, diasExtras),
    [eventos, diasMedicao, diasExtras],
  )

  const contagemPrevMedPorDia = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of previsoesLista) {
      if (p.tipo !== 'medidor') continue
      if (p.dataPrevista < hojeKey) continue
      m.set(p.dataPrevista, (m.get(p.dataPrevista) ?? 0) + 1)
    }
    return m
  }, [previsoesLista, hojeKey])

  const contagemPrevAnPorDia = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of previsoesLista) {
      if (p.tipo !== 'analisador') continue
      if (p.dataPrevista < hojeKey) continue
      m.set(p.dataPrevista, (m.get(p.dataPrevista) ?? 0) + 1)
    }
    return m
  }, [previsoesLista, hojeKey])

  const previsoesRascunhoLista = useMemo(
    () => previsoesDesinstalacaoCiclosAbertos(eventos, diasMedicao, draftExtras),
    [eventos, diasMedicao, draftExtras],
  )

  const detalheDia = useMemo(() => {
    if (!selectedDayKey) return null
    const inst = eventosInstalacaoNoDia(eventos, selectedDayKey).filter((e) => matchesCalendarMode(e, mode))
    const des = eventosDesinstalacaoNoDia(eventos, selectedDayKey).filter((e) => matchesCalendarMode(e, mode))
    const prev = previsoesRascunhoLista.filter(
      (p) => p.dataPrevista === selectedDayKey && matchesPrevisaoTipo(p.tipo, mode),
    )
    const { mInst, mDes, aInst, aDes } = stats
    const mn = mInst.get(selectedDayKey)?.size ?? 0
    const ml = mDes.get(selectedDayKey)?.size ?? 0
    const an = aInst.get(selectedDayKey)?.size ?? 0
    const al = aDes.get(selectedDayKey)?.size ?? 0
    const dMed = medidorDistribuicaoFimDia(eventos, fleet.medidorIds, selectedDayKey)
    const dAn = analisadorDistribuicaoFimDia(eventos, fleet.analisadorCanonIds, selectedDayKey)
    const prevMed = prev.filter((p) => p.tipo === 'medidor').length
    const prevAn = prev.filter((p) => p.tipo === 'analisador').length
    return {
      inst,
      des,
      prev,
      prevMed,
      prevAn,
      mn,
      ml,
      an,
      al,
      mc: dMed.instalado,
      ac: dAn.instalado,
      mcManut: dMed.manutencao,
      acManut: dAn.manutencao,
      mcDisp: dMed.disponivel,
      acDisp: dAn.disponivel,
    }
  }, [selectedDayKey, eventos, previsoesRascunhoLista, stats, mode, fleet])

  const days = useMemo(() => {
    const start = startOfMonth(cursor)
    const end = endOfMonth(cursor)
    return eachDayOfInterval({ start, end })
  }, [cursor])

  const startWeekday = startOfMonth(cursor).getDay()
  const labels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const { mInst, mDes, aInst, aDes } = stats

  const big = variant === 'presentation'
  const cellMinH = big
    ? 'min-h-[clamp(5.75rem,min(12dvh,10vw),15rem)] lg:min-h-[clamp(6.5rem,13dvh,16rem)] 2xl:min-h-[clamp(7rem,14dvh,18rem)]'
    : mode === 'junto'
      ? 'min-h-[112px] sm:min-h-[128px]'
      : 'min-h-[92px] sm:min-h-[108px]'
  const calGap = big ? 'gap-1.5 sm:gap-2 md:gap-2.5 lg:gap-3' : 'gap-1'
  const calRootSpace = big ? 'space-y-4 lg:space-y-5 2xl:space-y-6' : 'space-y-4'

  return (
    <div className={calRootSpace}>
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`rounded-lg border border-xpe-border px-3 py-1 text-white hover:bg-white/5 ${big ? 'px-4 py-2 text-base' : 'text-xs'}`}
            onClick={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
          >
            ←
          </button>
          <span
            className={`min-w-[160px] text-center font-medium capitalize text-white ${big ? 'text-lg sm:text-xl md:text-2xl lg:text-3xl 2xl:text-4xl' : 'text-sm'}`}
          >
            {format(cursor, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <button
            type="button"
            className={`rounded-lg border border-xpe-border px-3 py-1 text-white hover:bg-white/5 ${big ? 'px-4 py-2 text-base' : 'text-xs'}`}
            onClick={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
          >
            →
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <p
            className={`max-w-sm rounded-lg border border-amber-500/20 bg-amber-500/5 px-2.5 py-1.5 text-amber-100/85 ${big ? 'text-sm' : 'text-[10px]'}`}
          >
            <strong className="text-amber-200">Previsão:</strong> abra um dia → ajuste +dias → confirmar.
          </p>

          <div className="flex flex-wrap gap-1 rounded-full border border-xpe-border bg-xpe-bg/80 p-1">
            {(
              [
                { id: 'junto' as const, label: 'Junto' },
                { id: 'medidores' as const, label: 'Medidores' },
                { id: 'analisadores' as const, label: 'Analisadores' },
              ] satisfies { id: CalendarViewMode; label: string }[]
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onModeChange(opt.id)}
                className={`rounded-full px-3 py-1.5 font-semibold transition sm:text-sm ${big ? 'px-4 py-2 text-base' : 'text-xs'} ${
                  mode === opt.id
                    ? 'bg-xpe-purple/35 text-xpe-neon ring-1 ring-xpe-neon/35'
                    : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`grid gap-2 text-zinc-400 ${big ? 'sm:grid-cols-2 lg:grid-cols-5 text-sm' : 'text-[11px] sm:grid-cols-2 lg:grid-cols-5'}`}>
        <p>
          <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#22c55e] shadow-[0_0_8px_#22c55e]" />
          <strong className="text-emerald-300">Instalação</strong> — bolinha e (+N) em verde.
        </p>
        <p>
          <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#a855f7] shadow-[0_0_8px_#a855f7]" />
          <strong className="text-xpe-purple">Desinstalação</strong> — bolinha e (−N) em roxo.
        </p>
        <p>
          <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
          <strong className="text-amber-200">Previsão</strong> — bolinha e (−N medidores / analisadores); {diasMedicao}
          d+extra (útil), conforme a vista.
        </p>
        <p className="text-zinc-500">
          <strong className="text-xpe-neon">Util.</strong> cor pela taxa em uso / (frota − manutenção): ≥75% amarelo,
          &gt;90% vermelho.
        </p>
        <p className="text-zinc-500">
          <strong className="text-white">Hoje</strong>: borda neon. Clique no dia: detalhe e ajuste de previsão. Fonte:
          eventos exportados.
        </p>
      </div>

      <div
        className={`grid grid-cols-7 ${calGap} text-center uppercase text-xpe-muted ${big ? 'text-xs sm:text-sm md:text-base lg:text-lg' : 'text-[10px] sm:text-xs'}`}
      >
        {labels.map((l) => (
          <div key={l} className={`font-medium ${big ? 'py-2 md:py-2.5 lg:py-3' : 'py-2'}`}>
            {l}
          </div>
        ))}
      </div>

      <div className={`grid grid-cols-7 ${calGap}`}>
        {Array.from({ length: startWeekday }).map((_, i) => (
          <div key={`e-${i}`} />
        ))}
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const muted = !isSameMonth(day, cursor)
          const today = isToday(day)

          const nInst = contagemInstPorDia.get(key) ?? 0
          const nDes = contagemDesPorDia.get(key) ?? 0
          const prevMed = contagemPrevMedPorDia.get(key) ?? 0
          const prevAn = contagemPrevAnPorDia.get(key) ?? 0

          const mn = mInst.get(key)?.size ?? 0
          const ml = mDes.get(key)?.size ?? 0
          const dMed = medidorDistribuicaoFimDia(eventos, fleet.medidorIds, key)
          const dAn = analisadorDistribuicaoFimDia(eventos, fleet.analisadorCanonIds, key)
          const mc = dMed.instalado
          const ac = dAn.instalado
          const pctMed = utilizacaoOperacionalPercent(dMed.instalado, dMed.manutencao, dMed.total)
          const pctAn = utilizacaoOperacionalPercent(dAn.instalado, dAn.manutencao, dAn.total)

          const an = aInst.get(key)?.size ?? 0
          const al = aDes.get(key)?.size ?? 0

          const selected = selectedDayKey === key

          const title = (() => {
            const dlabel = format(day, "d 'de' MMMM", { locale: ptBR })
            const um = Math.round(pctMed)
            const ua = Math.round(pctAn)
            if (mode === 'medidores') {
              return [dlabel, `Inst.: ${mn}`, `Em uso: ${mc} · util. ${um}%`, `Des.: ${ml}`].join(' · ')
            }
            if (mode === 'analisadores') {
              return [dlabel, `Inst.: ${an}`, `Em uso: ${ac} · util. ${ua}%`, `Des.: ${al}`].join(' · ')
            }
            return [
              dlabel,
              `Med. Inst/Em uso/Des ${mn}/${mc}/${ml} (util. ${um}%)`,
              `Anal. ${an}/${ac}/${al} (util. ${ua}%)`,
            ].join(' · ')
          })()

          return (
            <button
              key={key}
              type="button"
              title={title}
              onClick={() => onSelectDay(selected ? null : key)}
              className={`flex ${cellMinH} flex-col rounded-xl border p-1.5 text-left transition sm:p-2 ${big ? 'md:p-2.5 lg:p-3 2xl:p-3.5' : ''} ${
                muted ? 'opacity-45' : ''
              } ${
                today
                  ? 'border-xpe-neon bg-xpe-neon/10 shadow-[0_0_20px_-8px_rgba(57,255,156,0.6)] ring-2 ring-xpe-neon/70 ring-offset-2 ring-offset-xpe-bg'
                  : 'border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.05]'
              } ${selected ? 'ring-2 ring-xpe-purple/60' : ''}`}
            >
              <div className="flex items-start justify-between gap-1">
                <span
                  className={`font-semibold text-zinc-100 ${big ? 'text-base sm:text-lg md:text-xl lg:text-2xl 2xl:text-3xl' : 'text-xs sm:text-sm'} ${today ? 'text-xpe-neon' : ''}`}
                >
                  {format(day, 'd')}
                </span>
                <CalendarDotsInstDesPrev
                  nInst={nInst}
                  nDes={nDes}
                  prevMed={prevMed}
                  prevAn={prevAn}
                  mode={mode}
                  big={big}
                />
              </div>

              {mode === 'junto' && (
                <div
                  className={`mt-1 flex flex-1 flex-col justify-end gap-0.5 leading-tight ${big ? 'text-xs sm:text-sm md:text-base lg:text-[1.05rem]' : 'text-[8px] sm:text-[9px]'}`}
                >
                  <div
                    className={`grid items-center gap-x-0.5 font-semibold uppercase tracking-wide text-zinc-600 ${big ? 'grid-cols-[1fr_minmax(0,2.25rem)_minmax(0,2.25rem)] lg:grid-cols-[1fr_minmax(0,2.75rem)_minmax(0,2.75rem)]' : 'grid-cols-[1fr_minmax(0,1.6rem)_minmax(0,1.6rem)]'}`}
                  >
                    <span />
                    <span className="text-center text-xpe-neon/80">Med.</span>
                    <span className="text-center text-violet-300/90">Anal.</span>
                  </div>
                  <div
                    className={`grid items-center gap-x-0.5 ${big ? 'grid-cols-[1fr_minmax(0,2.25rem)_minmax(0,2.25rem)] lg:grid-cols-[1fr_minmax(0,2.75rem)_minmax(0,2.75rem)]' : 'grid-cols-[1fr_minmax(0,1.6rem)_minmax(0,1.6rem)]'}`}
                  >
                    <span className="text-zinc-500">Inst.</span>
                    <span className={`text-center tabular-nums font-semibold ${mn > 0 ? 'text-xpe-neon' : 'text-zinc-600'}`}>
                      {mn}
                    </span>
                    <span className={`text-center tabular-nums font-semibold ${an > 0 ? 'text-violet-300' : 'text-zinc-600'}`}>
                      {an}
                    </span>
                  </div>
                  <div
                    className={`grid items-center gap-x-0.5 ${big ? 'grid-cols-[1fr_minmax(0,2.25rem)_minmax(0,2.25rem)] lg:grid-cols-[1fr_minmax(0,2.75rem)_minmax(0,2.75rem)]' : 'grid-cols-[1fr_minmax(0,1.6rem)_minmax(0,1.6rem)]'}`}
                  >
                    <span className="text-zinc-500">Util.</span>
                    <span
                      className={`text-center tabular-nums font-semibold ${classUtilizacaoCalendario(pctMed)}`}
                      title={`Utilização ${Math.round(pctMed)}% (em uso / (frota − manutenção))`}
                    >
                      {mc}
                    </span>
                    <span
                      className={`text-center tabular-nums font-semibold ${classUtilizacaoCalendario(pctAn)}`}
                      title={`Utilização ${Math.round(pctAn)}% (em uso / (frota − manutenção))`}
                    >
                      {ac}
                    </span>
                  </div>
                  <div
                    className={`grid items-center gap-x-0.5 ${big ? 'grid-cols-[1fr_minmax(0,2.25rem)_minmax(0,2.25rem)] lg:grid-cols-[1fr_minmax(0,2.75rem)_minmax(0,2.75rem)]' : 'grid-cols-[1fr_minmax(0,1.6rem)_minmax(0,1.6rem)]'}`}
                  >
                    <span className="text-zinc-500">Des.</span>
                    <span className={`text-center tabular-nums font-semibold ${ml > 0 ? 'text-xpe-purple' : 'text-zinc-600'}`}>
                      {ml}
                    </span>
                    <span className={`text-center tabular-nums font-semibold ${al > 0 ? 'text-fuchsia-300' : 'text-zinc-600'}`}>
                      {al}
                    </span>
                  </div>
                </div>
              )}

              {mode === 'medidores' && (
                <div
                  className={`mt-1 flex flex-1 flex-col justify-end gap-0.5 leading-tight ${big ? 'text-sm md:text-base lg:text-lg' : 'text-[9px] sm:text-[10px]'}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-zinc-500">Inst.</span>
                    <span className={`tabular-nums font-semibold ${mn > 0 ? 'text-xpe-neon' : 'text-zinc-600'}`}>{mn}</span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-zinc-500">Util.</span>
                    <span
                      className={`tabular-nums font-semibold ${classUtilizacaoCalendario(pctMed)}`}
                      title={`Utilização ${Math.round(pctMed)}%`}
                    >
                      {mc}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-zinc-500">Des.</span>
                    <span className={`tabular-nums font-semibold ${ml > 0 ? 'text-xpe-purple' : 'text-zinc-600'}`}>{ml}</span>
                  </div>
                </div>
              )}

              {mode === 'analisadores' && (
                <div
                  className={`mt-1 flex flex-1 flex-col justify-end gap-0.5 leading-tight ${big ? 'text-sm md:text-base lg:text-lg' : 'text-[9px] sm:text-[10px]'}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-zinc-500">Inst.</span>
                    <span className={`tabular-nums font-semibold ${an > 0 ? 'text-violet-300' : 'text-zinc-600'}`}>{an}</span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-zinc-500">Util.</span>
                    <span
                      className={`tabular-nums font-semibold ${classUtilizacaoCalendario(pctAn)}`}
                      title={`Utilização ${Math.round(pctAn)}%`}
                    >
                      {ac}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-zinc-500">Des.</span>
                    <span className={`tabular-nums font-semibold ${al > 0 ? 'text-fuchsia-300' : 'text-zinc-600'}`}>{al}</span>
                  </div>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {detalheDia && selectedDayKey && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cal-dia-titulo"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
            aria-label="Fechar painel"
            onClick={() => onSelectDay(null)}
          />
          <div
            className={`relative z-10 flex max-h-[min(92vh,900px)] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-xpe-border bg-xpe-surface shadow-[0_-20px_60px_rgba(0,0,0,0.55)] sm:rounded-2xl ${big ? 'text-base' : 'text-sm'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-[1] flex flex-wrap items-start justify-between gap-3 border-b border-white/10 bg-xpe-surface/95 px-4 py-3 backdrop-blur-sm sm:px-5">
              <div>
                <h4 id="cal-dia-titulo" className="font-display text-lg text-white sm:text-xl">
                  {format(parseISO(`${selectedDayKey}T12:00:00`), "EEEE, d 'de' MMMM yyyy", { locale: ptBR })}
                </h4>
                <p className="mt-1 text-xs text-zinc-500">Atividades e previsão (vista atual: {MODE_LABEL[mode]})</p>
              </div>
              <button
                type="button"
                onClick={() => onSelectDay(null)}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/10"
              >
                Fechar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
              <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/25 bg-amber-500/[0.07] px-2.5 py-2">
                <span className="text-[11px] text-amber-200/90">Dias extras (após {diasMedicao}d)</span>
                <div className="flex items-center gap-0.5 rounded-md border border-white/10 bg-black/35">
                  <button
                    type="button"
                    aria-label="Remover um dia extra"
                    onClick={() => setDraftExtras((d) => clampExtras(d - 1))}
                    className="px-2.5 py-1 text-base leading-none text-zinc-200 hover:bg-white/10"
                  >
                    −
                  </button>
                  <span className="min-w-[2rem] text-center font-mono text-sm tabular-nums text-amber-100">
                    +{draftExtras}
                  </span>
                  <button
                    type="button"
                    aria-label="Adicionar um dia extra"
                    onClick={() => setDraftExtras((d) => clampExtras(d + 1))}
                    className="px-2.5 py-1 text-base leading-none text-zinc-200 hover:bg-white/10"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  disabled={!pendingExtrasChange}
                  onClick={() => onDiasExtrasChange(draftExtras)}
                  className="rounded-md bg-amber-500/90 px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Confirmar
                </button>
                <button
                  type="button"
                  onClick={() => setDraftExtras(diasExtras)}
                  className="text-[11px] text-zinc-500 underline decoration-zinc-600 underline-offset-2 hover:text-zinc-300"
                >
                  Descartar
                </button>
                {pendingExtrasChange && (
                  <span className="text-[10px] text-zinc-500">calendário ainda em +{diasExtras}</span>
                )}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                    Instalações realizadas ({detalheDia.inst.length})
                  </p>
                  <ul className="max-h-52 space-y-1.5 overflow-y-auto text-zinc-300">
                    {detalheDia.inst.map((e, i) => (
                      <li key={i} className="rounded-lg border border-white/5 bg-black/20 px-2 py-1.5 text-xs">
                        <span className="font-mono text-emerald-300">{e.idMedidor}</span> · {e.cliente ?? '—'} ·{' '}
                        <span className="text-zinc-200">{e.localizacao ?? '—'}</span> ·{' '}
                        <span className="text-zinc-500">{tipoEquipamentoDe(e)}</span>
                      </li>
                    ))}
                    {detalheDia.inst.length === 0 && (
                      <li className="text-zinc-500">Nenhuma instalação registrada nesta data.</li>
                    )}
                  </ul>
                </div>
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-xpe-purple">
                    Desinstalações realizadas ({detalheDia.des.length})
                  </p>
                  <ul className="max-h-52 space-y-1.5 overflow-y-auto text-zinc-300">
                    {detalheDia.des.map((e, i) => (
                      <li key={i} className="rounded-lg border border-white/5 bg-black/20 px-2 py-1.5 text-xs">
                        <span className="font-mono text-xpe-purple">{e.idMedidor}</span> · {e.cliente ?? '—'} ·{' '}
                        <span className="text-zinc-200">{e.localizacao ?? '—'}</span>
                      </li>
                    ))}
                    {detalheDia.des.length === 0 && (
                      <li className="text-zinc-500">Nenhuma desinstalação real nesta data.</li>
                    )}
                  </ul>
                </div>
                <div className="lg:col-span-2">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber-300">
                    Previsão remoção ({detalheDia.prev.length}) · rascunho +{draftExtras}d
                    {pendingExtrasChange ? (
                      <span className="ml-1 font-normal normal-case text-zinc-500">· aplicado +{diasExtras}d</span>
                    ) : null}
                  </p>
                  <ul className="max-h-52 space-y-1.5 overflow-y-auto text-zinc-300">
                    {detalheDia.prev.map((p, i) => (
                      <li key={i} className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-2 py-1.5 text-xs">
                        <span className="font-mono text-amber-200">{p.idMedidor}</span> · {p.cliente ?? '—'} ·{' '}
                        <span className="text-zinc-200">{p.localizacao ?? '—'}</span> · instal.{' '}
                        {p.dataInstalacao.slice(0, 10)} · <span className="text-zinc-500">{p.tipo}</span>
                      </li>
                    ))}
                    {detalheDia.prev.length === 0 && (
                      <li className="text-zinc-500">Nenhuma previsão nesta data (vista {MODE_LABEL[mode]}).</li>
                    )}
                  </ul>
                  <p className="mt-2 text-[11px] text-zinc-400">
                    Medidores previstos: <strong className="text-zinc-200">{detalheDia.prevMed}</strong> · Analisadores
                    previstos: <strong className="text-zinc-200">{detalheDia.prevAn}</strong>
                  </p>
                </div>
                <div className="lg:col-span-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-zinc-400">
                  {mode === 'junto' && (
                    <>
                      <strong className="text-zinc-200">Medidores ao fim do dia:</strong> {detalheDia.mc} em uso,{' '}
                      {detalheDia.mcManut} manutenção, {detalheDia.mcDisp} disponível.
                      <br />
                      <strong className="text-zinc-200">Analisadores:</strong> {detalheDia.ac} em uso,{' '}
                      {detalheDia.acManut} manutenção, {detalheDia.acDisp} disponível.
                    </>
                  )}
                  {mode === 'medidores' && (
                    <>
                      <strong className="text-zinc-200">Medidores:</strong> {detalheDia.mc} em uso,{' '}
                      {detalheDia.mcManut} manutenção, {detalheDia.mcDisp} disponível.
                    </>
                  )}
                  {mode === 'analisadores' && (
                    <>
                      <strong className="text-zinc-200">Analisadores:</strong> {detalheDia.ac} em uso,{' '}
                      {detalheDia.acManut} manutenção, {detalheDia.acDisp} disponível.
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
