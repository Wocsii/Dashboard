import { useEffect } from 'react'
import { useSearchParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Link2Off, LogOut, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { ErrorNote, Spinner } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { resetDemoData } from '@/data/demoRepository'
import { isDemo } from '@/lib/env'
import { useAuth } from '../auth/AuthProvider'
import { AppleConnectionPanel } from '../calendar/AppleConnectionPanel'
import { CalendarStatusPanel } from '../calendar/CalendarStatusPanel'
import { calendarKeys, useCalendars, useCalendarStatus, useDisconnectCalendar } from '../calendar/hooks'
import { useProfile, useSettings, useUpdateProfile, useUpdateSettings } from './hooks'

const calendarMessages: Record<string, [string, 'info' | 'error']> = {
  connected: ['Google Calendar conectado ✨', 'info'],
  denied: ['Has cancelado el permiso de Google Calendar', 'error'],
  invalid_state: ['La conexión ha caducado. Vuelve a intentarlo.', 'error'],
  not_configured: ['Google Calendar no está configurado en el servidor', 'error'],
  error: ['No se pudo conectar Google Calendar', 'error'],
}

function CalendarSettings() {
  const qc = useQueryClient()
  const status = useCalendarStatus('google')
  const connected = status.data?.state === 'connected'
  const calendars = useCalendars(connected,'google')
  const { data: settings } = useSettings()
  const updateSettings = useUpdateSettings()
  const disconnect = useDisconnectCalendar('google')

  const toggle = (id: string, visible: boolean) => {
    const current = (calendars.data ?? []).filter((c) => c.visible).map((c) => c.id)
    const next = visible ? [...new Set([...current, id])] : current.filter((c) => c !== id)
    updateSettings.mutate(
      { visible_calendar_ids: next },
      {
        onSuccess: () => {
          void qc.invalidateQueries({ queryKey: calendarKeys.calendars })
          void qc.invalidateQueries({ queryKey: ['calendar', 'events'] })
        },
      },
    )
  }

  if (status.isLoading) return <Spinner />
  if (status.error) return <ErrorNote error={status.error} onRetry={() => void status.refetch()} />
  if (!connected) return status.data ? <CalendarStatusPanel status={status.data} /> : null

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-soft">
        Conectado como <strong>{status.data?.state === 'connected' ? (status.data.email ?? 'Google') : ''}</strong> · {status.data?.state === 'connected' && status.data.canWrite ? 'lectura y edición de eventos' : 'solo lectura'}
      </p>
      <div>
        <p className="mb-2 text-xs font-medium text-ink-soft">Calendarios visibles</p>
        {calendars.isLoading && <Spinner />}
        {calendars.error && <ErrorNote error={calendars.error} onRetry={() => void calendars.refetch()} />}
        <ul className="flex flex-col gap-1.5">
          {(calendars.data ?? []).map((c) => (
            <li key={c.id}>
              <label className="flex items-center gap-3 rounded-tile px-3 py-2 text-sm hover:bg-sky-50">
                <input type="checkbox" className="size-4 accent-ink" checked={c.visible} onChange={(e) => toggle(c.id, e.target.checked)} disabled={!settings} />
                <span className="size-3 rounded-full" style={{ background: c.color }} aria-hidden />
                {c.summary}
                {c.primary && <span className="text-[11px] text-muted">principal</span>}
              </label>
            </li>
          ))}
        </ul>
      </div>
      {!isDemo && (
        <div>
          <Button variant="danger" size="sm" onClick={() => disconnect.mutate()} disabled={disconnect.isPending}>
            <Link2Off className="size-3.5" /> Desconectar Google Calendar
          </Button>
        </div>
      )}
    </div>
  )
}

export function SettingsPage() {
  const [params, setParams] = useSearchParams()
  const toast = useToast()
  const { email, signOut } = useAuth()
  const { data: profile } = useProfile()
  const updateProfile = useUpdateProfile()

  // Resultado de volver de Google (?calendar=connected|denied|...)
  useEffect(() => {
    const r = params.get('calendar')
    if (!r) return
    const [msg, tone] = calendarMessages[r] ?? calendarMessages.error
    toast(msg, tone)
    setParams({}, { replace: true })
  }, [params, setParams, toast])

  return (
    <>
      <PageHeader title="Ajustes" subtitle={email ? `Sesión iniciada como ${email}` : undefined} />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-5">
          <Card>
            <h2 className="mb-4 text-sm font-semibold">Google Calendar</h2>
            <CalendarSettings />
          </Card>
          <Card>
            <h2 className="mb-4 text-sm font-semibold">Apple Calendar · iCloud</h2>
            <AppleConnectionPanel />
          </Card>
        </div>
        <div className="flex flex-col gap-5">
          <Card>
            <h2 className="mb-4 text-sm font-semibold">Perfil</h2>
            {profile && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nombre">
                  {(id) => (
                    <Input id={id} defaultValue={profile.display_name ?? ''} onBlur={(e) => e.target.value !== profile.display_name && updateProfile.mutate({ display_name: e.target.value })} />
                  )}
                </Field>
                <Field label="Zona horaria">
                  {(id) => <Input id={id} defaultValue={profile.timezone} onBlur={(e) => e.target.value !== profile.timezone && updateProfile.mutate({ timezone: e.target.value })} />}
                </Field>
              </div>
            )}
            <p className="mt-3 text-[11px] text-muted">
              El saludo, colores, fondo e ilustraciones se cambian desde el código: <code>src/config/theme.config.ts</code> y <code>src/styles/tokens.css</code>.
            </p>
          </Card>
          <Card>
            <h2 className="mb-4 text-sm font-semibold">Sesión</h2>
            {isDemo ? (
              <div className="flex flex-col items-start gap-3">
                <p className="text-sm text-ink-soft">Estás en modo demo: configura Supabase (ver <code>docs/INSTALL.md</code>) para guardar en la nube.</p>
                <Button
                  variant="light"
                  size="sm"
                  onClick={() => {
                    resetDemoData()
                    window.location.reload()
                  }}
                >
                  <RotateCcw className="size-3.5" /> Restaurar datos de ejemplo
                </Button>
              </div>
            ) : (
              <Button variant="light" onClick={() => void signOut()}>
                <LogOut className="size-4" /> Cerrar sesión
              </Button>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}
