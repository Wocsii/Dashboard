import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { SpotifyMiniPlayer } from './SpotifyMiniPlayer'

beforeEach(() => localStorage.clear())
afterEach(cleanup)

it('changes music from a shared link and remembers it after remounting', () => {
  const view = render(<SpotifyMiniPlayer />)
  fireEvent.click(screen.getByRole('button', { name: 'Elegir música' }))
  fireEvent.change(screen.getByLabelText('¿Qué quieres escuchar?'), { target: { value: 'https://open.spotify.com/track/0Lr4kGOYn9l83EjuK6cZFQ?si=test' } })
  fireEvent.click(screen.getByRole('button', { name: 'Escuchar' }))
  expect(screen.getByTitle('Reproductor de Spotify: tu música')).toHaveAttribute('src', expect.stringContaining('/embed/track/0Lr4kGOYn9l83EjuK6cZFQ?'))
  view.unmount()
  render(<SpotifyMiniPlayer />)
  expect(screen.getByTitle('Reproductor de Spotify: tu música')).toHaveAttribute('src', expect.stringContaining('/embed/track/0Lr4kGOYn9l83EjuK6cZFQ?'))
})

it('keeps the current player for invalid links and can expand the player', () => {
  render(<SpotifyMiniPlayer />)
  const player = screen.getByTitle('Reproductor de Spotify: tu música')
  const original = player.getAttribute('src')
  fireEvent.click(screen.getByRole('button', { name: 'Elegir música' }))
  fireEvent.change(screen.getByLabelText('¿Qué quieres escuchar?'), { target: { value: 'https://example.com' } })
  fireEvent.click(screen.getByRole('button', { name: 'Escuchar' }))
  expect(screen.getByRole('alert')).toBeVisible()
  expect(player).toHaveAttribute('src', original)
  fireEvent.click(screen.getByRole('button', { name: 'Ampliar reproductor' }))
  expect(player).toHaveAttribute('height', '352')
})
