const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token'

function b64url(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function b64urlJson(obj: object): string {
  return b64url(new TextEncoder().encode(JSON.stringify(obj)))
}

function pemPkcs8ToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '')
  const buf = Buffer.from(b64, 'base64')
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
}

async function signJwtRs256(signInput: string, privateKeyPem: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) {
    throw new Error('Web Crypto (crypto.subtle) indisponível neste runtime.')
  }
  const der = pemPkcs8ToArrayBuffer(privateKeyPem)
  let key: Awaited<ReturnType<typeof subtle.importKey>>
  try {
    key = await subtle.importKey(
      'pkcs8',
      der,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign'],
    )
  } catch (e) {
    throw new Error(
      'private_key inválida (verifica GOOGLE_SERVICE_ACCOUNT_JSON). ' +
        (e instanceof Error ? e.message : String(e)),
    )
  }
  const sig = await subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signInput))
  return b64url(new Uint8Array(sig))
}

/**
 * Access token (conta de serviço) via JWT RS256 + OAuth2.
 * Usa só Web Crypto (`subtle`), sem `node:crypto` — evita falhas do bundler da Vercel com `createSign`.
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
  const sigPart = await signJwtRs256(signInput, creds.private_key)
  const jwt = `${signInput}.${sigPart}`

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
