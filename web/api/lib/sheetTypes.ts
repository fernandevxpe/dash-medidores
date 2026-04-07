/** Tipos mínimos da API (evita importar `src/` no bundle serverless da Vercel). */
export type TipoEquipamento = 'medidor' | 'analisador' | 'desconhecido'

export type StatusExecucao = 'instalacao' | 'manutencao' | 'desinstalacao'

export interface DashboardConfig {
  diasMedicaoPadrao: number
  timezone: string
  mapaLocalizacaoParaAnalisador: Record<string, string>
  regraClassificacaoId?: string
  regraEventos?: string
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
