import { addDays, endOfDay, format, getISOWeek, getISOWeekYear, parseISO } from 'date-fns'
import type {
  DashboardBundle,
  EventoRow,
  MedicaoCiclo,
  MedidorRow,
  TipoEquipamento,
  TrafficLevel,
} from '../types/dashboard'

export function trafficForCapacity(pct: number): TrafficLevel {
  if (pct >= 65) return 'good'
  if (pct >= 35) return 'warn'
  return 'bad'
}

export function trafficForUnknownShare(pct: number): TrafficLevel {
  if (pct <= 5) return 'good'
  if (pct <= 15) return 'warn'
  return 'bad'
}

export function isInstalacao(e: EventoRow): boolean {
  return e.statusExecucao === 'instalacao'
}

export function isDesinstalacao(e: EventoRow): boolean {
  return e.statusExecucao === 'desinstalacao'
}

export function isManutencao(e: EventoRow): boolean {
  return e.statusExecucao === 'manutencao'
}

/** Slot ainda “em campo”: último evento é instalação ou manutenção. */
export function slotEmCampoUltimoEvento(e: EventoRow): boolean {
  return isInstalacao(e) || isManutencao(e)
}

export function inferTipoFromIdMedidor(id: string): TipoEquipamento {
  const s = id.trim().toLowerCase()
  if (s.startsWith('xp')) return 'medidor'
  if (/^\d+$/.test(id.trim())) return 'analisador'
  if (/^analisador[_\s]?\d+$/.test(s)) return 'analisador'
  return 'desconhecido'
}

export function tipoEquipamentoDe(e: EventoRow): TipoEquipamento {
  const t = e.tipoEquipamento
  if (t === 'medidor' || t === 'analisador' || t === 'desconhecido') return t
  return inferTipoFromIdMedidor(e.idMedidor)
}

export function normalizeAnalisadorId(id: string): string | null {
  const t = id.trim()
  const sl = t.toLowerCase()
  const m = sl.match(/^analisador[_\s]?(\d+)$/)
  if (m) return String(parseInt(m[1]!, 10))
  if (/^\d+$/.test(t)) return String(parseInt(t, 10))
  return null
}

export function clienteDe(e: EventoRow): string {
  return e.cliente?.trim() || '(sem cliente)'
}

export function makeSlotKey(idMedidor: string, localizacao: string | null): string {
  return JSON.stringify([idMedidor, localizacao ?? ''])
}

export function parseSlotKey(key: string): { idMedidor: string; localizacao: string } {
  const [idMedidor, localizacao = ''] = JSON.parse(key) as [string, string]
  return { idMedidor, localizacao }
}

function eventTime(e: EventoRow): number {
  return new Date(e.data).getTime()
}

export function lastEventBySlotAtTimestamp(eventos: EventoRow[], t: number): Map<string, EventoRow> {
  const filtered = eventos.filter((e) => eventTime(e) <= t)
  const bySlot = new Map<string, EventoRow[]>()
  for (const e of filtered) {
    const sk = makeSlotKey(e.idMedidor, e.localizacao)
    if (!bySlot.has(sk)) bySlot.set(sk, [])
    bySlot.get(sk)!.push(e)
  }
  const last = new Map<string, EventoRow>()
  for (const [sk, list] of bySlot) {
    list.sort((a, b) => eventTime(a) - eventTime(b))
    last.set(sk, list[list.length - 1]!)
  }
  return last
}

/** Slots em campo no instante t (último evento = instalação ou manutenção). */
export function activeSlotsAtTimestamp(eventos: EventoRow[], t: number): Set<string> {
  const last = lastEventBySlotAtTimestamp(eventos, t)
  const active = new Set<string>()
  for (const [sk, e] of last) {
    if (slotEmCampoUltimoEvento(e)) active.add(sk)
  }
  return active
}

function medidoresNoConjuntoDeSlots(slots: Set<string>): Set<string> {
  const ids = new Set<string>()
  for (const sk of slots) {
    const { idMedidor } = parseSlotKey(sk)
    if (inferTipoFromIdMedidor(idMedidor) === 'medidor') ids.add(idMedidor)
  }
  return ids
}

function analisadoresNoConjuntoDeSlots(slots: Set<string>): Set<string> {
  const ids = new Set<string>()
  for (const sk of slots) {
    const { idMedidor } = parseSlotKey(sk)
    const k = normalizeAnalisadorId(idMedidor)
    if (k) ids.add(k)
  }
  return ids
}

export function medidoresEmCampoAgora(eventos: EventoRow[]): Set<string> {
  return medidoresNoConjuntoDeSlots(activeSlotsAtTimestamp(eventos, Date.now()))
}

export function analisadoresEmCampoAgora(eventos: EventoRow[]): Set<string> {
  return analisadoresNoConjuntoDeSlots(activeSlotsAtTimestamp(eventos, Date.now()))
}

function estadoAgregadoMedidorId(
  idMedidor: string,
  lastBySlot: Map<string, EventoRow>,
): 'disponivel' | 'instalado' | 'manutencao' {
  let manut = false
  let inst = false
  for (const [sk, e] of lastBySlot) {
    const { idMedidor: mid } = parseSlotKey(sk)
    if (mid !== idMedidor) continue
    if (!slotEmCampoUltimoEvento(e)) continue
    if (isManutencao(e)) manut = true
    else if (isInstalacao(e)) inst = true
  }
  if (manut) return 'manutencao'
  if (inst) return 'instalado'
  return 'disponivel'
}

function estadoAgregadoAnalisadorId(
  idNum: string,
  lastBySlot: Map<string, EventoRow>,
): 'disponivel' | 'instalado' | 'manutencao' {
  let manut = false
  let inst = false
  for (const [sk, e] of lastBySlot) {
    const { idMedidor } = parseSlotKey(sk)
    const k = normalizeAnalisadorId(idMedidor)
    if (k !== idNum) continue
    if (!slotEmCampoUltimoEvento(e)) continue
    if (isManutencao(e)) manut = true
    else if (isInstalacao(e)) inst = true
  }
  if (manut) return 'manutencao'
  if (inst) return 'instalado'
  return 'disponivel'
}

/** Medidores na frota: instalado / manutenção / disponível (replay hoje). */
export function medidorStatusDistribuicao(bundle: DashboardBundle): Record<string, number> {
  const t = Date.now()
  const lastBySlot = lastEventBySlotAtTimestamp(bundle.eventos, t)
  const ids = new Set(
    bundle.frota.idsMedidoresObservados?.length
      ? bundle.frota.idsMedidoresObservados
      : bundle.eventos.filter((e) => tipoEquipamentoDe(e) === 'medidor').map((e) => e.idMedidor),
  )
  let instalado = 0
  let manutencao = 0
  let disponivel = 0
  for (const id of ids) {
    const s = estadoAgregadoMedidorId(id, lastBySlot)
    if (s === 'instalado') instalado++
    else if (s === 'manutencao') manutencao++
    else disponivel++
  }
  return { instalado, manutencao, disponivel }
}

/** Compatível com telas que esperam chaves de status (soma = total da frota). */
export function statusCountsMedidorDerived(bundle: DashboardBundle): Record<string, number> {
  return medidorStatusDistribuicao(bundle)
}

export function analisadorStatusDistribuicao(bundle: DashboardBundle): {
  instalado: number
  manutencao: number
  disponivel: number
  totalCatalogo: number
} {
  const t = Date.now()
  const lastBySlot = lastEventBySlotAtTimestamp(bundle.eventos, t)
  const totalCat =
    bundle.frota.totalAnalisadoresOficial && bundle.frota.totalAnalisadoresOficial > 0
      ? bundle.frota.totalAnalisadoresOficial
      : 5
  const idSet = new Set<string>()
  for (const x of bundle.frota.idsAnalisadoresObservados ?? []) idSet.add(String(parseInt(x, 10)))
  for (let i = 1; i <= totalCat; i++) idSet.add(String(i))
  let instalado = 0
  let manutencao = 0
  let disponivel = 0
  for (const idNum of idSet) {
    const s = estadoAgregadoAnalisadorId(idNum, lastBySlot)
    if (s === 'instalado') instalado++
    else if (s === 'manutencao') manutencao++
    else disponivel++
  }
  return { instalado, manutencao, disponivel, totalCatalogo: idSet.size }
}

export function lastEventByMeter(eventos: EventoRow[]): Map<string, EventoRow> {
  const map = new Map<string, EventoRow>()
  for (const e of eventos) {
    if (tipoEquipamentoDe(e) !== 'medidor') continue
    const prev = map.get(e.idMedidor)
    if (!prev || eventTime(e) >= eventTime(prev)) map.set(e.idMedidor, e)
  }
  return map
}

export function medidorById(medidores: MedidorRow[]) {
  return new Map(medidores.map((m) => [m.id, m]))
}

/** Lista sintética para telas que esperavam `medidores[]` da planilha. */
export function medidoresSinteticos(bundle: DashboardBundle): MedidorRow[] {
  const lastBySlot = lastEventBySlotAtTimestamp(bundle.eventos, Date.now())
  const ids = new Set([
    ...(bundle.frota.idsMedidoresObservados ?? []),
    ...bundle.eventos.filter((e) => tipoEquipamentoDe(e) === 'medidor').map((e) => e.idMedidor),
  ])
  return [...ids].map((id) => ({
    id,
    status: estadoAgregadoMedidorId(id, lastBySlot),
  }))
}

export function analisadoresSinteticos(bundle: DashboardBundle): MedidorRow[] {
  const lastBySlot = lastEventBySlotAtTimestamp(bundle.eventos, Date.now())
  const ad = analisadorStatusDistribuicao(bundle)
  const idSet = new Set<string>()
  for (const x of bundle.frota.idsAnalisadoresObservados ?? []) idSet.add(String(parseInt(x, 10)))
  for (let i = 1; i <= ad.totalCatalogo; i++) idSet.add(String(i))
  return [...idSet].sort((a, b) => parseInt(a, 10) - parseInt(b, 10)).map((idNum) => ({
    id: `analisador_${idNum}`,
    status: estadoAgregadoAnalisadorId(idNum, lastBySlot),
  }))
}

export function filterEventsByRange(
  eventos: EventoRow[],
  start: Date | null,
  end: Date | null,
): EventoRow[] {
  if (!start && !end) return eventos
  return eventos.filter((e) => {
    const t = new Date(e.data).getTime()
    if (start && t < start.getTime()) return false
    if (end && t > end.getTime()) return false
    return true
  })
}

/** Contagem de instalações por cliente (1 por evento de instalação). */
export function instalacoesPorCliente(eventos: EventoRow[]) {
  const m = new Map<string, number>()
  for (const e of eventos) {
    if (!isInstalacao(e)) continue
    const c = clienteDe(e)
    m.set(c, (m.get(c) ?? 0) + 1)
  }
  return [...m.entries()]
    .map(([cliente, total]) => ({ cliente, total }))
    .sort((a, b) => b.total - a.total)
}

export function medidoresDistintosPorCliente(eventos: EventoRow[]) {
  const m = new Map<string, Set<string>>()
  const a = new Map<string, Set<string>>()
  for (const e of eventos) {
    if (!isInstalacao(e)) continue
    const c = clienteDe(e)
    if (!m.has(c)) m.set(c, new Set())
    if (!a.has(c)) a.set(c, new Set())
    const tipo = tipoEquipamentoDe(e)
    if (tipo === 'medidor') m.get(c)!.add(e.idMedidor)
    if (tipo === 'analisador') {
      const k = normalizeAnalisadorId(e.idMedidor)
      if (k) a.get(c)!.add(k)
    }
  }
  const keys = new Set([...m.keys(), ...a.keys()])
  return [...keys].map((cliente) => ({
    cliente,
    medidores: m.get(cliente)?.size ?? 0,
    analisadores: a.get(cliente)?.size ?? 0,
  }))
}

function pesoVolume(e: EventoRow): number {
  return isInstalacao(e) ? 1 : 0
}

export function bucketDay(eventos: EventoRow[]) {
  const m = new Map<string, number>()
  for (const e of eventos) {
    if (!isInstalacao(e)) continue
    const d = e.data.slice(0, 10)
    m.set(d, (m.get(d) ?? 0) + pesoVolume(e))
  }
  return [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([dia, total]) => ({ dia, total }))
}

export function bucketMonth(eventos: EventoRow[]) {
  const m = new Map<string, number>()
  for (const e of eventos) {
    if (!isInstalacao(e)) continue
    const mo = e.data.slice(0, 7)
    m.set(mo, (m.get(mo) ?? 0) + pesoVolume(e))
  }
  return [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([mes, total]) => ({ mes, total }))
}

export function bucketIsoWeek(eventos: EventoRow[]) {
  const m = new Map<string, number>()
  for (const e of eventos) {
    if (!isInstalacao(e)) continue
    const d = parseISO(e.data)
    const key = `${getISOWeekYear(d)}-W${String(getISOWeek(d)).padStart(2, '0')}`
    m.set(key, (m.get(key) ?? 0) + pesoVolume(e))
  }
  return [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([semana, total]) => ({ semana, total }))
}

export function bucketWeekOfMonth(eventos: EventoRow[]) {
  const m = new Map<string, number>()
  for (const e of eventos) {
    if (!isInstalacao(e)) continue
    const d = new Date(e.data)
    const dom = d.getDate()
    const w = Math.min(5, Math.ceil(dom / 7))
    const key = `S${w}`
    m.set(key, (m.get(key) ?? 0) + pesoVolume(e))
  }
  const order = ['S1', 'S2', 'S3', 'S4', 'S5']
  return order.filter((k) => m.has(k)).map((k) => ({ semanaMes: k, total: m.get(k) ?? 0 }))
}

export function bucketDayDesinstalacoes(eventos: EventoRow[]) {
  const m = new Map<string, number>()
  for (const e of eventos) {
    if (!isDesinstalacao(e)) continue
    const d = e.data.slice(0, 10)
    m.set(d, (m.get(d) ?? 0) + 1)
  }
  return [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([dia, total]) => ({ dia, total }))
}

export function unknownLocationShare(eventos: EventoRow[]) {
  if (eventos.length === 0) return 0
  const u = eventos.filter(
    (e) => !e.localizacao || e.localizacao.toLowerCase() === 'desconhecido',
  ).length
  return (u / eventos.length) * 100
}

export function capacityMetrics(bundle: DashboardBundle) {
  const { eventos, frota } = bundle
  const totalM =
    frota.totalMedidoresObservados > 0
      ? frota.totalMedidoresObservados
      : new Set(eventos.filter((e) => tipoEquipamentoDe(e) === 'medidor').map((e) => e.idMedidor)).size

  const md = medidorStatusDistribuicao(bundle)
  const instaladosCampo = md.instalado + md.manutencao
  const pctM = totalM > 0 ? (instaladosCampo / totalM) * 100 : 0
  const pctMInst = totalM > 0 ? (md.instalado / totalM) * 100 : 0
  const pctMManut = totalM > 0 ? (md.manutencao / totalM) * 100 : 0

  const ad = analisadorStatusDistribuicao(bundle)
  const analEmCampo = ad.instalado + ad.manutencao
  const pctA = ad.totalCatalogo > 0 ? (analEmCampo / ad.totalCatalogo) * 100 : 0

  return {
    totalMedidores: totalM,
    instalados: md.instalado,
    manutencaoMedidores: md.manutencao,
    disponiveis: md.disponivel,
    instaladosCampo,
    pctCapacidadeMedidor: pctM,
    pctMedidoresInstalados: pctMInst,
    pctMedidoresManutencao: pctMManut,
    totalAnalisadoresCatalogo: ad.totalCatalogo,
    analisadoresInstalados: ad.instalado,
    analisadoresManutencao: ad.manutencao,
    analisadoresLivres: ad.disponivel,
    analisadoresEmUso: analEmCampo,
    pctCapacidadeAnalisador: pctA,
  }
}

export function analyzerDonutSlices(bundle: DashboardBundle) {
  const ad = analisadorStatusDistribuicao(bundle)
  return [
    { name: 'Em uso', value: ad.instalado },
    { name: 'Manutenção', value: ad.manutencao },
    { name: 'Livres', value: ad.disponivel },
  ]
}

export function previsaoRemocao(dataInstalacao: string, dias: number) {
  return addDays(parseISO(dataInstalacao), dias).toISOString()
}

/** Se cair em sábado ou domingo, empurra para a próxima segunda-feira (cenário típico de equipe). */
export function ajustarPrevisaoParaDiaUtil(alvo: Date): Date {
  const wd = alvo.getDay()
  if (wd === 6) return addDays(alvo, 2)
  if (wd === 0) return addDays(alvo, 1)
  return alvo
}

/** N dias corridos após instalação (+ extras), depois ajuste para dia útil. */
export function previsaoDesinstalacaoDiaUtil(
  dataInstalacaoIso: string,
  diasMedicao: number,
  diasExtras: number = 0,
): Date {
  const day = dataInstalacaoIso.slice(0, 10)
  const base = parseISO(`${day}T12:00:00`)
  const alvo = addDays(base, diasMedicao + diasExtras)
  return ajustarPrevisaoParaDiaUtil(alvo)
}

export interface LinhaPrevisaoDesinstalacao {
  idMedidor: string
  cliente: string | null
  localizacao: string | null
  dataInstalacao: string
  dataPrevista: string
  tipo: TipoEquipamento
}

export function ultimasInstalacoes(eventos: EventoRow[], n: number, diasPadrao: number) {
  return [...eventos]
    .filter(isInstalacao)
    .sort((a, b) => eventTime(b) - eventTime(a))
    .slice(0, n)
    .map((e) => ({
      ...e,
      previsaoRemocao: previsaoDesinstalacaoDiaUtil(e.data, diasPadrao, 0).toISOString(),
    }))
}

export function ultimasDesinstalacoes(eventos: EventoRow[], n: number) {
  return [...eventos]
    .filter(isDesinstalacao)
    .sort((a, b) => eventTime(b) - eventTime(a))
    .slice(0, n)
}

export function periodoMedicaoPorCliente(eventos: EventoRow[]) {
  const m = new Map<string, { min: number; max: number; dias: Set<string> }>()
  for (const e of eventos) {
    const c = clienteDe(e)
    const t = new Date(e.data).getTime()
    const day = e.data.slice(0, 10)
    if (!m.has(c)) m.set(c, { min: t, max: t, dias: new Set() })
    const x = m.get(c)!
    x.min = Math.min(x.min, t)
    x.max = Math.max(x.max, t)
    x.dias.add(day)
  }
  return [...m.entries()].map(([cliente, v]) => ({
    cliente,
    inicio: new Date(v.min).toISOString(),
    fim: new Date(v.max).toISOString(),
    diasComRegistro: v.dias.size,
  }))
}

export function eventosPorMedidor(eventos: EventoRow[], id: string) {
  return eventos.filter((e) => e.idMedidor === id).sort((a, b) => eventTime(b) - eventTime(a))
}

export function ultimoEventoPorId(eventos: EventoRow[], id: string): EventoRow | undefined {
  const evs = eventos.filter((e) => e.idMedidor === id)
  if (evs.length === 0) return undefined
  return evs.reduce((a, b) => (eventTime(b) > eventTime(a) ? b : a))
}

function noon(isoDay: string) {
  return parseISO(`${isoDay.slice(0, 10)}T12:00:00`)
}

export function eventosInstalacaoNoDia(eventos: EventoRow[], yyyyMmDd: string): EventoRow[] {
  return eventos.filter((e) => isInstalacao(e) && e.data.slice(0, 10) === yyyyMmDd)
}

export function eventosDesinstalacaoNoDia(eventos: EventoRow[], yyyyMmDd: string): EventoRow[] {
  return eventos.filter((e) => isDesinstalacao(e) && e.data.slice(0, 10) === yyyyMmDd)
}

/** Instalação: medidores distintos com evento INSTALAÇÃO neste dia. */
export function medidoresInstalacaoPorDia(eventos: EventoRow[]): Map<string, Set<string>> {
  const m = new Map<string, Set<string>>()
  for (const e of eventos) {
    if (!isInstalacao(e) || tipoEquipamentoDe(e) !== 'medidor') continue
    const day = e.data.slice(0, 10)
    if (!m.has(day)) m.set(day, new Set())
    m.get(day)!.add(e.idMedidor)
  }
  return m
}

/** Desinstalação real: medidores distintos com DESINSTALAÇÃO neste dia. */
export function medidoresDesinstalacaoPorDia(eventos: EventoRow[]): Map<string, Set<string>> {
  const m = new Map<string, Set<string>>()
  for (const e of eventos) {
    if (!isDesinstalacao(e) || tipoEquipamentoDe(e) !== 'medidor') continue
    const day = e.data.slice(0, 10)
    if (!m.has(day)) m.set(day, new Set())
    m.get(day)!.add(e.idMedidor)
  }
  return m
}

/** Medidores em campo ao fim do dia (replay do histórico). */
export function medidoresUtilizandoFimDia(eventos: EventoRow[], yyyyMmDd: string): number {
  const t = endOfDay(noon(yyyyMmDd)).getTime()
  return medidoresNoConjuntoDeSlots(activeSlotsAtTimestamp(eventos, t)).size
}

export function analisadoresUtilizandoFimDia(eventos: EventoRow[], yyyyMmDd: string): number {
  const t = endOfDay(noon(yyyyMmDd)).getTime()
  return analisadoresNoConjuntoDeSlots(activeSlotsAtTimestamp(eventos, t)).size
}

export function analisadoresInstalacaoPorDia(eventos: EventoRow[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>()
  for (const e of eventos) {
    if (!isInstalacao(e) || tipoEquipamentoDe(e) !== 'analisador') continue
    const k = normalizeAnalisadorId(e.idMedidor)
    if (!k) continue
    const day = e.data.slice(0, 10)
    if (!map.has(day)) map.set(day, new Set())
    map.get(day)!.add(k)
  }
  return map
}

export function analisadoresDesinstalacaoPorDia(eventos: EventoRow[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>()
  for (const e of eventos) {
    if (!isDesinstalacao(e) || tipoEquipamentoDe(e) !== 'analisador') continue
    const k = normalizeAnalisadorId(e.idMedidor)
    if (!k) continue
    const day = e.data.slice(0, 10)
    if (!map.has(day)) map.set(day, new Set())
    map.get(day)!.add(k)
  }
  return map
}

function diffDiasEntre(isoA: string, isoB: string): number {
  return Math.floor((parseISO(isoB).getTime() - parseISO(isoA).getTime()) / 86_400_000)
}

/** Ciclos por slot: abre em INSTALAÇÃO, fecha em DESINSTALAÇÃO; MANUTENÇÃO mantém o ciclo. */
export function ciclosMedicao(
  eventos: EventoRow[],
  diasPadrao: number,
  agoraMs: number = Date.now(),
): MedicaoCiclo[] {
  const bySlot = new Map<string, EventoRow[]>()
  for (const e of eventos) {
    const sk = makeSlotKey(e.idMedidor, e.localizacao)
    if (!bySlot.has(sk)) bySlot.set(sk, [])
    bySlot.get(sk)!.push(e)
  }
  const out: MedicaoCiclo[] = []
  const agoraIso = new Date(agoraMs).toISOString()
  for (const [sk, list] of bySlot) {
    list.sort((a, b) => eventTime(a) - eventTime(b))
    let aberto: EventoRow | null = null
    for (const e of list) {
      if (isInstalacao(e)) {
        aberto = e
      } else if (isManutencao(e)) {
        /* ciclo continua */
      } else if (isDesinstalacao(e)) {
        if (aberto) {
          const dur = diffDiasEntre(aberto.data, e.data)
          const { idMedidor, localizacao } = parseSlotKey(sk)
          out.push({
            slotKey: sk,
            idMedidor,
            localizacao,
            inicio: aberto,
            fim: e,
            concluido: true,
            diasDuracao: dur,
            dentroDoPrazo: dur <= diasPadrao,
            clienteInicio: aberto.cliente,
          })
          aberto = null
        }
      }
    }
    if (aberto) {
      const dur = diffDiasEntre(aberto.data, agoraIso)
      const { idMedidor, localizacao } = parseSlotKey(sk)
      out.push({
        slotKey: sk,
        idMedidor,
        localizacao,
        inicio: aberto,
        fim: null,
        concluido: false,
        diasDuracao: dur,
        dentroDoPrazo: dur <= diasPadrao,
        clienteInicio: aberto.cliente,
      })
    }
  }
  return out
}

/** Ciclos ainda abertos: data prevista de desinstalação com lógica de dia útil (+ offset opcional). */
export function previsoesDesinstalacaoCiclosAbertos(
  eventos: EventoRow[],
  diasMedicaoPadrao: number,
  diasExtras: number,
  agoraMs: number = Date.now(),
): LinhaPrevisaoDesinstalacao[] {
  const ciclos = ciclosMedicao(eventos, diasMedicaoPadrao, agoraMs)
  const out: LinhaPrevisaoDesinstalacao[] = []
  for (const c of ciclos) {
    if (c.concluido) continue
    const d = previsaoDesinstalacaoDiaUtil(c.inicio.data, diasMedicaoPadrao, diasExtras)
    out.push({
      idMedidor: c.idMedidor,
      cliente: c.clienteInicio ?? c.inicio.cliente,
      localizacao: c.inicio.localizacao,
      dataInstalacao: c.inicio.data,
      dataPrevista: format(d, 'yyyy-MM-dd'),
      tipo: tipoEquipamentoDe(c.inicio),
    })
  }
  return out.sort(
    (a, b) => a.dataPrevista.localeCompare(b.dataPrevista) || a.idMedidor.localeCompare(b.idMedidor),
  )
}

export function resumoPrazoMedicao(bundle: DashboardBundle) {
  const dias = bundle.config.diasMedicaoPadrao
  const ciclos = ciclosMedicao(bundle.eventos, dias)
  const concluidos = ciclos.filter((c) => c.concluido)
  const ativos = ciclos.filter((c) => !c.concluido)
  const diasConcl = concluidos.map((c) => c.diasDuracao)
  const mediaConcl =
    diasConcl.length > 0 ? diasConcl.reduce((a, b) => a + b, 0) / diasConcl.length : 0
  return {
    diasPadrao: dias,
    ciclosConcluidosDentro: concluidos.filter((c) => c.dentroDoPrazo).length,
    ciclosConcluidosFora: concluidos.filter((c) => !c.dentroDoPrazo).length,
    ciclosAtivosDentro: ativos.filter((c) => c.dentroDoPrazo).length,
    ciclosAtivosFora: ativos.filter((c) => !c.dentroDoPrazo).length,
    pendentesDesinstalar: ativos.filter((c) => !c.dentroDoPrazo).length,
    mediaDiasCicloConcluido: mediaConcl,
    totalCiclosAbertos: ativos.length,
  }
}

export interface SlotAtivoDetalhe {
  slotKey: string
  idMedidor: string
  localizacao: string
  cliente: string | null
  emManutencao: boolean
}

export function slotsAtivosComDetalhe(eventos: EventoRow[], t: number = Date.now()): SlotAtivoDetalhe[] {
  const last = lastEventBySlotAtTimestamp(eventos, t)
  const rows: SlotAtivoDetalhe[] = []
  for (const [sk, e] of last) {
    if (!slotEmCampoUltimoEvento(e)) continue
    const { idMedidor, localizacao } = parseSlotKey(sk)
    rows.push({
      slotKey: sk,
      idMedidor,
      localizacao,
      cliente: e.cliente ?? null,
      emManutencao: isManutencao(e),
    })
  }
  return rows
}

export function clienteEstaAtivo(eventos: EventoRow[], clienteObra: string): boolean {
  const alvo = (clienteObra.trim() || '(sem cliente)').toLowerCase()
  for (const r of slotsAtivosComDetalhe(eventos)) {
    const c = (r.cliente?.trim() || '(sem cliente)').toLowerCase()
    if (c === alvo) return true
  }
  return false
}

/** Slots em campo hoje vinculados ao cliente (obra) na planilha. */
export function detalheInstalacoesAtivasPorCliente(eventos: EventoRow[], clienteObra: string): SlotAtivoDetalhe[] {
  const alvo = (clienteObra.trim() || '(sem cliente)').toLowerCase()
  return slotsAtivosComDetalhe(eventos).filter(
    (s) => (s.cliente?.trim() || '(sem cliente)').toLowerCase() === alvo,
  )
}

export function bucketDayInstalacaoDesinstalacao(eventos: EventoRow[]) {
  const m = new Map<string, { dia: string; instalacoes: number; desinstalacoes: number }>()
  const touch = (dia: string) => {
    if (!m.has(dia)) m.set(dia, { dia, instalacoes: 0, desinstalacoes: 0 })
    return m.get(dia)!
  }
  for (const e of eventos) {
    const dia = e.data.slice(0, 10)
    const row = touch(dia)
    if (isInstalacao(e)) row.instalacoes += 1
    else if (isDesinstalacao(e)) row.desinstalacoes += 1
  }
  return [...m.values()].sort((a, b) => a.dia.localeCompare(b.dia))
}

export function bucketMonthInstalacaoDesinstalacao(eventos: EventoRow[]) {
  const m = new Map<string, { mes: string; instalacoes: number; desinstalacoes: number }>()
  const touch = (key: string) => {
    if (!m.has(key)) m.set(key, { mes: key, instalacoes: 0, desinstalacoes: 0 })
    return m.get(key)!
  }
  for (const e of eventos) {
    const key = e.data.slice(0, 7)
    const row = touch(key)
    if (isInstalacao(e)) row.instalacoes += 1
    else if (isDesinstalacao(e)) row.desinstalacoes += 1
  }
  return [...m.values()].sort((a, b) => a.mes.localeCompare(b.mes))
}

export function bucketIsoWeekInstalacaoDesinstalacao(eventos: EventoRow[]) {
  const m = new Map<string, { semana: string; instalacoes: number; desinstalacoes: number }>()
  const touch = (key: string) => {
    if (!m.has(key)) m.set(key, { semana: key, instalacoes: 0, desinstalacoes: 0 })
    return m.get(key)!
  }
  for (const e of eventos) {
    const d = parseISO(e.data)
    const key = `${getISOWeekYear(d)}-W${String(getISOWeek(d)).padStart(2, '0')}`
    const row = touch(key)
    if (isInstalacao(e)) row.instalacoes += 1
    else if (isDesinstalacao(e)) row.desinstalacoes += 1
  }
  return [...m.values()].sort((a, b) => a.semana.localeCompare(b.semana))
}

/** Para gráficos: concluídos no mês da desinstalação (fora / dentro do prazo de N dias). */
export function bucketMesCiclosConcluidosPrazo(bundle: DashboardBundle) {
  const dias = bundle.config.diasMedicaoPadrao
  const ciclos = ciclosMedicao(bundle.eventos, dias)
  const m = new Map<
    string,
    { mes: string; dentro: number; fora: number }
  >()
  for (const c of ciclos) {
    if (!c.concluido || !c.fim) continue
    const mes = c.fim.data.slice(0, 7)
    if (!m.has(mes)) m.set(mes, { mes, dentro: 0, fora: 0 })
    const row = m.get(mes)!
    if (c.dentroDoPrazo) row.dentro += 1
    else row.fora += 1
  }
  return [...m.values()].sort((a, b) => a.mes.localeCompare(b.mes))
}
