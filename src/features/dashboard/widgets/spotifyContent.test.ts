import { describe, expect, it } from 'vitest'
import { parseSpotifyContent } from './spotifyContent'

const id = '37i9dQZF1DX4sWSpwq3LiO'

describe('Spotify content links', () => {
  it('accepts shared, localized, embed links and Spotify URIs', () => {
    for (const value of [
      `https://open.spotify.com/playlist/${id}?si=shared`,
      `https://open.spotify.com/intl-es/playlist/${id}`,
      `https://open.spotify.com/embed/playlist/${id}`,
      `spotify:playlist:${id}`,
    ]) expect(parseSpotifyContent(value)).toBe(`playlist/${id}`)
    for (const type of ['track', 'album', 'artist', 'episode', 'show']) {
      expect(parseSpotifyContent(`https://open.spotify.com/${type}/${id}`)).toBe(`${type}/${id}`)
    }
  })

  it('rejects unrelated hosts, scripts and unsupported content', () => {
    for (const value of ['javascript:alert(1)', `https://open.spotify.com.evil.com/playlist/${id}`, `https://example.com/playlist/${id}`, 'not a link', 'https://open.spotify.com/playlist/no', `https://open.spotify.com/user/${id}`]) {
      expect(parseSpotifyContent(value)).toBeNull()
    }
  })
})
