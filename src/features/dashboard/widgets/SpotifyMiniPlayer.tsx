import { useId, useState, type FormEvent } from 'react'
import { ChevronDown, ExternalLink, ListMusic, Music2, Search, X } from 'lucide-react'
import { defaultSpotifyContent, parseSpotifyContent } from './spotifyContent'

const storageKey = 'dashboard.spotify.content'

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
  const [link, setLink] = useState('')
  const [error, setError] = useState('')
  const inputId = useId()
  const errorId = useId()

  function choose(next: string) {
    setContent(next)
    setChoosing(false)
    setLink('')
    setError('')
    try { localStorage.setItem(storageKey, next) } catch { /* Playback still works without storage. */ }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const next = parseSpotifyContent(link)
    if (!next) {
      setError('Pega un enlace de Spotify a una lista, canción, álbum, artista o podcast. En Spotify: Compartir → Copiar enlace.')
      return
    }
    choose(next)
  }

  return (
    <section aria-label="Música para concentrarte" className="animate-rise min-w-0 w-full overflow-hidden rounded-[24px] bg-[#242827] p-3 text-white shadow-[0_5px_0_#a7aaa5,0_9px_18px_#00000018]">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full border border-white/20"><Music2 className="size-3.5" /></span>
        <p className="min-w-0 flex-1 truncate text-xs font-medium">Tu música <span className="text-white/50">· Spotify</span></p>
        <button type="button" onClick={() => setChoosing(!choosing)} aria-expanded={choosing} className="flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-2.5 py-1.5 text-[11px] hover:bg-white/20">
          {choosing ? <X className="size-3" /> : <ListMusic className="size-3" />} {choosing ? 'Cerrar' : 'Elegir música'}
        </button>
        <a href={`https://open.spotify.com/${content}`} target="_blank" rel="noopener noreferrer" aria-label="Abrir selección en Spotify" className="grid size-7 shrink-0 place-items-center rounded-full text-white/70 hover:bg-white/10">
          <ExternalLink className="size-3.5" />
        </a>
      </div>
      {choosing && (
        <form onSubmit={submit} className="mb-3 rounded-2xl bg-white/5 p-3">
          <label htmlFor={inputId} className="mb-2 block text-xs">¿Qué quieres escuchar?</label>
          <div className="flex flex-wrap gap-2">
            <input id={inputId} type="text" autoFocus value={link} onChange={(event) => { setLink(event.target.value); setError('') }} placeholder="Pega un enlace de Spotify" aria-invalid={!!error} aria-describedby={error ? errorId : undefined} className="min-w-0 basis-40 flex-1 rounded-lg border border-white/20 bg-white/10 px-2.5 py-2 text-xs text-white placeholder:text-white/50" />
            <button type="submit" className="rounded-lg bg-sky-200 px-3 text-xs font-semibold text-ink hover:bg-sky-100">Escuchar</button>
          </div>
          {error && <p id={errorId} role="alert" className="mt-2 text-xs text-amber-200">{error}</p>}
          <p className="mt-2 text-[10px] text-white/60">Listas, canciones, álbumes y podcasts. Se recuerda en este navegador.</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px]">
            <button type="button" onClick={() => choose(defaultSpotifyContent)} className="rounded-full border border-white/20 px-2.5 py-1 hover:bg-white/10">Piano para concentrarte</button>
            <a href="https://open.spotify.com/search" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-white/80 hover:underline"><Search className="size-3" /> Buscar en Spotify <ExternalLink className="size-3" /></a>
          </div>
        </form>
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
