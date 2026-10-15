import { useState } from 'react'
import { Check, ChevronDown, ExternalLink, ListMusic, Music2, X } from 'lucide-react'
import { defaultSpotifyContent, parseSpotifyContent } from './spotifyContent'

const storageKey = 'dashboard.spotify.content'
const playlists = [
  { id: '37i9dQZF1DX4sWSpwq3LiO', name: 'Peaceful Piano', mood: 'Calma y piano', cover: 'ab67706f0000000270e1fb7db7b45809d6a80377' },
  { id: '37i9dQZF1DWWQRwui0ExPn', name: 'lofi beats', mood: 'A tu ritmo', cover: 'ab67706f00000002266beb50b0032b0f140a749e' },
  { id: '37i9dQZF1DWZeKCadgRdKQ', name: 'Deep Focus', mood: 'Concentración', cover: 'ab67706f000000026020f2f6476db518ef747da4' },
  { id: '37i9dQZF1DX4wta20PHgwo', name: 'Late Night Jazz', mood: 'Un poco de jazz', cover: 'ab67706f00000002418902db3dd45091f82d97af' },
]

function initialContent() {
  try {
    const saved = localStorage.getItem(storageKey)
    return (saved && parseSpotifyContent(`https://open.spotify.com/${saved}`)) || defaultSpotifyContent
  } catch {
    return defaultSpotifyContent
  }
}

export function SpotifyMiniPlayer() {
  const [content, setContent] = useState(initialContent)
  const [choosing, setChoosing] = useState(false)
  const [expanded, setExpanded] = useState(false)

  function choose(id: string) {
    const next = `playlist/${id}`
    setContent(next)
    setChoosing(false)
    try { localStorage.setItem(storageKey, next) } catch { /* Playback still works without storage. */ }
  }

  return (
    <section aria-label="Música para concentrarte" className="animate-rise min-w-0 w-full overflow-hidden rounded-[24px] bg-[#242827] p-3 text-white shadow-[0_5px_0_#a7aaa5,0_9px_18px_#00000018]">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full border border-white/20"><Music2 className="size-3.5" /></span>
        <p className="min-w-0 flex-1 truncate text-xs font-medium">Tu música <span className="text-white/50">· Spotify</span></p>
        <button type="button" onClick={() => setChoosing(!choosing)} aria-expanded={choosing} className="flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-2.5 py-1.5 text-[11px] hover:bg-white/20">
          {choosing ? <X className="size-3" /> : <ListMusic className="size-3" />} {choosing ? 'Cerrar' : 'Elegir playlist'}
        </button>
        <a href={`https://open.spotify.com/${content}`} target="_blank" rel="noopener noreferrer" aria-label="Abrir selección en Spotify" className="grid size-7 shrink-0 place-items-center rounded-full text-white/70 hover:bg-white/10">
          <ExternalLink className="size-3.5" />
        </a>
      </div>
      {choosing && (
        <div className="mb-3 rounded-2xl bg-white/5 p-3">
          <p className="mb-3 text-xs font-medium">¿Qué te apetece escuchar?</p>
          <div className="grid grid-cols-2 gap-2">
            {playlists.map((playlist) => {
              const selected = content === `playlist/${playlist.id}`
              return (
                <button key={playlist.id} type="button" aria-pressed={selected} onClick={() => choose(playlist.id)} className={`flex min-w-0 items-center gap-2 rounded-xl p-2 text-left transition-colors ${selected ? 'bg-white/15 ring-1 ring-sky-200/60' : 'hover:bg-white/10'}`}>
                  <img src={`https://i.scdn.co/image/${playlist.cover}`} alt="" className="size-10 shrink-0 rounded-lg object-cover" loading="lazy" />
                  <span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-medium">{playlist.name}</span><span className="block truncate text-[10px] text-white/60">{playlist.mood}</span></span>
                  {selected && <Check aria-hidden className="size-3 shrink-0 text-sky-200" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
      <iframe
        key={content}
        title="Reproductor de Spotify: tu música"
        src={`https://open.spotify.com/embed/${content}?utm_source=generator&theme=0`}
        width="100%"
        height={expanded ? 352 : 152}
        className="block max-w-full rounded-[14px] border-0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
      />
      <button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} className="mx-auto mt-1 flex items-center gap-1 rounded-full px-2 py-1 text-[10px] text-white/65 hover:text-white">
        {expanded ? 'Ver menos' : 'Ampliar reproductor'} <ChevronDown className={`size-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
    </section>
  )
}
