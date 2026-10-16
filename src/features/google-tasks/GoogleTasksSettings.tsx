import { useState } from 'react'
import { Segmented } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { ErrorNote, Spinner } from '@/components/ui/States'
import { isDemo } from '@/lib/env'
import { connectGoogleTasks, useGoogleTasksMutation, useGoogleTasksStatus } from './api'

export function GoogleTasksSettings() {
  const status = useGoogleTasksStatus()
  const mutation = useGoogleTasksMutation()
  const [connecting, setConnecting] = useState(false)
  const [choice, setChoice] = useState<'readonly' | 'write' | null>(null)
  const connected = status.data?.state === 'connected'
  const mode = connected ? (status.data?.mode ?? 'write') : (choice ?? status.data?.mode ?? 'readonly')
  const [error, setError] = useState<Error | null>(null)
  if (status.isLoading) return <Spinner />
  return <div className="flex flex-col items-start gap-3">
    <p className="text-sm text-ink-soft">Conecta Google Tasks para ver una columna por lista en el kanban. Las tareas y los cambios se guardan en Google.</p>
    <fieldset disabled={mutation.isPending || connecting || !status.data}>
      <Segmented<'readonly' | 'write'> label="Modo de Google Tasks" value={mode} options={[{ value: 'readonly', label: 'Solo lectura' }, { value: 'write', label: 'Permitir edición' }]} onChange={next => {
        if (connected) mutation.mutate({ action: 'mode', mode: next })
        else setChoice(next)
      }} />
    </fieldset>
    <p className="text-xs text-muted">Solo lectura permite consultar sin modificar. Puedes activar la edición cuando quieras. Este modo se aplica a Mi espacio.</p>
    {status.error && <ErrorNote error={status.error} onRetry={() => void status.refetch()} />}
    {(error || mutation.error) && <ErrorNote error={error ?? mutation.error} />}
    {status.data?.state === 'connected' ? <>
      <p className="text-sm">Conectado como <strong>{status.data.email ?? 'Google'}</strong></p>
      <Button variant="danger" disabled={mutation.isPending} onClick={() => mutation.mutate({ action: 'disconnect' })}>Desconectar Google Tasks</Button>
      <p className="text-xs text-muted">Desconectar devuelve el tablero habitual y conserva tus listas y tareas en Google. El permiso de Google se puede revocar desde tu cuenta.</p>
    </> : <>
      {status.data?.state === 'not_configured' && <p className="text-sm">Falta configurar la conexión de Google en el servidor.</p>}
      {isDemo && <p className="text-sm text-muted">Inicia sesión en la aplicación para conectar tu cuenta real.</p>}
      <Button disabled={isDemo || connecting || status.data?.state === 'not_configured' || !status.data} onClick={async () => {
        setConnecting(true); setError(null)
        try { await connectGoogleTasks(mode) } catch (e) { setError(e instanceof Error ? e : new Error('No se pudo conectar')) } finally { setConnecting(false) }
      }}>{status.data?.state === 'needs_reauth' ? 'Reconectar Google Tasks' : 'Conectar Google Tasks'}</Button>
    </>}
  </div>
}
