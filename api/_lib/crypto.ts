import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

/** AES-256-GCM. Formato: base64url(iv).base64url(tag).base64url(ciphertext) */
function key(secretB64: string): Buffer {
  const k = Buffer.from(secretB64, 'base64')
  if (k.length !== 32) throw new Error('TOKEN_ENCRYPTION_KEY debe ser 32 bytes en base64')
  return k
}

export function encrypt(plain: string, secretB64: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(secretB64), iv)
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString('base64url')).join('.')
}

export function decrypt(payload: string, secretB64: string): string {
  const [iv, tag, data] = payload.split('.').map((p) => Buffer.from(p, 'base64url'))
  const decipher = createDecipheriv('aes-256-gcm', key(secretB64), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}

/** `state` de OAuth firmado con HMAC: protege contra CSRF y lleva el id de usuario */
export type OAuthState = { uid: string; nonce: string; exp: number }

export function signState(state: OAuthState, secret: string): string {
  const body = Buffer.from(JSON.stringify(state)).toString('base64url')
  const sig = createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function verifyState(token: string, secret: string, now = Date.now()): OAuthState | null {
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const expected = createHmac('sha256', secret).update(body).digest()
  const given = Buffer.from(sig, 'base64url')
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null
  try {
    const state = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as OAuthState
    return state.exp > now ? state : null
  } catch {
    return null
  }
}

export const newNonce = () => randomBytes(16).toString('base64url')
