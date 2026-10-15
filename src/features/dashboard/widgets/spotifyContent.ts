const contentTypes = ['playlist', 'track', 'album', 'artist', 'episode', 'show']

/** Only accept Spotify content, never arbitrary iframe URLs. */
export function parseSpotifyContent(input: string): string | null {
  const value = input.trim()
  const uri = /^spotify:([a-z]+):([a-zA-Z0-9]{22})$/.exec(value)
  if (uri) return contentTypes.includes(uri[1]) ? `${uri[1]}/${uri[2]}` : null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.hostname !== 'open.spotify.com') return null
    const match = /^\/(?:intl-[a-z-]+\/)?(?:embed\/)?([a-z]+)\/([a-zA-Z0-9]{22})\/?$/.exec(url.pathname)
    return match && contentTypes.includes(match[1]) ? `${match[1]}/${match[2]}` : null
  } catch {
    return null
  }
}

export const defaultSpotifyContent = 'playlist/37i9dQZF1DX4sWSpwq3LiO'
