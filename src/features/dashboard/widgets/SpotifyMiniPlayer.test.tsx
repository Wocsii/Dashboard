import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { SpotifyMiniPlayer } from './SpotifyMiniPlayer'

beforeEach(() => localStorage.clear())
afterEach(cleanup)

it('selects a playlist with one click and remembers it after remounting', () => {
  const view = render(<SpotifyMiniPlayer />)
  fireEvent.click(screen.getByRole('button', { name: 'Elegir playlist' }))
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /lofi beats/ }))
  expect(screen.getByTitle('Reproductor de Spotify: tu música')).toHaveAttribute('src', expect.stringContaining('/embed/playlist/37i9dQZF1DWWQRwui0ExPn?'))
  expect(screen.queryByRole('button', { name: /Deep Focus/ })).not.toBeInTheDocument()
  view.unmount()
  render(<SpotifyMiniPlayer />)
  expect(screen.getByTitle('Reproductor de Spotify: tu música')).toHaveAttribute('src', expect.stringContaining('/embed/playlist/37i9dQZF1DWWQRwui0ExPn?'))
  fireEvent.click(screen.getByRole('button', { name: 'Elegir playlist' }))
  expect(screen.getByRole('button', { name: /lofi beats/ })).toHaveAttribute('aria-pressed', 'true')
})

it('expands and collapses the player', () => {
  render(<SpotifyMiniPlayer />)
  const player = screen.getByTitle('Reproductor de Spotify: tu música')
  expect(player).toHaveAttribute('height', '152')
  fireEvent.click(screen.getByRole('button', { name: 'Ampliar reproductor' }))
  expect(player).toHaveAttribute('height', '352')
  fireEvent.click(screen.getByRole('button', { name: 'Ver menos' }))
  expect(player).toHaveAttribute('height', '152')
})
