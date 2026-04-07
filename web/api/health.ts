/** Sanity check do runtime da Vercel (`/api/health`). */
export function GET(): Response {
  return Response.json({ ok: true })
}
