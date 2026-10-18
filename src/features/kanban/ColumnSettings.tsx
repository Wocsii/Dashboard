import { useState } from 'react'
import { Field, Input } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { type ProjectColor } from '@/config/theme.config'
import { useGoogleColumnColors } from '../google-tasks/useGoogleColumnColors'
import { ColumnColorPicker } from './ColumnColorPicker'
import { Button } from '@/components/ui/Button'
import { Link } from 'react-router'
import { useProfile } from '../settings/hooks'
import { useGoogleBoard, useGoogleTasksMutation, useGoogleTasksStatus } from '../google-tasks/api'
import { editLocalColumn, localDefinitions, removeLocalColumn, useLocalColumns } from './local-columns'
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
  const { colors, setColor } = useGoogleColumnColors(userId)
  const [editing, setEditing] = useState<{ id: string; title: string; originalTitle: string; color: ProjectColor; colorChanged?: boolean; etag?: string } | null>(null)
  const { config, setConfig, storageError } = useLocalColumns(userId)
  const board = useGoogleBoard(google)
  const { selected, save } = useColumnVisibility(userId, google ? 'google' : 'local')
  const columns: { id: string; title: string; color?: ProjectColor; etag?: string }[] = google ? board.data?.columns ?? [] : localDefinitions(config)
  const visible = visibleColumns(columns, selected).map(c => c.id)
  return <div className="flex flex-col gap-3">
    <p className="text-sm text-ink-soft">Elige hasta seis columnas para mostrar en el tablero. Ocultarlas conserva sus tareas.</p>
    {google && board.isLoading && <Spinner />}
    {google && board.error && <ErrorNote error={board.error} onRetry={() => void board.refetch()} />}
    <p className="text-xs text-muted">{visible.length} de {MAX_COLUMNS} columnas visibles</p>
    <div className="flex flex-col gap-2">{columns.map(column => <div key={column.id} className="flex flex-wrap items-center gap-2"><label className="flex min-w-0 flex-1 items-center gap-3 rounded-tile bg-card/60 px-3 py-2 text-sm">
      <input type="checkbox" className="size-4 accent-ink" checked={visible.includes(column.id)} disabled={!visible.includes(column.id) && visible.length >= MAX_COLUMNS} onChange={event => save(event.target.checked ? [...visible, column.id] : visible.filter(id => id !== column.id))} /><span className="min-w-0 break-words">{column.title}</span>
    </label><Button size="sm" variant="ghost" disabled={mutation.isPending} aria-label={`Editar columna ${column.title}`} onClick={() => {
      mutation.reset()
      const defaults: Record<string, ProjectColor> = { todo: 'sky', in_progress: 'sun', blocked: 'coral', done: 'mint' }
      setEditing({ id: column.id, title: column.title, originalTitle: column.title, color: google ? colors[column.id] ?? 'sky' : column.color ?? defaults[column.id] ?? 'sky', etag: column.etag })
    }}>Editar</Button><Button size="sm" variant="danger" disabled={google ? !board.data?.canWrite || mutation.isPending : columns.length <= 1} onClick={() => {
      const message = google ? `¿Eliminar «${column.title}» y todas sus tareas de Google Tasks? Esta acción no se puede deshacer.` : `¿Eliminar la columna «${column.title}»? Sus tareas se conservarán y aparecerán en otra columna sin cambiar su estado ni su vínculo con el reloj.`
      if (!window.confirm(message)) return
      if (google) mutation.mutate({ action: 'deleteList', list: column.id }, { onSuccess: () => save(visible.filter(id => id !== column.id)) })
      else { setConfig(removeLocalColumn(config, column.id)); save(visible.filter(id => id !== column.id)) }
    }} aria-label={`Eliminar columna ${column.title}`}>Eliminar</Button></div>)}</div>
    {((!editing && mutation.error) || storageError) && <ErrorNote error={mutation.error ?? storageError} />}
    <Modal open={!!editing} onClose={() => { if (!mutation.isPending) setEditing(null) }} title="Editar columna">
      {editing && <form className="flex flex-col gap-4" onSubmit={event => {
        event.preventDefault()
        const title = editing.title.trim()
        if (!title) return
        const finish = () => {
          if (google) setColor(editing.id, editing.color)
          setEditing(null)
        }
        if (google) {
          if (title !== editing.originalTitle) {
            if (!board.data?.canWrite) return
            mutation.mutate({ action: 'renameList', list: editing.id, title, etag: editing.etag }, { onSuccess: finish })
          } else finish()
        } else {
          setConfig(previous => editLocalColumn(previous, editing.id, title, editing.colorChanged ? editing.color : undefined))
          finish()
        }
      }}>
        <Field label="Nombre de la columna">{id => <Input id={id} required maxLength={google ? 1024 : 80} autoFocus value={editing.title} readOnly={google && !board.data?.canWrite} disabled={mutation.isPending} onChange={event => setEditing({ ...editing, title: event.target.value })} />}</Field>
        <fieldset disabled={mutation.isPending}><ColumnColorPicker value={editing.color} onChange={color => setEditing({ ...editing, color, colorChanged: true })} /></fieldset>
        <p className="text-xs text-muted">{google ? board.data?.canWrite ? 'El nombre se actualiza en Google Tasks. El color se guarda en este navegador para tu cuenta.' : 'Google Tasks está en solo lectura. Puedes cambiar el color; para cambiar el nombre, activa la edición.' : 'El nombre y el color se guardan en este navegador para tu cuenta. Las tareas conservan su estado y su tiempo registrado.'}</p>
        {mutation.error && <ErrorNote error={mutation.error} />}
        <div className="flex justify-end gap-2"><Button variant="ghost" disabled={mutation.isPending} onClick={() => setEditing(null)}>Cancelar</Button><Button type="submit" disabled={mutation.isPending || !editing.title.trim()}>Guardar cambios</Button></div>
      </form>}
    </Modal>
    <Link to="/kanban" className="text-sm underline">Ir al tablero para añadir columnas</Link>
    <p className="text-xs text-muted">Esta selección se guarda para tu cuenta en este navegador.</p>
  </div>
}
