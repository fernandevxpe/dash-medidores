/**
 * Lê valores do Google Sheets e monta DashboardBundle (espelha scripts/dashboard_bundle_builder.py).
 * Só para Node / serverless — não importar no código do browser.
 */
import { getGoogleAccessTokenFromServiceAccount } from './googleAccessToken'
import type { DashboardBundle, EventoRow, FrotaMeta, StatusExecucao, TipoEquipamento } from './sheetTypes'

const SHEET_TRIES = ['dados brutos dashboard', 'Página1', 'Pagina1'] as const

const READ_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly'

function normalizeDataCelula(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === 'number' && Number.isFinite(v)) {
    const epoch = new Date(Date.UTC(1899, 11, 30))
    const ms = epoch.getTime() + v * 86400000
    const d = new Date(ms)
    if (!Number.isNaN(d.getTime())) {
      return d.toISOString().slice(0, 19)
    }
  }
  const s = String(v).trim()
  if (!s) return null
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    if (s.includes('T')) return s.length >= 19 ? s.slice(0, 19) : s
    return `${s.slice(0, 10)}T00:00:00`
  }
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (m) {
    const d = +m[1],
      mo = +m[2],
      y = +m[3]
    return `${String(y).padStart(4, '0')}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}T00:00:00`
  }
  return s
}

function idCelulaParaString(mid: unknown): string {
  if (mid == null) return ''
  if (typeof mid === 'number' && Number.isInteger(mid)) return String(mid)
  return String(mid).trim()
}

function classificarTipoEquipamento(idStr: string): TipoEquipamento {
  if (!idStr) return 'desconhecido'
  const s = idStr.trim()
  const sl = s.toLowerCase()
  if (sl.startsWith('xp')) return 'medidor'
  if (/^\d+$/.test(s)) return 'analisador'
  if (/^analisador[_\s]?\d+$/i.test(sl)) return 'analisador'
  return 'desconhecido'
}

function normalizarStatusExec(raw: unknown): StatusExecucao | null {
  if (raw == null) return null
  const t = String(raw).trim().toUpperCase()
  if (t.includes('DESINST') || t === 'DESINSTALAÇÃO') return 'desinstalacao'
  if (t.includes('MANUT')) return 'manutencao'
  if (t.includes('INSTALA')) return 'instalacao'
  return null
}

function codigoAnalisador(localizacao: string | null | undefined): string | null {
  if (localizacao == null || localizacao === '') return null
  const s = String(localizacao).trim().toUpperCase()
  const m = s.match(/^CDM\s*(\d+)$/) ?? s.match(/^CDM(\d+)$/)
  if (m) return String(parseInt(m[1], 10)).padStart(2, '0')
  return s
}

function eventoFromRowValues(
  stRaw: unknown,
  loc: unknown,
  mid: unknown,
  inst: unknown,
  cliente: unknown,
  data: unknown,
): EventoRow | null {
  const status = normalizarStatusExec(stRaw)
  const idNorm = idCelulaParaString(mid)
  const dataS = normalizeDataCelula(data)
  if (!idNorm || !status || !dataS) return null
  const locS = loc != null && String(loc).trim() !== '' ? String(loc).trim() : ''
  const cli = cliente != null && String(cliente).trim() !== '' ? String(cliente).trim() : null
  const tipoEq = classificarTipoEquipamento(idNorm)
  return {
    idMedidor: idNorm,
    tipoEquipamento: tipoEq,
    statusExecucao: status,
    data: dataS,
    localizacao: locS || null,
    codigoAnalisador: locS ? codigoAnalisador(locS) : null,
    cliente: cli,
    instalador: inst != null && String(inst).trim() !== '' ? String(inst).trim() : null,
  }
}

function usesFiveColumnOnlineLayout(headerRow: unknown[]): boolean {
  const cells = headerRow.slice(0, 5).map((x) => String(x ?? '').trim().toLowerCase())
  if (cells.length < 5) return false
  return cells[2] === 'id_medidor'
}

function cellEmpty(x: unknown): boolean {
  if (x == null) return true
  return String(x).trim() === ''
}

export function eventosFromGrid(allRows: unknown[][]): EventoRow[] {
  const eventos: EventoRow[] = []
  if (!allRows?.length || allRows.length < 2) return eventos
  const header = allRows[0] as unknown[]
  const five = usesFiveColumnOnlineLayout(header)
  for (const row of allRows.slice(1)) {
    if (!row || row.every(cellEmpty)) continue
    const cells = [...row] as unknown[]
    let ev: EventoRow | null
    if (five) {
      while (cells.length < 5) cells.push(null)
      ev = eventoFromRowValues(cells[0], cells[1], cells[2], null, cells[3], cells[4])
    } else {
      while (cells.length < 6) cells.push(null)
      ev = eventoFromRowValues(cells[0], cells[1], cells[2], cells[3], cells[4], cells[5])
    }
    if (ev) eventos.push(ev)
  }
  eventos.sort(
    (a, b) =>
      (a.data || '').localeCompare(b.data || '') ||
      a.idMedidor.localeCompare(b.idMedidor) ||
      a.statusExecucao.localeCompare(b.statusExecucao),
  )
  return eventos
}

function buildBundle(eventos: EventoRow[], fontePlanilha: string): DashboardBundle {
  const idsMed = [
    ...new Set(eventos.filter((e) => e.tipoEquipamento === 'medidor').map((e) => e.idMedidor)),
  ].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))

  const analSet = new Set<string>()
  for (const e of eventos) {
    if (e.tipoEquipamento !== 'analisador') continue
    const raw = e.idMedidor.trim().toLowerCase()
    const m1 = raw.match(/^analisador[_\s]?(\d+)$/)
    if (m1) analSet.add(String(parseInt(m1[1], 10)))
    else if (/^\d+$/.test(raw)) analSet.add(String(parseInt(raw, 10)))
  }
  const analisadoresIds = [...analSet].sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
  const locs = [
    ...new Set(eventos.map((e) => e.localizacao).filter(Boolean) as string[]),
  ].sort()

  const mapa: Record<string, string> = {}
  for (const loc of locs) {
    const c = codigoAnalisador(loc)
    if (c) mapa[loc] = c
  }

  const frota: FrotaMeta = {
    totalMedidoresObservados: idsMed.length,
    totalAnalisadoresOficial: analisadoresIds.length > 0 ? Math.max(5, analisadoresIds.length) : 5,
    idsMedidoresObservados: idsMed,
    idsAnalisadoresObservados: analisadoresIds,
    comentario:
      'Fonte: aba de eventos (legado 6 colunas ou Google 5 colunas); estado em campo derivado do histórico.',
  }

  const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')

  return {
    geradoEm: now,
    fontePlanilha,
    config: {
      diasMedicaoPadrao: 8,
      timezone: 'America/Recife',
      mapaLocalizacaoParaAnalisador: mapa,
      regraClassificacaoId: 'xp… = medidor; analisador_N ou só dígitos = analisador',
      regraEventos: 'Coluna Status_execucao: INSTALAÇÃO / MANUTENÇÃO / DESINSTALAÇÃO',
    },
    eventos,
    frota,
  }
}

function escapeSheetTitleForRange(title: string): string {
  if (/^[A-Za-z0-9_]+$/.test(title)) return title
  return `'${title.replace(/'/g, "''")}'`
}

function parseServiceAccountJson(raw: string): { client_email: string; private_key: string } {
  let t = raw.trim()
  if (t.charCodeAt(0) === 0xfeff) t = t.slice(1)
  let creds: { client_email?: string; private_key?: string }
  try {
    creds = JSON.parse(t) as { client_email?: string; private_key?: string }
  } catch (e) {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_JSON inválido. Na Vercel: Settings → Environment Variables → cola o ficheiro .json completo (tipo, project_id, private_key, client_email). Erro: ' +
        (e instanceof Error ? e.message : String(e)),
    )
  }
  if (!creds.client_email || !creds.private_key) {
    throw new Error(
      'JSON da conta incompleto: precisa de client_email e private_key. Verifica se colaste o JSON inteiro nas variáveis da Vercel.',
    )
  }
  const privateKey =
    typeof creds.private_key === 'string' ? creds.private_key.replace(/\\n/g, '\n') : creds.private_key
  return { client_email: creds.client_email, private_key: privateKey }
}

async function authHeaders(credentialsJson: string): Promise<Record<string, string>> {
  const creds = parseServiceAccountJson(credentialsJson)
  const token = await getGoogleAccessTokenFromServiceAccount({
    client_email: creds.client_email,
    private_key: creds.private_key,
    scope: READ_SCOPE,
  })
  return { Authorization: `Bearer ${token}` }
}

export async function fetchSheetRows(
  credentialsJson: string,
  spreadsheetId: string,
): Promise<{ rows: unknown[][]; sheetTitle: string }> {
  const headers = await authHeaders(credentialsJson)
  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(title))`
  const metaRes = await fetch(metaUrl, { headers })
  if (!metaRes.ok) {
    const t = await metaRes.text()
    throw new Error(`Sheets metadata ${metaRes.status}: ${t.slice(0, 200)}`)
  }
  const meta = (await metaRes.json()) as { sheets?: { properties: { title: string } }[] }
  const titles = (meta.sheets ?? []).map((s) => s.properties.title).filter(Boolean)
  const titleSet = new Set(titles)

  const orderedTitles = [
    ...SHEET_TRIES.filter((t) => titleSet.has(t)),
    ...titles.filter((t) => !SHEET_TRIES.includes(t as (typeof SHEET_TRIES)[number])),
  ]

  for (const title of orderedTitles) {
    const range = `${escapeSheetTitleForRange(title)}!A1:F100000`
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`
    const res = await fetch(url, { headers })
    if (!res.ok) continue
    const data = (await res.json()) as { values?: unknown[][] }
    const values = data.values
    if (values && values.length >= 2) {
      return { rows: values, sheetTitle: title }
    }
  }

  throw new Error(`Nenhuma aba com dados (≥2 linhas). Abas: ${titles.join(', ') || '(nenhuma)'}`)
}

export async function buildLiveDashboardBundle(): Promise<DashboardBundle> {
  const credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
  if (!credentialsJson?.trim()) {
    throw new Error('Defina GOOGLE_SERVICE_ACCOUNT_JSON (JSON da conta de serviço, servidor).')
  }
  if (!spreadsheetId?.trim()) {
    throw new Error('Defina GOOGLE_SHEETS_SPREADSHEET_ID')
  }
  const { rows, sheetTitle } = await fetchSheetRows(credentialsJson, spreadsheetId.trim())
  const eventos = eventosFromGrid(rows)
  const fonte = `Google Sheets (live) · ${spreadsheetId.trim().slice(0, 8)}… · ${sheetTitle}`
  return buildBundle(eventos, fonte)
}
