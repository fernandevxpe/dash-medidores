import { buildLiveDashboardBundle } from './lib/sheetToBundle'

/** Web Handler: `Response.json` em vez de `VercelResponse.json()` (helpers podem faltar no runtime novo). */
export default {
  async fetch(): Promise<Response> {
    try {
      const bundle = await buildLiveDashboardBundle()
      return Response.json(bundle, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      })
    } catch (e) {
      console.error('[api/dashboard-bundle]', e)
      const msg = e instanceof Error ? e.message : String(e)
      return Response.json(
        { error: msg },
        {
          status: 500,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        },
      )
    }
  },
}
