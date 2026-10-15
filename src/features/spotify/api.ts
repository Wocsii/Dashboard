/** Spotify's public-client OAuth flow. No client secret is sent to the browser. */
export type SpotifySession = { accessToken: string; refreshToken: string; expiresAt: number; clientId: string }
export type SpotifyPlaylist = { id: string; name: string; images: { url: string }[]; owner: { display_name: string | null }; tracks?: { total: number }; items?: { total: number } }
export type PlaylistPage = { items: SpotifyPlaylist[]; nextOffset: number | null }
export class SpotifyError extends Error {
  constructor(message: string, public reconnect = false) { super(message) }
}

const prefix = 'dashboard.spotify.personal.'
const pendingKey = `${prefix}oauth`
export const spotifyClientId = () => (import.meta.env.VITE_SPOTIFY_CLIENT_ID ?? '').trim()
export const spotifyConfigured = () => /^[a-f\d]{32}$/i.test(spotifyClientId())
const sessionKey = (userId: string) => `${prefix}${userId}.session`
const selectionKey = (userId: string) => `${prefix}${userId}.selection`

export function validSession(value: unknown): value is SpotifySession {
  if (!value || typeof value !== 'object') return false
  const s = value as SpotifySession
  return typeof s.accessToken === 'string' && !!s.accessToken && typeof s.refreshToken === 'string' && !!s.refreshToken && Number.isFinite(s.expiresAt) && typeof s.clientId === 'string'
}
export function readSession(userId: string): SpotifySession | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(sessionKey(userId)) ?? 'null')
    return validSession(value) && value.clientId === spotifyClientId() ? value : null
  } catch { return null }
}
export function saveSession(userId: string, session: SpotifySession) {
  localStorage.setItem(sessionKey(userId), JSON.stringify(session))
}
export function disconnectSpotify(userId: string) {
  localStorage.removeItem(sessionKey(userId))
  localStorage.removeItem(selectionKey(userId))
}
export function readSelection(userId: string): SpotifyPlaylist | null {
  try {
    const value = JSON.parse(localStorage.getItem(selectionKey(userId)) ?? 'null') as SpotifyPlaylist | null
    return value && /^[a-zA-Z0-9]{22}$/.test(value.id) && typeof value.name === 'string' ? value : null
  } catch { return null }
}
export function saveSelection(userId: string, playlist: SpotifyPlaylist) {
  try { localStorage.setItem(selectionKey(userId), JSON.stringify(playlist)) } catch { /* Selection still works for this tab. */ }
}

function randomString() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) => n.toString(16).padStart(2, '0')).join('')
}

export async function beginAuthorization() {
  if (!spotifyConfigured()) throw new SpotifyError('La conexión con Spotify todavía no está activada.')
  const verifier = randomString()
  const state = randomString()
  const redirectUri = `${location.origin}/spotify/callback`
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  sessionStorage.setItem(pendingKey, JSON.stringify({ verifier, state, redirectUri, createdAt: Date.now() }))
  const url = new URL('https://accounts.spotify.com/authorize')
  url.search = new URLSearchParams({ client_id: spotifyClientId(), response_type: 'code', redirect_uri: redirectUri, state, code_challenge_method: 'S256', code_challenge: challenge, scope: 'playlist-read-private playlist-read-collaborative', show_dialog: 'true' }).toString()
  location.replace(url.toString())
}

async function tokenRequest(params: URLSearchParams, refreshToken?: string): Promise<SpotifySession> {
  let response: Response
  try {
    response = await fetch('https://accounts.spotify.com/api/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params })
  } catch { throw new SpotifyError('No se pudo conectar con Spotify. Comprueba tu conexión e inténtalo de nuevo.') }
  if (!response.ok) {
    if (response.status === 400 || response.status === 401) throw new SpotifyError('Vuelve a conectar tu cuenta de Spotify.', true)
    throw new SpotifyError('Spotify no está disponible ahora. Inténtalo más tarde.')
  }
  const data = await response.json() as { access_token?: string; refresh_token?: string; expires_in?: number }
  const session = { accessToken: data.access_token, refreshToken: data.refresh_token || refreshToken, expiresAt: Date.now() + (data.expires_in ?? 0) * 1000, clientId: spotifyClientId() }
  if (!validSession(session) || session.expiresAt <= Date.now()) throw new SpotifyError('Spotify no devolvió una sesión válida. Vuelve a conectar.', true)
  return session
}

export async function completeAuthorization(search: string): Promise<SpotifySession> {
  const params = new URLSearchParams(search)
  let pending: { verifier: string; state: string; redirectUri: string; createdAt: number } | null = null
  try { pending = JSON.parse(sessionStorage.getItem(pendingKey) ?? 'null') } catch { /* Invalid session. */ }
  sessionStorage.removeItem(pendingKey)
  if (!pending || params.get('state') !== pending.state || !pending.verifier || pending.redirectUri !== `${location.origin}/spotify/callback` || !Number.isFinite(pending.createdAt) || Date.now() - pending.createdAt > 10 * 60_000 || pending.createdAt > Date.now()) {
    throw new SpotifyError('La conexión ha caducado. Cierra esta ventana y vuelve a conectar Spotify.')
  }
  if (params.has('error')) throw new SpotifyError('No has autorizado el acceso a tus playlists. Puedes intentarlo cuando quieras.')
  const code = params.get('code')
  if (!code) throw new SpotifyError('Spotify no devolvió la autorización. Vuelve a intentarlo.')
  return tokenRequest(new URLSearchParams({ grant_type: 'authorization_code', client_id: spotifyClientId(), code, redirect_uri: pending.redirectUri, code_verifier: pending.verifier }))
}

/** Open synchronously from a click so popup blockers do not reject the OAuth window. */
export function connectSpotify(): Promise<SpotifySession> {
  if (!spotifyConfigured()) return Promise.reject(new SpotifyError('La conexión con Spotify todavía no está activada.'))
  const popup = window.open(`${location.origin}/spotify/connect`, '_blank', 'popup,width=480,height=720')
  if (!popup) return Promise.reject(new SpotifyError('Permite abrir la ventana de Spotify para conectar tu cuenta.'))
  return new Promise((resolve, reject) => {
    const cleanup = () => { window.removeEventListener('message', receive); clearInterval(poll); clearTimeout(timeout) }
    const receive = (event: MessageEvent) => {
      if (event.origin !== location.origin || event.source !== popup || event.data?.type !== 'dashboard:spotify:connection') return
      if (validSession(event.data.session) && event.data.session.clientId === spotifyClientId()) {
        cleanup(); resolve(event.data.session)
      } else if (typeof event.data.error === 'string') {
        cleanup(); reject(new SpotifyError(event.data.error))
      }
    }
    window.addEventListener('message', receive)
    const poll = setInterval(() => {
      if (popup.closed) { cleanup(); reject(new SpotifyError('Has cerrado la conexión con Spotify. Puedes volver a intentarlo.')) }
    }, 500)
    const timeout = setTimeout(() => { cleanup(); popup.close(); reject(new SpotifyError('La conexión ha caducado. Vuelve a intentarlo.')) }, 5 * 60_000)
  })
}

const refreshing = new Map<string, Promise<SpotifySession>>()
async function refreshSession(userId: string, current: SpotifySession): Promise<SpotifySession> {
  const existing = refreshing.get(userId)
  if (existing) return existing
  const request = tokenRequest(new URLSearchParams({ grant_type: 'refresh_token', refresh_token: current.refreshToken, client_id: spotifyClientId() }), current.refreshToken)
    .then((next) => {
      // A late response must never restore a disconnected or replaced account.
      if (readSession(userId)?.refreshToken !== current.refreshToken) throw new SpotifyError('La cuenta de Spotify ha cambiado. Vuelve a abrir tus playlists.', true)
      saveSession(userId, next)
      return next
    }).finally(() => refreshing.delete(userId))
  refreshing.set(userId, request)
  return request
}

export async function fetchPlaylists(userId: string, offset = 0): Promise<PlaylistPage> {
  let session = readSession(userId)
  if (!session) throw new SpotifyError('Conecta tu cuenta para ver tus playlists.', true)
  if (session.expiresAt - Date.now() < 60_000) session = await refreshSession(userId, session)
  const request = () => fetch(`https://api.spotify.com/v1/me/playlists?limit=50&offset=${offset}`, { headers: { Authorization: `Bearer ${session!.accessToken}` } })
  let response = await request()
  if (response.status === 401) { session = await refreshSession(userId, session); response = await request() }
  if (response.status === 401) throw new SpotifyError('Vuelve a conectar tu cuenta de Spotify.', true)
  if (response.status === 403) throw new SpotifyError('Spotify no ha permitido acceder a esta cuenta. Comprueba que esté autorizada para el dashboard.')
  if (response.status === 429) throw new SpotifyError('Spotify necesita una pausa. Espera un momento y pulsa Reintentar.')
  if (!response.ok) throw new SpotifyError('No se han podido cargar tus playlists. Inténtalo de nuevo.')
  const data = await response.json() as { items: (SpotifyPlaylist | null)[]; next: string | null }
  return { items: data.items.filter((p): p is SpotifyPlaylist => !!p && /^[a-zA-Z0-9]{22}$/.test(p.id) && typeof p.name === 'string'), nextOffset: data.next ? offset + 50 : null }
}

/** A small daily rotation from the user's own library, with the last choice first. */
export function recommendPlaylists(playlists: SpotifyPlaylist[], selectedId?: string, day = new Date().toLocaleDateString('sv-SE')) {
  function score(id: string) {
    let value = 2166136261
    for (const char of `${day}:${id}`) value = Math.imul(value ^ char.charCodeAt(0), 16777619)
    return value >>> 0
  }
  return [...playlists].sort((a, b) => a.id === selectedId ? -1 : b.id === selectedId ? 1 : score(a.id) - score(b.id)).slice(0, 4)
}
