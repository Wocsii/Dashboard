import { Button } from '@/components/ui/Button'
import { Link } from 'react-router'
import { useProfile } from '../settings/hooks'
import { useGoogleBoard, useGoogleTasksMutation, useGoogleTasksStatus } from '../google-tasks/api'
import { localDefinitions, removeLocalColumn, useLocalColumns } from './local-columns'
import { MAX_COLUMNS, useColumnVisibility, visibleColumns } from './column-visibility'
import { ErrorNote, Spinner } from '@/components/ui/States'

export function ColumnSettings() {
  const profile = useProfile()
  const status = useGoogleTasksStatus()
  if (profile.isLoading || status.isLoading) return <Spinner />
  if (profile.error || status.error) return <ErrorNote error={profile.error ?? status.error} />
  return profile.data ? <Choices key={profile.data.id} userId={profile.data.id} google={status.data?.state === 'connected'} /> : null
}
function Choices({ userId, google }: { userId: string; google: boolean }) {
  const mutation = useGoogleTasksMutation()
  const { config, setConfig, storageError } = useLocalColumns(userId)
  const board = useGoogleBoard(google)
  const { selected, save } = useColumnVisibility(userId, google ? 'google' : 'local')
  const columns: { id: string; title: string }[] = google ? board.data?.columns ?? [] : localDefinitions(config)
  const visible = visibleColumns(columns, selected).map(c => c.id)
  return <div className="flex flex-col gap-3">
    <p className="text-sm text-ink-soft">Elige hasta seis columnas para mostrar en el tablero. Ocultarlas conserva sus tareas.</p>
    {google && board.isLoading && <Spinner />}
    {google && board.error && <ErrorNote error={board.error} onRetry={() => void board.refetch()} />}
    <p className="text-xs text-muted">{visible.length} de {MAX_COLUMNS} columnas visibles</p>
    <div className="flex flex-col gap-2">{columns.map(column => <div key={column.id} className="flex items-center gap-2"><label className="flex items-center gap-3 rounded-tile bg-card/60 px-3 py-2 text-sm">
      <input type="checkbox" className="size-4 accent-ink" checked={visible.includes(column.id)} disabled={!visible.includes(column.id) && visible.length >= MAX_COLUMNS} onChange={event => save(event.target.checked ? [...visible, column.id] : visible.filter(id => id !== column.id))} />{column.title}
    </label><Button size="sm" variant="danger" disabled={google ? !board.data?.canWrite || mutation.isPending : columns.length <= 1} onClick={() => {
      const message = google ? `¿Eliminar «${column.title}» y todas sus tareas de Google Tasks? Esta acción no se puede deshacer.` : `¿Eliminar la columna «${column.title}»? Sus tareas se conservarán y aparecerán en otra columna sin cambiar su estado ni su vínculo con el reloj.`
      if (!window.confirm(message)) return
      if (google) mutation.mutate({ action: 'deleteList', list: column.id }, { onSuccess: () => save(visible.filter(id => id !== column.id)) })
      else { setConfig(removeLocalColumn(config, column.id)); save(visible.filter(id => id !== column.id)) }
    }} aria-label={`Eliminar columna ${column.title}`}>Eliminar</Button></div>)}</div>
    {(mutation.error || storageError) && <ErrorNote error={mutation.error ?? storageError} />}
    <Link to="/kanban" className="text-sm underline">Ir al tablero para añadir columnas</Link>
    <p className="text-xs text-muted">Esta selección se guarda para tu cuenta en este navegador.</p>
  </div>
}
