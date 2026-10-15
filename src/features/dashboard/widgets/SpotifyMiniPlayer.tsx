import { ExternalLink, Music2 } from 'lucide-react'

const playlistId = '37i9dQZF1DX4sWSpwq3LiO'

export function SpotifyMiniPlayer() {
  return (
    <section aria-label="Música para concentrarte" className="animate-rise relative mt-2 rounded-[24px] bg-white p-3 shadow-[0_8px_22px_rgba(0,0,0,0.12)]">
      <div className="mb-3 flex items-center gap-3 pl-1">
        <div
          aria-hidden
          className="relative -mt-6 grid size-[68px] shrink-0 place-items-center rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.22)]"
          style={{ background: 'repeating-radial-gradient(circle, transparent 0 3px, #ffffff18 4px 5px), conic-gradient(from 35deg, #123b85, #59a9df, #111c3b, #e5ac56, #235abb, #123b85)' }}
        >
          <span className="grid size-7 place-items-center rounded-full bg-sky-200 text-ink"><Music2 className="size-4" /></span>
          <span className="absolute size-1.5 rounded-full bg-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold">Tu momento de música</p>
          <p className="mt-0.5 text-[10px] text-muted">Spotify · Peaceful Piano</p>
        </div>
        <a href={`https://open.spotify.com/playlist/${playlistId}`} target="_blank" rel="noopener noreferrer" aria-label="Abrir música en Spotify" className="grid size-7 shrink-0 place-items-center rounded-full text-muted hover:bg-sky-50 hover:text-ink">
          <ExternalLink className="size-3.5" />
        </a>
      </div>
      <iframe
        title="Reproductor de Spotify: música para concentrarte"
        src={`https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator&theme=0`}
        width="100%"
        height="152"
        className="block rounded-[16px] border-0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
      />
    </section>
  )
}
