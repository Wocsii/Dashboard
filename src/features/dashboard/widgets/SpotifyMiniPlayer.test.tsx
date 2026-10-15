import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { SpotifyMiniPlayer } from './SpotifyMiniPlayer'
import { saveSession } from '@/features/spotify/api'

const auth = vi.hoisted(() => ({ userId: 'manuela' }))
vi.mock('@/features/auth/AuthProvider', () => ({ useAuth: () => ({ session: { user: { id: auth.userId } } }) }))
const clientId = 'a'.repeat(32)
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><SpotifyMiniPlayer /></QueryClientProvider>)
}
beforeEach(() => { localStorage.clear(); vi.stubEnv('VITE_SPOTIFY_CLIENT_ID', clientId); auth.userId = 'manuela' })
afterEach(() => { cleanup(); vi.unstubAllEnvs(); vi.unstubAllGlobals() })

it('asks each person to connect instead of displaying generic playlists', () => {
  setup()
  expect(screen.getByRole('button', { name: 'Conectar Spotify' })).toBeVisible()
  expect(screen.queryByTitle('Reproductor de Spotify: tu música')).not.toBeInTheDocument()
  expect(screen.queryByText('Peaceful Piano')).not.toBeInTheDocument()
})

it('shows personal playlists, remembers a choice and never shows it to the partner', async () => {
  saveSession('manuela', { accessToken: 'mine', refreshToken: 'refresh', expiresAt: Date.now() + 3_600_000, clientId })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ items: [{ id: 'a'.repeat(22), name: 'Mis mañanas', images: [], owner: { display_name: 'Manuela' } }], next: null })))
  const view = setup()
  fireEvent.click(await screen.findByRole('button', { name: /Mis mañanas/ }))
  expect(screen.getByTitle('Reproductor de Spotify: tu música')).toHaveAttribute('src', expect.stringContaining(`/playlist/${'a'.repeat(22)}`))
  view.unmount()
  const again = setup()
  expect(screen.getByTitle('Reproductor de Spotify: tu música')).toBeVisible()
  again.unmount()
  auth.userId = 'partner'
  setup()
  expect(screen.queryByTitle('Reproductor de Spotify: tu música')).not.toBeInTheDocument()
  expect(screen.queryByText('Mis mañanas')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Conectar Spotify' })).toBeVisible()
})

it('filters a personal library and disconnects it', async () => {
  saveSession('manuela', { accessToken: 'mine', refreshToken: 'refresh', expiresAt: Date.now() + 3_600_000, clientId })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ items: ['Café','Viajes'].map((name, i) => ({ id: String(i).repeat(22), name, images: [], owner: { display_name: 'Manuela' } })), next: null })))
  setup()
  await screen.findByRole('button', { name: /Café/ })
  fireEvent.click(screen.getByRole('button', { name: 'Mis playlists' }))
  fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar en mis playlists' }), { target: { value: 'viaj' } })
  expect(screen.queryByRole('button', { name: /Café/ })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Viajes/ })).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Desconectar' }))
  await screen.findByRole('button', { name: 'Conectar Spotify' })
  expect(localStorage.getItem('dashboard.spotify.personal.manuela.session')).toBeNull()
})
