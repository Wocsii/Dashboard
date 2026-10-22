// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest'
import { withApple } from './apple'
import { appleClient } from './apple-transport'
import { HttpError } from './http'
const { connection } = vi.hoisted(() => ({ connection: { data: { apple_email: 'alice@icloud.com', password_encrypted: 'encrypted-v1', status: 'ok' }, error: null } }))
vi.mock('./env', () => ({ serverEnv: () => ({ supabaseUrl: 'https://example.com', supabaseSecretKey: 'server', tokenKey: 'key' }) }))
vi.mock('./crypto', () => ({ decrypt: () => 'password' }))
vi.mock('./apple-transport', () => ({ appleClient: vi.fn(async () => ({ account: {} })) }))
vi.mock('./http', async (original) => ({ ...await original<typeof import('./http')>(), supabaseAdmin: () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => connection }) }) }) }) }))
afterEach(() => { vi.useRealTimers(); vi.mocked(appleClient).mockClear(); connection.data.status = 'ok'; connection.data.password_encrypted = 'encrypted-v1' })
it('reuses iCloud login beyond a minute, while checking disconnection and credential changes', async () => {
  vi.useFakeTimers()
  const first = await withApple('alice', async client => client)
  vi.advanceTimersByTime(2 * 60_000)
  expect(await withApple('alice', async client => client)).toBe(first)
  expect(appleClient).toHaveBeenCalledTimes(1)
  connection.data.status = 'needs_reauth'
  await expect(withApple('alice', async () => 'events')).rejects.toMatchObject({ code: 'needs_reauth' })
  expect(appleClient).toHaveBeenCalledTimes(1)
  connection.data.status = 'ok'
  connection.data.password_encrypted = 'encrypted-v2'
  await withApple('alice', async client => client)
  expect(appleClient).toHaveBeenCalledTimes(2)
  vi.advanceTimersByTime(31 * 60_000)
  await withApple('alice', async client => client)
  expect(appleClient).toHaveBeenCalledTimes(3)
})
it('recreates a failed client rather than reusing it for thirty minutes', async () => {
  await expect(withApple('failure', async () => { throw new HttpError(502, 'unknown', 'Unavailable') })).rejects.toMatchObject({ status: 502 })
  await withApple('failure', async () => 'events')
  expect(appleClient).toHaveBeenCalledTimes(2)
})
