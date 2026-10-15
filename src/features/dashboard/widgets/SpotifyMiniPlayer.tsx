import { useEffect, useRef, useState } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronDown, ExternalLink, ListMusic, Loader, LogOut, Music2, Search, X } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { connectSpotify, disconnectSpotify, fetchPlaylists, readSelection, readSession, recommendPlaylists, saveSelection, saveSession, spotifyConfigured, SpotifyError, type SpotifyPlaylist } from '@/features/spotify/api'

export function SpotifyMiniPlayer() {
  const { session } = useAuth()
  const userId = session?.user.id ?? 'demo'
  return <PersonalSpotifyPlayer key={userId} userId={userId} />
}

function PersonalSpotifyPlayer({ userId }: { userId: string }) {
  const [connected, setConnected] = useState(() => !!readSession(userId))
  const [selected, setSelected] = useState(() => readSelection(userId))
  const [choosing, setChoosing] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [search, setSearch] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState('')
  const active = useRef(true)
  const qc = useQueryClient()
  const queryKey = ['spotify', userId, 'playlists'] as const
  const library = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchPlaylists(userId, pageParam),
    initialPageParam: 0,
    getNextPageParam: (page) => page.nextOffset ?? undefined,
    enabled: connected,
    staleTime: 5 * 60_000,
    retry: false,
  })
  useEffect(() => {
    active.current = true
    return () => { active.current = false }
  }, [])

  async function connect() {
    setConnecting(true)
    setConnectionError('')
    try {
      const session = await connectSpotify()
      if (!active.current) return
      await qc.cancelQueries({ queryKey })
      qc.removeQueries({ queryKey })
      disconnectSpotify(userId)
      saveSession(userId, session)
      setSelected(null)
      setConnected(true)
      setChoosing(true)
      void qc.invalidateQueries({ queryKey })
    } catch (error) {
      if (active.current) setConnectionError(error instanceof Error ? error.message : 'No se pudo conectar Spotify.')
    } finally { if (active.current) setConnecting(false) }
  }

  async function disconnect() {
    disconnectSpotify(userId)
    await qc.cancelQueries({ queryKey })
    qc.removeQueries({ queryKey })
    setConnected(false)
    setSelected(null)
    setChoosing(false)
    setSearch('')
    setConnectionError('')
  }

  function choose(playlist: SpotifyPlaylist) {
    setSelected(playlist)
    saveSelection(userId, playlist)
    setChoosing(false)
    setSearch('')
  }

  const playlists = Array.from(new Map((library.data?.pages.flatMap((page) => page.items) ?? []).map((p) => [p.id, p])).values())
  const showLibrary = connected && (choosing || !selected)
  const reconnect = library.error instanceof SpotifyError && library.error.reconnect
  const suggested = recommendPlaylists(playlists, selected?.id)
  const visible = choosing ? playlists.filter((p) => p.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())) : suggested

  return (
    <section aria-label="Música para concentrarte" className="animate-rise min-w-0 w-full overflow-hidden rounded-[24px] bg-[#242827] p-3 text-white shadow-[0_5px_0_#a7aaa5,0_9px_18px_#00000018]">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full border border-white/20"><Music2 className="size-3.5" /></span>
        <h2 className="min-w-0 flex-1 truncate text-xs font-medium">Tu música <span className="text-white/50">· Spotify</span></h2>
        {connected && <button type="button" onClick={() => setChoosing(!choosing)} aria-expanded={showLibrary} className="flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-2.5 py-1.5 text-[11px] hover:bg-white/20">
          {choosing ? <X className="size-3" /> : <ListMusic className="size-3" />} {choosing ? 'Cerrar' : 'Mis playlists'}
        </button>}
        {connected && selected && <a href={`https://open.spotify.com/playlist/${selected.id}`} target="_blank" rel="noopener noreferrer" aria-label="Abrir selección en Spotify" className="grid size-7 shrink-0 place-items-center rounded-full text-white/70 hover:bg-white/10"><ExternalLink className="size-3.5" /></a>}
      </div>
      {!connected && <div className="rounded-2xl bg-white/5 px-4 py-5 text-center">
        <p className="text-sm font-medium">Tus playlists, a tu ritmo</p>
        <p className="mx-auto mt-1.5 max-w-64 text-xs leading-relaxed text-white/65">Conecta tu Spotify y elige entre tus propias listas. Cada persona verá las de su cuenta.</p>
        <button type="button" disabled={connecting} onClick={() => void connect()} className="mt-4 inline-flex items-center gap-2 rounded-full bg-sky-200 px-4 py-2 text-xs font-semibold text-ink hover:bg-sky-100 disabled:opacity-60">
          {connecting && <Loader aria-hidden className="size-3 animate-spin" />}{connecting ? 'Conectando…' : 'Conectar Spotify'}
        </button>
        {!spotifyConfigured() && <p className="mt-2 text-[10px] text-white/50">La conexión con Spotify todavía no está activada.</p>}
      </div>}
      {connectionError && <p role="alert" className="my-2 rounded-xl bg-white/5 p-3 text-xs text-amber-200">{connectionError}</p>}
      {showLibrary && <div className="mb-2 rounded-2xl bg-white/5 p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs font-medium">{choosing ? 'Tus playlists' : 'De tus listas, para hoy'}</p>
          <button type="button" onClick={() => void disconnect()} className="flex items-center gap-1 text-[10px] text-white/60 hover:text-white"><LogOut className="size-3" /> Desconectar</button>
        </div>
        {choosing && <label className="mb-3 flex items-center gap-2 rounded-xl border border-white/15 px-2.5 py-2">
          <Search aria-hidden className="size-3.5 text-white/50" />
          <input aria-label="Buscar en mis playlists" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar entre tus listas" className="min-w-0 flex-1 bg-transparent text-xs text-white placeholder:text-white/50" />
        </label>}
        {library.isPending && <p role="status" className="py-4 text-center text-xs text-white/65">Cargando tus playlists…</p>}
        {library.error && <div role="alert" className="mb-3 text-xs text-amber-200">
          <p>{library.error.message || 'No se pudo cargar tu biblioteca. Comprueba tu conexión.'}</p>
          <button type="button" disabled={connecting || library.isFetching} onClick={() => reconnect ? void connect() : void library.refetch()} className="mt-2 rounded-full bg-white/10 px-3 py-1.5 text-white hover:bg-white/20">{reconnect ? 'Reconectar Spotify' : 'Reintentar'}</button>
        </div>}
        <div className="soft-scroll grid max-h-64 grid-cols-2 gap-2 overflow-y-auto p-0.5">
          {visible.map((playlist) => <button key={playlist.id} type="button" aria-pressed={selected?.id === playlist.id} onClick={() => choose(playlist)} className={`flex min-w-0 items-center gap-2 rounded-xl p-2 text-left transition-colors ${selected?.id === playlist.id ? 'bg-white/15 ring-1 ring-sky-200/60' : 'hover:bg-white/10'}`}>
            {playlist.images?.[0]?.url ? <img src={playlist.images[0].url} alt="" className="size-10 shrink-0 rounded-lg object-cover" loading="lazy" /> : <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-lg bg-white/10"><Music2 className="size-4" /></span>}
            <span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-medium">{playlist.name}</span><span className="block truncate text-[10px] text-white/60">{playlist.owner?.display_name ?? 'Tu playlist'}</span></span>
            {selected?.id === playlist.id && <Check aria-hidden className="size-3 shrink-0 text-sky-200" />}
          </button>)}
        </div>
        {!library.isPending && !library.error && visible.length === 0 && <p className="py-3 text-center text-xs text-white/60">{search ? 'No hay coincidencias entre las listas cargadas.' : 'Todavía no hay playlists en esta cuenta de Spotify.'}</p>}
        {!choosing && playlists.length > 4 && <button type="button" onClick={() => setChoosing(true)} className="mt-3 text-[11px] text-white/75 hover:underline">Ver todas mis playlists</button>}
        {library.hasNextPage && <button type="button" disabled={library.isFetchingNextPage} onClick={() => void library.fetchNextPage()} className="mt-3 rounded-full bg-white/10 px-3 py-1.5 text-[11px] hover:bg-white/20 disabled:opacity-50">{library.isFetchingNextPage ? 'Cargando…' : 'Cargar más playlists'}</button>}
        <p className="mt-3 text-[10px] text-white/45">Solo las listas de tu cuenta de Spotify · Tu última elección se recuerda en este navegador.</p>
      </div>}
      {connected && selected && <>
        <iframe key={selected.id} title="Reproductor de Spotify: tu música" src={`https://open.spotify.com/embed/playlist/${selected.id}?utm_source=generator&theme=0`} width="100%" height={expanded ? 352 : 152} className="block max-w-full rounded-[14px] border-0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" />
        <button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} className="mx-auto mt-1 flex items-center gap-1 rounded-full px-2 py-1 text-[10px] text-white/65 hover:text-white">{expanded ? 'Ver menos' : 'Ampliar reproductor'} <ChevronDown className={`size-3 transition-transform ${expanded ? 'rotate-180' : ''}`} /></button>
      </>}
    </section>
  )
}
