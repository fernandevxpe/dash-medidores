export type TrafficLevel = 'good' | 'warn' | 'bad'

export interface DashboardConfig {
  diasMedicaoPadrao: number
  timezone: string
  mapaLocalizacaoParaAnalisador: Record<string, string>
  regraClassificacaoId?: string
  regraEventos?: string
}

export type TipoEquipamento = 'medidor' | 'analisador' | 'desconhecido'

/** Derivado do histórico de eventos (a planilha nova não tem aba medidores). */
export interface MedidorRow {
  id: string
  status: string
}

export type StatusExecucao = 'instalacao' | 'manutencao' | 'desinstalacao'

/** Ciclo de medição por slot (instalação → … → desinstalação ou ainda aberto). */
export interface MedicaoCiclo {
  slotKey: string
  idMedidor: string
  localizacao: string
  inicio: EventoRow
  fim: EventoRow | null
  concluido: boolean
  diasDuracao: number
  dentroDoPrazo: boolean
  clienteInicio: string | null
}

export interface EventoRow {
  idMedidor: string
  tipoEquipamento?: TipoEquipamento
  statusExecucao: StatusExecucao
  data: string
  localizacao: string | null
  codigoAnalisador: string | null
  cliente: string | null
  instalador: string | null
}

export interface FrotaMeta {
  totalMedidoresObservados: number
  totalAnalisadoresOficial: number
  idsMedidoresObservados?: string[]
  idsAnalisadoresObservados?: string[]
  comentario?: string
}

export interface DashboardBundle {
  geradoEm: string
  fontePlanilha?: string
  config: DashboardConfig
  eventos: EventoRow[]
  frota: FrotaMeta
}

export interface DateRangeFilter {
  start: Date | null
  end: Date | null
}
