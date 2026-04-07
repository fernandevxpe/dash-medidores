import { createSign } from 'node:crypto'

const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token'

function b64url(bytes: Buffer): string {
  return bytes.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlJson(obj: object): string {
  return b64url(Buffer.from(JSON.stringify(obj), 'utf8'))
}

/**
 * Access token para Google APIs usando JWT de conta de serviço (sem google-auth-library),
 * compatível com runtimes Node serverless (ex.: Vercel).
 */
export async function getGoogleAccessTokenFromServiceAccount(creds: {
  client_email: string
  private_key: string
  scope: string
}): Promise<string> {
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + 3600
  const header = b64urlJson({ alg: 'RS256', typ: 'JWT' })
  const payload = b64urlJson({
    iss: creds.client_email,
    scope: creds.scope,
    aud: OAUTH_TOKEN_URL,
    iat,
    exp,
  })
  const signInput = `${header}.${payload}`
  const sign = createSign('RSA-SHA256')
  sign.update(signInput)
  sign.end()
  let signature: Buffer
  try {
    signature = sign.sign(creds.private_key) as Buffer
  } catch (e) {
    throw new Error(
      'private_key inválida (verifica GOOGLE_SERVICE_ACCOUNT_JSON). ' +
        (e instanceof Error ? e.message : String(e)),
    )
  }
  const jwt = `${signInput}.${b64url(signature)}`

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt,
  })
  const res = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`OAuth2 ${res.status}: ${text.slice(0, 400)}`)
  }
  const data = JSON.parse(text) as {
    access_token?: string
    error?: string
    error_description?: string
  }
  if (data.error) {
    throw new Error(
      `OAuth2: ${data.error}${data.error_description ? ` — ${data.error_description}` : ''}`.trim(),
    )
  }
  if (!data.access_token) {
    throw new Error('Resposta OAuth sem access_token')
  }
  return data.access_token
}
