/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL dos dados: ex. /api/dashboard-bundle (live) ou /data/dashboard-bundle.json (estático) */
  readonly VITE_DASHBOARD_DATA_URL?: string
  /** Intervalo de atualização em ms (ex. 60000). 0 ou omitir = só ao carregar. */
  readonly VITE_DASHBOARD_POLL_MS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
