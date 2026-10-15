import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { SkyFrame } from '@/components/layout/SkyFrame'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { themeConfig } from '@/config/theme.config'
import { isEmbedded } from '@/lib/env'
import { useAuth } from './AuthProvider'

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-4" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

export function LoginPage() {
  const { signInWithGoogle } = useAuth()
  const [error, setError] = useState<string | null>(() => {
    // Supabase devuelve ?error_description=… si el alta falla (p. ej. email fuera de la lista blanca)
    const err = new URLSearchParams(window.location.search).get('error_description')
    if (!err) return null
    return err.includes('acceso') || err.includes('Database') ? 'Este email no tiene acceso a la aplicación.' : err
  })
  const [opened, setOpened] = useState(false)

  const login = async () => {
    setError(null)
    try {
      await signInWithGoogle()
      if (isEmbedded) setOpened(true)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  // Pestaña abierta desde la extensión con ?login=google → lanzar el login directamente
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('login') === 'google' && !isEmbedded) void signInWithGoogle().catch((e: Error) => setError(e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <SkyFrame>
      <main className="grid h-full place-items-center p-6">
        <Card className="relative w-full max-w-md overflow-visible px-8 pt-28 pb-8 text-center animate-rise" tone="ivory">
          <img
            src={themeConfig.assets.hero}
            alt=""
            className="absolute -top-24 left-1/2 h-48 -translate-x-1/2 drop-shadow-xl"
          />
          <h1 className="font-display text-5xl leading-none">{themeConfig.greeting}</h1>
          <p className="mt-3 text-sm text-ink-soft">Entra en {themeConfig.appName} para ver tu día.</p>
          <Button onClick={login} className="mt-8 w-full" size="md" variant="light">
            <GoogleMark /> Continuar con Google
          </Button>
          {opened && (
            <div className="mt-5 rounded-tile bg-sky-50 p-4 text-left text-xs text-ink-soft">
              Se ha abierto una pestaña para iniciar sesión con Google. Cuando termines, vuelve aquí.
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => window.location.reload()}>
                <RefreshCw className="size-3.5" /> Ya he iniciado sesión
              </Button>
            </div>
          )}
          {error && (
            <p role="alert" className="mt-5 rounded-tile bg-blush/70 px-4 py-3 text-sm text-ink-soft">
              {error}
            </p>
          )}
        </Card>
      </main>
    </SkyFrame>
  )
}
