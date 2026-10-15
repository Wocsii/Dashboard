import { useEffect, useState } from 'react'
import { Music2 } from 'lucide-react'
import { beginAuthorization, completeAuthorization } from './api'

// Share a single operation across React StrictMode's repeated effect setup.
let operation: Promise<unknown> | undefined
export function SpotifyCallbackPage() {
  const [message, setMessage] = useState(() => window.opener ? 'Conectando tu cuenta de Spotify…' : 'Abre «Conectar Spotify» desde tu dashboard para vincular tu cuenta.')
  useEffect(() => {
    let active = true
    if (!window.opener) return
    const start = location.pathname === '/spotify/connect'
    const search = location.search
    if (!start) history.replaceState(null, '', location.pathname)
    operation ??= start ? beginAuthorization() : completeAuthorization(search)
    operation.then((session) => {
      if (!active || start) return
      window.opener.postMessage({ type: 'dashboard:spotify:connection', session }, location.origin)
      setMessage('Spotify conectado. Ya puedes elegir tus playlists en el dashboard.')
      window.close()
    }).catch((error: unknown) => {
      if (!active) return
      const detail = error instanceof Error ? error.message : 'No se pudo conectar Spotify. Vuelve a intentarlo.'
      setMessage(detail)
      window.opener?.postMessage({ type: 'dashboard:spotify:connection', error: detail }, location.origin)
    })
    return () => { active = false }
  }, [])
  return (
    <main className="grid min-h-screen place-items-center bg-[#242827] p-6 text-white">
      <div className="max-w-sm text-center">
        <Music2 className="mx-auto mb-4 size-10 text-sky-200" />
        <h1 className="mb-3 text-xl font-semibold">Tu Spotify</h1>
        <p role="status" className="text-sm text-white/75">{message}</p>
        <button type="button" onClick={() => window.close()} className="mt-6 rounded-full bg-white/10 px-5 py-2 text-sm hover:bg-white/20">Cerrar ventana</button>
      </div>
    </main>
  )
}
