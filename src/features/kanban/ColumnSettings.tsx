import { Link } from 'react-router'
import { useProfile } from '../settings/hooks'
import { useGoogleBoard, useGoogleTasksStatus } from '../google-tasks/api'
import { defaultColumns, useLocalColumns } from './local-columns'
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
  const { config } = useLocalColumns(userId)
  const board = useGoogleBoard(google)
  const { selected, save } = useColumnVisibility(userId, google ? 'google' : 'local')
  const columns: { id: string; title: string }[] = google ? board.data?.columns ?? [] : [...defaultColumns, ...config.columns]
  const visible = visibleColumns(columns, selected).map(c => c.id)
  return <div className="flex flex-col gap-3">
    <p className="text-sm text-ink-soft">Elige hasta seis columnas para mostrar en el tablero. Ocultarlas conserva sus tareas.</p>
    {google && board.isLoading && <Spinner />}
    {google && board.error && <ErrorNote error={board.error} onRetry={() => void board.refetch()} />}
    <p className="text-xs text-muted">{visible.length} de {MAX_COLUMNS} columnas visibles</p>
    <div className="flex flex-col gap-2">{columns.map(column => <label key={column.id} className="flex items-center gap-3 rounded-tile bg-card/60 px-3 py-2 text-sm">
      <input type="checkbox" className="size-4 accent-ink" checked={visible.includes(column.id)} disabled={!visible.includes(column.id) && visible.length >= MAX_COLUMNS} onChange={event => save(event.target.checked ? [...visible, column.id] : visible.filter(id => id !== column.id))} />{column.title}
    </label>)}</div>
    <Link to="/kanban" className="text-sm underline">Ir al tablero para añadir columnas</Link>
    <p className="text-xs text-muted">Esta selección se guarda para tu cuenta en este navegador.</p>
  </div>
}
