import { buildLiveDashboardBundle } from './lib/sheetToBundle'

const jsonHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
} as const

/** Mesmo padrão que `api/health.ts` (`GET`), que a Vercel invoca de forma fiável para projetos Vite. */
export async function GET(): Promise<Response> {
  try {
    const bundle = await buildLiveDashboardBundle()
    return new Response(JSON.stringify(bundle), {
      status: 200,
      headers: {
        ...jsonHeaders,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    console.error('[api/dashboard-bundle]', e)
    const msg = e instanceof Error ? e.message : String(e)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: jsonHeaders,
    })
  }
}
