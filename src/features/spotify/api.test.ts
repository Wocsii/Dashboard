import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { completeAuthorization, connectSpotify, disconnectSpotify, fetchPlaylists, readSelection, readSession, recommendPlaylists, saveSelection, saveSession, type SpotifyPlaylist } from './api'

const clientId = 'a'.repeat(32)
const playlist = (id: string, name: string): SpotifyPlaylist => ({ id: id.repeat(22), name, images: [], owner: { display_name: name } })
const token = (name: string) => ({ accessToken: `${name}-access`, refreshToken: `${name}-refresh`, expiresAt: Date.now() + 3_600_000, clientId })

beforeEach(() => { vi.stubEnv('VITE_SPOTIFY_CLIENT_ID', clientId); localStorage.clear(); sessionStorage.clear() })
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('Spotify personal library', () => {
  it('keeps credentials and last choice separate for each dashboard user', async () => {
    saveSession('manuela', token('manuela'))
    saveSession('partner', token('partner'))
    saveSelection('manuela', playlist('a', 'Mis mañanas'))
    expect(readSelection('partner')).toBeNull()
    const fetcher = vi.fn(async (_url: string, options: RequestInit) => {
      const owner = (options.headers as Record<string, string>).Authorization.includes('partner') ? 'partner' : 'manuela'
      return Response.json({ items: [playlist(owner === 'partner' ? 'b' : 'a', owner)], next: null })
    })
    vi.stubGlobal('fetch', fetcher)
    expect((await fetchPlaylists('manuela')).items[0].name).toBe('manuela')
    expect((await fetchPlaylists('partner')).items[0].name).toBe('partner')
    disconnectSpotify('manuela')
    expect(readSession('manuela')).toBeNull()
    expect(readSelection('manuela')).toBeNull()
    expect(readSession('partner')?.accessToken).toBe('partner-access')
  })

  it('refreshes expired tokens, preserves refresh token and paginates the library', async () => {
    saveSession('one', { ...token('one'), expiresAt: 0 })
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ access_token: 'fresh', expires_in: 3600 }))
      .mockResolvedValueOnce(Response.json({ items: [null, playlist('c', 'Focus')], next: 'https://api.spotify.com/v1/me/playlists?offset=100' }))
    vi.stubGlobal('fetch', fetcher)
    const result = await fetchPlaylists('one', 50)
    expect(result.items).toHaveLength(1)
    expect(result.nextOffset).toBe(100)
    expect(readSession('one')?.refreshToken).toBe('one-refresh')
    expect(fetcher.mock.calls[1][1].headers.Authorization).toBe('Bearer fresh')
  })

  it('never restores credentials after disconnecting during a refresh', async () => {
    saveSession('one', { ...token('one'), expiresAt: 0 })
    let resolve!: (response: Response) => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((done) => { resolve = done })))
    const request = fetchPlaylists('one')
    disconnectSpotify('one')
    resolve(Response.json({ access_token: 'late', refresh_token: 'rotated', expires_in: 3600 }))
    await expect(request).rejects.toThrow('ha cambiado')
    expect(readSession('one')).toBeNull()
  })

  it('requests reconnection for a revoked refresh token and explains 403 and 429 responses', async () => {
    saveSession('one', { ...token('one'), expiresAt: 0 })
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(null, { status: 400 }))
    vi.stubGlobal('fetch', fetcher)
    await expect(fetchPlaylists('one')).rejects.toMatchObject({ reconnect: true })
    saveSession('one', token('one'))
    fetcher.mockResolvedValueOnce(new Response(null, { status: 403 }))
    await expect(fetchPlaylists('one')).rejects.toThrow('autorizada')
    fetcher.mockResolvedValueOnce(new Response(null, { status: 429 }))
    await expect(fetchPlaylists('one')).rejects.toThrow('pausa')
  })

  it('retries a stale access token only once', async () => {
    saveSession('one', token('one'))
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ access_token: 'new', expires_in: 3600 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
    vi.stubGlobal('fetch', fetcher)
    await expect(fetchPlaylists('one')).rejects.toMatchObject({ reconnect: true })
    expect(fetcher).toHaveBeenCalledTimes(3)
  })

  it('recommends only playlists from the current library and keeps the last choice first', () => {
    const library = ['a','b','c','d','e','f'].map((id) => playlist(id, id))
    const result = recommendPlaylists(library, library[4].id, '2026-10-15')
    expect(result).toHaveLength(4)
    expect(result[0].id).toBe(library[4].id)
    expect(result.every((item) => library.includes(item))).toBe(true)
    expect(recommendPlaylists(library, library[4].id, '2026-10-15')).toEqual(result)
  })
})

describe('Spotify authorization', () => {
  function pending() {
    sessionStorage.setItem('dashboard.spotify.personal.oauth', JSON.stringify({ verifier: 'v'.repeat(64), state: 'valid', redirectUri: `${location.origin}/spotify/callback`, createdAt: Date.now() }))
  }
  it('rejects an incorrect OAuth state before exchanging a code', async () => {
    pending()
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    await expect(completeAuthorization('?code=code&state=wrong')).rejects.toThrow('caducado')
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('exchanges a valid PKCE callback and consumes the verifier once', async () => {
    pending()
    const fetcher = vi.fn().mockResolvedValue(Response.json({ access_token: 'access', refresh_token: 'refresh', expires_in: 3600 }))
    vi.stubGlobal('fetch', fetcher)
    expect((await completeAuthorization('?code=code&state=valid')).accessToken).toBe('access')
    const body = fetcher.mock.calls[0][1].body as URLSearchParams
    expect(body.get('code_verifier')).toBe('v'.repeat(64))
    expect(body.get('client_secret')).toBeNull()
    await expect(completeAuthorization('?code=code&state=valid')).rejects.toThrow('caducado')
  })
  it('handles denied access without exchanging a token', async () => {
    pending()
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    await expect(completeAuthorization('?error=access_denied&state=valid')).rejects.toThrow('No has autorizado')
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('accepts messages only from the opened popup and this origin', async () => {
    const popup = { closed: false, close: vi.fn() }
    vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window)
    const promise = connectSpotify()
    const session = token('mine')
    window.dispatchEvent(new MessageEvent('message', { origin: 'https://evil.example', source: popup as unknown as Window, data: { type: 'dashboard:spotify:connection', session } }))
    window.dispatchEvent(new MessageEvent('message', { origin: location.origin, source: window, data: { type: 'dashboard:spotify:connection', session: token('wrong') } }))
    window.dispatchEvent(new MessageEvent('message', { origin: location.origin, source: popup as unknown as Window, data: { type: 'dashboard:spotify:connection', session } }))
    await expect(promise).resolves.toEqual(session)
  })
})
