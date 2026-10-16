import { useState } from 'react'
import { closestCorners, DndContext, KeyboardSensor, PointerSensor, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { ErrorNote, Spinner } from '@/components/ui/States'
import { useGoogleBoard, useGoogleTasksMutation, type GoogleColumn, type GoogleTask } from './api'

function TaskCard({ task, list, onOpen, pending, readOnly }: { readOnly: boolean; task: GoogleTask; list: string; onOpen: () => void; pending: boolean }) {
  const { setNodeRef, transform, transition, attributes, listeners } = useSortable({ id: JSON.stringify([list, task.id]), data: { list, task }, disabled: pending || readOnly })
  return <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition: transition }} className="rounded-tile bg-card p-3 shadow-pill">
    <div className="flex items-start gap-2">
      {!readOnly && <button type="button" aria-label={`Mover ${task.title}`} className="touch-none rounded p-1 text-muted" {...attributes} {...listeners}>⠿</button>}
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <span className={task.status === 'completed' ? 'text-sm line-through text-muted' : 'text-sm font-medium'}>{task.title || '(Sin título)'}</span>
        {task.parent && <span className="block text-xs text-muted">Subtarea</span>}
        {task.due && <span className="mt-1 block text-xs text-muted">{task.due.slice(0, 10)}</span>}
        {task.status === 'completed' && <span className="block text-xs text-muted">Completada</span>}
      </button>
    </div>
  </li>
}
function Column({ column, onEdit, onAdd, pending, readOnly }: { readOnly: boolean; column: GoogleColumn; onEdit: (task: GoogleTask) => void; onAdd: () => void; pending: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id, data: { list: column.id } })
  return <section ref={setNodeRef} aria-label={column.title} className={`min-h-40 rounded-card p-3 shadow-pill ${isOver ? 'bg-glass-strong' : 'bg-glass'}`}>
    <header className="mb-3 flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">{column.title} <span className="text-muted">{column.tasks.length}</span></h2>{!readOnly && <Button size="sm" variant="ghost" disabled={pending} onClick={onAdd}>Añadir tarea</Button>}</header>
    <SortableContext items={column.tasks.map(t => JSON.stringify([column.id, t.id]))}>
      <ul className="flex flex-col gap-3">{column.tasks.map(task => <TaskCard key={task.id} task={task} list={column.id} readOnly={readOnly} pending={pending} onOpen={() => onEdit(task)} />)}</ul>
    </SortableContext>
    {!column.tasks.length && <p className="py-6 text-center text-xs text-muted">{readOnly ? 'Sin tareas.' : 'Sin tareas. Añade una o arrástrala aquí.'}</p>}
  </section>
}
export function GoogleTasksBoard() {
  const board = useGoogleBoard(true)
  const mutation = useGoogleTasksMutation()
  const [edit, setEdit] = useState<{ list: string; task?: GoogleTask } | null>(null)
  const [newList, setNewList] = useState(false)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
  const columns = board.data?.columns ?? []
  const canWrite = board.data?.canWrite === true
  const close = () => { setEdit(null); setNewList(false); mutation.reset() }
  function onDragEnd({ active, over }: DragEndEvent) {
    if (!canWrite || !over || active.id === over.id) return
    const from = active.data.current as { list: string; task: GoogleTask }
    const destination = over.data.current?.list as string | undefined
    if (!destination) return
    const target = columns.find(c => c.id === destination)
    const index = target?.tasks.findIndex(t => JSON.stringify([destination, t.id]) === over.id) ?? -1
    const previous = index > 0 ? target?.tasks[index - 1] : undefined
    mutation.mutate({ action: 'move', list: from.list, task: from.task.id, destination, ...(previous && previous.id !== from.task.id ? { previous: previous.id } : {}) })
  }
  return <>
    <PageHeader title="Tablero" subtitle="Tus listas y tareas de Google Tasks" actions={<><Button variant="light" disabled={board.isFetching} onClick={() => void board.refetch()}>Actualizar</Button>{canWrite && <Button onClick={() => { mutation.reset(); setNewList(true) }}>Añadir columna</Button>}</>} />
    <p className="mb-4 text-sm text-ink-soft">{canWrite ? 'Cada columna es una lista de Google Tasks. Arrastra las tarjetas o cambia su lista al editarlas.' : 'Solo lectura. Puedes activar la edición desde Ajustes.'} <Link to="/ajustes" className="underline">Gestionar conexión</Link></p>
    {board.isLoading && <Spinner />}
    {board.error && <ErrorNote error={board.error} onRetry={() => void board.refetch()} />}
    {mutation.error && !edit && !newList && <ErrorNote error={mutation.error} />}
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
      <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4">{columns.map(column => <Column key={column.id} column={column} readOnly={!canWrite} pending={mutation.isPending} onAdd={() => { mutation.reset(); setEdit({ list: column.id }) }} onEdit={task => { mutation.reset(); setEdit({ list: column.id, task }) }} />)}</div>
    </DndContext>
    {!board.isLoading && !board.error && !columns.length && <p className="py-8 text-sm text-muted">No tienes listas. {canWrite ? 'Pulsa «Añadir columna» para crear la primera.' : 'Las listas que crees en Google aparecerán aquí.'}</p>}
    <Modal open={newList && canWrite} onClose={close} title="Añadir columna">
      <form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); mutation.mutate({ action: 'list', title: f.get('title') }, { onSuccess: close }) }}>
        <Field label="Nombre de la lista">{id => <Input id={id} name="title" required maxLength={1024} />}</Field>
        {mutation.error && <ErrorNote error={mutation.error} />}<Button type="submit" disabled={mutation.isPending}>Crear lista en Google Tasks</Button>
      </form>
    </Modal>
    <Modal open={!!edit && (canWrite || !!edit.task)} onClose={close} title={!canWrite ? 'Tarea de Google Tasks' : edit?.task ? 'Editar tarea de Google Tasks' : 'Nueva tarea de Google Tasks'}>
      {edit && <form key={`${edit.list}:${edit.task?.id ?? 'new'}`} className="flex flex-col gap-4" onSubmit={e => {
        e.preventDefault(); if (!canWrite) return; const f = new FormData(e.currentTarget)
        mutation.mutate({ action: 'save', list: edit.list, task: edit.task?.id, etag: edit.task?.etag, data: { title: f.get('title'), notes: f.get('notes'), due: f.get('due') ? `${f.get('due')}T00:00:00.000Z` : null, status: f.get('completed') ? 'completed' : 'needsAction' } }, { onSuccess: close })
      }}>
        <Field label="Título">{id => <Input id={id} name="title" readOnly={!canWrite} required maxLength={1024} defaultValue={edit.task?.title} />}</Field>
        <Field label="Notas">{id => <textarea id={id} name="notes" readOnly={!canWrite} maxLength={8192} defaultValue={edit.task?.notes} className="min-h-24 rounded-tile border border-line bg-card p-3" />}</Field>
        <Field label="Fecha">{id => <Input id={id} name="due" readOnly={!canWrite} type="date" defaultValue={edit.task?.due?.slice(0, 10)} />}</Field>
        <label className="flex gap-2 text-sm"><input name="completed" disabled={!canWrite} type="checkbox" defaultChecked={edit.task?.status === 'completed'} />Completada</label>
        {canWrite && edit.task && <Field label="Mover a otra lista">{id => <select id={id} value={edit.list} disabled={mutation.isPending} className="rounded-tile border border-line bg-card p-2" onChange={e => mutation.mutate({ action: 'move', list: edit.list, task: edit.task!.id, destination: e.target.value }, { onSuccess: close })}>{columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select>}</Field>}
        {mutation.error && <ErrorNote error={mutation.error} />}
        {canWrite && <div className="flex justify-end gap-2">{edit.task && <Button type="button" variant="danger" disabled={mutation.isPending} onClick={() => { if (window.confirm('¿Eliminar esta tarea de Google Tasks?')) mutation.mutate({ action: 'delete', list: edit.list, task: edit.task!.id, etag: edit.task!.etag }, { onSuccess: close }) }}>Eliminar</Button>}<Button type="submit" disabled={mutation.isPending}>Guardar en Google Tasks</Button></div>}
      </form>}
    </Modal>
  </>
}
