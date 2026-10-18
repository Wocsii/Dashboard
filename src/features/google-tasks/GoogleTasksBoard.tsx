import { priorityRank } from '@/lib/tasks'
import type { TaskPriority } from '@/types/domain'
import { PriorityChip } from '../tasks/TaskBits'
import { useGoogleTaskPriorities } from './useGoogleTaskPriorities'
import { googleTaskKey } from './task-link'
import { GoogleTaskEditor } from './GoogleTaskEditor'
import { GoogleTaskFocusButton } from './GoogleTaskFocusButton'
import { SortableColumn } from '../kanban/SortableColumn'
import { boardKeyboardCoordinates, columnDragId, MAX_COLUMNS, useColumnVisibility, visibleColumns } from '../kanban/column-visibility'
import { ColumnColorPicker } from '../kanban/ColumnColorPicker'
import { useGoogleColumnColors } from './useGoogleColumnColors'
import { projectColorVar, type ProjectColor } from '@/config/theme.config'
import { useProfile } from '../settings/hooks'
import { useState } from 'react'
import { closestCorners, DndContext, KeyboardSensor, PointerSensor, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { ErrorNote, Spinner } from '@/components/ui/States'
import { useGoogleBoard, useGoogleTasksMutation, type GoogleColumn, type GoogleTask } from './api'

function TaskCard({ task, list, onOpen, pending, readOnly, priority }: { priority: TaskPriority; readOnly: boolean; task: GoogleTask; list: string; onOpen: () => void; pending: boolean }) {
  const { setNodeRef, transform, transition, attributes, listeners } = useSortable({ id: JSON.stringify([list, task.id]), data: { list, task }, disabled: pending || readOnly })
  return <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition: transition }} className="rounded-tile bg-card p-3 shadow-pill">
    <div className="flex items-start gap-2">
      {!readOnly && <button type="button" aria-label={`Mover ${task.title}`} className="touch-none rounded p-1 text-muted" {...attributes} {...listeners}>⠿</button>}
      <button type="button" aria-label={task.title || '(Sin título)'} onClick={onOpen} className="min-w-0 flex-1 text-left">
        <span className={task.status === 'completed' ? 'text-sm line-through text-muted' : 'text-sm font-medium'}>{task.title || '(Sin título)'}</span>
        {task.status !== 'completed' && <span className="mt-1 block"><PriorityChip priority={priority} /></span>}
        {task.parent && <span className="block text-xs text-muted">Subtarea</span>}
        {task.due && <span className="mt-1 block text-xs text-muted">{task.due.slice(0, 10)}</span>}
        {task.status === 'completed' && <span className="block text-xs text-muted">Completada</span>}
      </button>
      {task.status !== 'completed' && <GoogleTaskFocusButton list={list} task={task} />}
    </div>
  </li>
}
function Column({ column, onEdit, onAdd, pending, readOnly, color, priorities }: { priorities: Record<string, TaskPriority>; color: ProjectColor; readOnly: boolean; column: GoogleColumn; onEdit: (task: GoogleTask) => void; onAdd: () => void; pending: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id, data: { list: column.id } })
  return <section ref={setNodeRef} aria-label={column.title} className={`min-h-40 rounded-card p-3 shadow-pill ${isOver ? 'bg-glass-strong' : 'bg-glass'}`}>
    <header className="mb-3 flex items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-sm font-semibold"><span className="size-2 shrink-0 rounded-full" style={{ background: projectColorVar(color) }} aria-hidden />{column.title} <span className="text-muted">{column.tasks.length}</span></h2>{!readOnly && <Button size="sm" variant="ghost" disabled={pending} onClick={onAdd}>Añadir tarea</Button>}</header>
    <SortableContext items={column.tasks.map(t => JSON.stringify([column.id, t.id]))}>
      <ul className="flex flex-col gap-3">{column.tasks.map(task => <TaskCard key={task.id} task={task} list={column.id} priority={priorities[googleTaskKey(column.id, task.id)] ?? 'medium'} readOnly={readOnly} pending={pending} onOpen={() => onEdit(task)} />)}</ul>
    </SortableContext>
    {!column.tasks.length && <p className="py-6 text-center text-xs text-muted">{readOnly ? 'Sin tareas.' : 'Sin tareas. Añade una o arrástrala aquí.'}</p>}
  </section>
}
export function GoogleTasksBoard() {
  const { data: profile } = useProfile()
  const { selected, save: saveVisible } = useColumnVisibility(profile?.id ?? 'loading', 'google')
  const { colors, setColor } = useGoogleColumnColors(profile?.id)
  const [columnColor, setColumnColor] = useState<ProjectColor>('sky')
  const { priorities, setPriority } = useGoogleTaskPriorities()
  const board = useGoogleBoard(true)
  const mutation = useGoogleTasksMutation()
  const [edit, setEdit] = useState<{ list: string; task?: GoogleTask } | null>(null)
  const [newList, setNewList] = useState(false)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: boardKeyboardCoordinates }))
  const columns = (board.data?.columns ?? []).map(column => ({
    ...column,
    tasks: [...column.tasks].sort((a, b) => Number(a.status === 'completed') - Number(b.status === 'completed') || priorityRank[priorities[googleTaskKey(column.id, a.id)] ?? 'medium'] - priorityRank[priorities[googleTaskKey(column.id, b.id)] ?? 'medium']),
  }))
  const shownColumns = visibleColumns(columns, selected)
  const canWrite = board.data?.canWrite === true
  const close = () => { setEdit(null); setNewList(false); mutation.reset() }
  function onDragEnd({ active, over }: DragEndEvent) {
    const sourceColumn = active.data.current?.columnId as string | undefined
    if (sourceColumn) {
      const targetColumn = over?.data.current?.columnId as string | undefined
      const order = shownColumns.map(c => c.id)
      if (targetColumn && sourceColumn !== targetColumn) saveVisible(arrayMove(order, order.indexOf(sourceColumn), order.indexOf(targetColumn)))
      return
    }
    if (!canWrite || !over || active.id === over.id) return
    const from = active.data.current as { list: string; task: GoogleTask }
    const destination = over.data.current?.list as string | undefined
    if (!destination) return
    const target = columns.find(c => c.id === destination)
    const index = target?.tasks.findIndex(t => JSON.stringify([destination, t.id]) === over.id) ?? -1
    const previous = index > 0 ? target?.tasks[index - 1] : undefined
    mutation.mutate({ action: 'move', list: from.list, task: from.task.id, destination, ...(previous && previous.id !== from.task.id ? { previous: previous.id } : {}) }, { onSuccess: result => {
      if (destination !== from.list) {
        const id = result && typeof result === 'object' && 'id' in result && typeof result.id === 'string' ? result.id : from.task.id
        setPriority(destination, id, priorities[googleTaskKey(from.list, from.task.id)] ?? 'medium')
      }
    } })
  }
  return <>
    <PageHeader title="Tablero" subtitle="Tus listas y tareas de Google Tasks" actions={<><Button variant="light" disabled={board.isFetching} onClick={() => void board.refetch()}>Actualizar</Button>{canWrite && <Button disabled={columns.length >= MAX_COLUMNS} onClick={() => { mutation.reset(); setColumnColor('sky'); setNewList(true) }}>Añadir columna</Button>}</>} />
    <p className="mb-4 text-sm text-ink-soft">{canWrite ? 'Cada columna es una lista de Google Tasks. Arrastra las tarjetas o cambia su lista al editarlas.' : 'Solo lectura. Puedes activar la edición desde Ajustes.'} <Link to="/ajustes" className="underline">Elegir columnas y gestionar conexión</Link></p>
    {board.isLoading && <Spinner />}
    {board.error && <ErrorNote error={board.error} onRetry={() => void board.refetch()} />}
    {mutation.error && !edit && !newList && <ErrorNote error={mutation.error} />}
    <DndContext sensors={sensors} collisionDetection={args => closestCorners({ ...args, droppableContainers: args.droppableContainers.filter(container => Boolean(container.data.current?.columnId) === Boolean(args.active.data.current?.columnId)) })} onDragEnd={onDragEnd}>
      <SortableContext items={shownColumns.map(c => columnDragId(c.id))} strategy={rectSortingStrategy}><div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(210px,1fr))]">{shownColumns.map(column => <SortableColumn key={column.id} id={column.id} title={column.title}><Column column={column} priorities={priorities} color={colors[column.id] ?? 'sky'} readOnly={!canWrite} pending={mutation.isPending} onAdd={() => { mutation.reset(); setEdit({ list: column.id }) }} onEdit={task => { mutation.reset(); setEdit({ list: column.id, task }) }} /></SortableColumn>)}</div></SortableContext>
    </DndContext>
    {!board.isLoading && !board.error && !columns.length && <p className="py-8 text-sm text-muted">No tienes listas. {canWrite ? 'Pulsa «Añadir columna» para crear la primera.' : 'Las listas que crees en Google aparecerán aquí.'}</p>}
    <Modal open={newList && canWrite} onClose={close} title="Añadir columna">
      <form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); if (columns.length >= MAX_COLUMNS) return; const f = new FormData(e.currentTarget); mutation.mutate({ action: 'list', title: f.get('title') }, { onSuccess: result => { if (result && typeof result === 'object' && 'id' in result && typeof result.id === 'string') { setColor(result.id, columnColor); if (selected !== null) saveVisible([...shownColumns.map(c => c.id), result.id]) } close() } }) }}>
        <Field label="Nombre de la lista">{id => <Input id={id} name="title" required maxLength={1024} />}</Field>
        <ColumnColorPicker value={columnColor} onChange={setColumnColor} />
        {mutation.error && <ErrorNote error={mutation.error} />}<Button type="submit" disabled={mutation.isPending || !profile || columns.length >= MAX_COLUMNS}>Crear lista en Google Tasks</Button>
      </form>
    </Modal>
    {edit && <GoogleTaskEditor key={`${edit.list}:${edit.task?.id ?? 'new'}`} edit={edit} columns={columns} canWrite={canWrite} onClose={close} />}
  </>
}
