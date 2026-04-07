/** Diagnóstico: import dinâmico de sheetToBundle (remover quando produção estiver estável). */
export async function GET(): Promise<Response> {
  const hdr = { 'Content-Type': 'application/json; charset=utf-8' } as const
  try {
    const mod = await import('./lib/sheetToBundle')
    return new Response(
      JSON.stringify({ ok: true, hasBuild: typeof mod.buildLiveDashboardBundle === 'function' }),
      { headers: hdr },
    )
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    return new Response(
      JSON.stringify({ ok: false, message: err.message, name: err.name, stack: err.stack?.slice(0, 800) }),
      { status: 500, headers: hdr },
    )
  }
}
