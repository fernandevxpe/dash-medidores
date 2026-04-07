import type { VercelRequest, VercelResponse } from '@vercel/node'
import { buildLiveDashboardBundle } from './lib/sheetToBundle'

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const bundle = await buildLiveDashboardBundle()
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json(bundle)
  } catch (e) {
    console.error(e)
    const msg = e instanceof Error ? e.message : String(e)
    return res.status(500).json({ error: msg })
  }
}
