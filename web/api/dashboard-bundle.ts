import type { VercelRequest, VercelResponse } from '@vercel/node'
import { buildLiveDashboardBundle } from './lib/sheetToBundle'

export const config = {
  maxDuration: 60,
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  try {
    const bundle = await buildLiveDashboardBundle()
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json(bundle)
  } catch (e) {
    console.error('[api/dashboard-bundle]', e)
    const msg = e instanceof Error ? e.message : String(e)
    return res.status(500).json({ error: msg })
  }
}
