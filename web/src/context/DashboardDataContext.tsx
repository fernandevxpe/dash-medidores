import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { DashboardBundle } from '../types/dashboard'
import { filterEventsByRange } from '../analytics/metrics'

const STORAGE_KEY = 'xpe-dashboard-bundle-cache'

/**
 * Em produção, o default é a API que lê o Google na hora. Sem isto, o site ficaria
 * preso ao JSON estático em public/data (só muda com novo deploy).
 * Em dev, default é o snapshot local para funcionar sem credenciais.
 */
const DASHBOARD_DATA_URL =
  import.meta.env.VITE_DASHBOARD_DATA_URL ??
  (import.meta.env.PROD ? '/api/dashboard-bundle' : '/data/dashboard-bundle.json')

/** Poll em produção default 60s se não definires VITE_DASHBOARD_POLL_MS na Vercel. */
const POLL_MS = Math.max(
  0,
  Number(import.meta.env.VITE_DASHBOARD_POLL_MS ?? (import.meta.env.PROD ? 60000 : 0)),
)

type LoadState = 'idle' | 'loading' | 'ready' | 'error'

interface Ctx {
  bundle: DashboardBundle | null
  loadState: LoadState
  error: string | null
  reload: (opts?: { silent?: boolean }) => void
  rangeStart: Date | null
  rangeEnd: Date | null
  setRange: (start: Date | null, end: Date | null) => void
  eventosFiltrados: ReturnType<typeof filterEventsByRange>
}

const DashboardCtx = createContext<Ctx | null>(null)

async function fetchBundle(): Promise<DashboardBundle> {
  const res = await fetch(DASHBOARD_DATA_URL, { cache: 'no-store' })
  const bodyText = await res.text()
  if (!res.ok) {
    let detail = bodyText.slice(0, 600)
    try {
      const j = JSON.parse(bodyText) as { error?: string }
      if (j?.error) detail = j.error
    } catch {
      /* corpo não é JSON — ex. HTML de erro */
    }
    throw new Error(`Falha ao carregar dados (${res.status}): ${detail}`)
  }
  const data = JSON.parse(bodyText) as unknown
  if (
    data &&
    typeof data === 'object' &&
    'error' in data &&
    !('eventos' in data)
  ) {
    throw new Error(String((data as { error: string }).error))
  }
  return data as DashboardBundle
}

export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const [bundle, setBundle] = useState<DashboardBundle | null>(null)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [error, setError] = useState<string | null>(null)
  const [rangeStart, setRangeStart] = useState<Date | null>(null)
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null)

  const load = useCallback((opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true
    if (!silent) {
      setLoadState('loading')
      setError(null)
    }
    fetchBundle()
      .then((b) => {
        setBundle(b)
        setLoadState('ready')
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(b))
        } catch {
          /* ignore */
        }
        if (silent) setError(null)
      })
      .catch((e: Error) => {
        if (silent) {
          console.warn('[dashboard] Falha ao atualizar dados em segundo plano:', e.message)
          return
        }
        try {
          const raw = localStorage.getItem(STORAGE_KEY)
          if (raw) {
            setBundle(JSON.parse(raw) as DashboardBundle)
            setLoadState('ready')
            setError('Usando cache local (offline). ' + e.message)
            return
          }
        } catch {
          /* ignore */
        }
        setError(e.message)
        setLoadState('error')
      })
  }, [])

  useEffect(() => {
    const id = requestAnimationFrame(() => load())
    return () => cancelAnimationFrame(id)
  }, [load])

  useEffect(() => {
    if (POLL_MS <= 0) return
    const t = window.setInterval(() => load({ silent: true }), POLL_MS)
    return () => window.clearInterval(t)
  }, [load])

  const setRange = useCallback((start: Date | null, end: Date | null) => {
    setRangeStart(start)
    setRangeEnd(end)
  }, [])

  const eventosFiltrados = useMemo(() => {
    if (!bundle) return []
    return filterEventsByRange(bundle.eventos, rangeStart, rangeEnd)
  }, [bundle, rangeStart, rangeEnd])

  const value = useMemo(
    () => ({
      bundle,
      loadState,
      error,
      reload: load,
      rangeStart,
      rangeEnd,
      setRange,
      eventosFiltrados,
    }),
    [bundle, loadState, error, load, rangeStart, rangeEnd, setRange, eventosFiltrados],
  )

  return <DashboardCtx.Provider value={value}>{children}</DashboardCtx.Provider>
}

/** Hook exportado juntamente com o provider (padrão típico de contexto). */
// eslint-disable-next-line react-refresh/only-export-components -- hook + provider no mesmo ficheiro
export function useDashboardData() {
  const ctx = useContext(DashboardCtx)
  if (!ctx) throw new Error('useDashboardData outside provider')
  return ctx
}
