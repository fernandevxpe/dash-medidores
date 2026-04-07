import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Dev: JSON inline em .env ou caminho absoluto/relativo em GOOGLE_SERVICE_ACCOUNT_FILE. */
function resolveServiceAccountJson(env: Record<string, string>): string | undefined {
  const inline = env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim()
  if (inline) return inline
  const fp = env.GOOGLE_SERVICE_ACCOUNT_FILE?.trim()
  if (!fp) return undefined
  const abs = path.isAbsolute(fp) ? fp : path.resolve(__dirname, fp)
  if (!existsSync(abs)) return undefined
  return readFileSync(abs, 'utf8')
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'xpe-live-dashboard-api',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const pathname = req.url?.split('?')[0] ?? ''
            if (pathname !== '/api/dashboard-bundle') {
              next()
              return
            }
            try {
              const sa = resolveServiceAccountJson(env)
              if (sa) process.env.GOOGLE_SERVICE_ACCOUNT_JSON = sa
              process.env.GOOGLE_SHEETS_SPREADSHEET_ID = env.GOOGLE_SHEETS_SPREADSHEET_ID
              const { buildLiveDashboardBundle } = await import('./api/lib/sheetToBundle.js')
              const bundle = await buildLiveDashboardBundle()
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.setHeader('Cache-Control', 'no-store')
              res.end(JSON.stringify(bundle))
            } catch (e) {
              const msg = e instanceof Error ? e.message : String(e)
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ error: msg }))
            }
          })
        },
      },
    ],
    server: { port: 3000, strictPort: true },
    preview: { port: 3000, strictPort: true },
  }
})
