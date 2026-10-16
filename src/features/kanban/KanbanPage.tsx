import { TaskDialog } from '../tasks/TaskDialog'
import { useProfile } from '../settings/hooks'
import { Modal } from '@/components/ui/Modal'
import { Field, Input, Select } from '@/components/ui/Field'
import { defaultColumns, taskColumn, useLocalColumns, type LocalColumns } from './local-columns'
import { Link } from 'react-router'
import { useGoogleTasksStatus } from '../google-tasks/api'
import { GoogleTasksBoard } from '../google-tasks/GoogleTasksBoard'
import { useMemo, useRef, useState } from 'react'
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { Button, IconButton } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { ErrorNote, Spinner } from '@/components/ui/States'
import { copy } from '@/config/copy.es'
import { positionBetween } from '@/lib/positions'
import { cn } from '@/lib/cn'
import type { Project, Task, TaskStatus } from '@/types/domain'
import { useProjectMap, useProjects } from '../projects/hooks'
import { useQuickActions } from '../quick-actions'
import { useTasks, useUpdateTask } from '../tasks/hooks'
import { KanbanCard, KanbanCardView } from './KanbanCard'

type Columns = Record<string, string[]>

function buildColumns(tasks: Task[], config: LocalColumns): Columns {
  const cols: Columns = Object.fromEntries([...defaultColumns, ...config.columns].map(c => [c.id, []]))
  for (const t of [...tasks].sort((a, b) => a.position - b.position)) cols[taskColumn(t, config)].push(t.id)
  return cols
}

function findColumn(cols: Columns, id: string): string | undefined {
  if (Object.hasOwn(cols, id)) return id
  return Object.keys(cols).find(s => cols[s].includes(id))
}

/**
 * Teclado: ←/→ saltan a la columna vecina (por defecto dnd-kit solo reordena dentro
 * de la misma columna); ↑/↓ reordenan.
 */
const columnKeyboardCoordinates = (order: string[]): KeyboardCoordinateGetter => (event, args) => {
  if (event.code !== 'ArrowRight' && event.code !== 'ArrowLeft') return sortableKeyboardCoordinates(event, args)
  const { active, droppableRects } = args.context
  const from = active?.data.current?.sortable?.containerId as TaskStatus | undefined
  const to = from ? order[order.indexOf(from) + (event.code === 'ArrowRight' ? 1 : -1)] : undefined
  const rect = to ? droppableRects.get(to) : undefined
  if (!rect) return undefined
  event.preventDefault()
  return { x: rect.left + 8, y: rect.top + 8 }
}

function Column({ status, title, dot, ids, byId, projectMap, onOpen, onAdd }: {
  status: string
  title: string
  dot: string
  ids: string[]
  byId: Map<string, Task>
  projectMap: Map<string, Project>
  onOpen: (t: Task) => void
  onAdd: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <section aria-labelledby={`col-${status}`} className={cn('flex min-h-40 flex-col rounded-card bg-glass p-3 shadow-pill backdrop-blur-xl transition-colors', isOver && 'bg-glass-strong')}>
      <header className="mb-3 flex items-center justify-between px-1">
        <h2 id={`col-${status}`} className="flex items-center gap-2 text-sm font-semibold">
          <span className={cn('size-2 rounded-full', dot)} aria-hidden />
          {title}
          <span className="rounded-full bg-card/80 px-1.5 text-[11px] font-medium text-muted">{ids.length}</span>
        </h2>
        <IconButton label={`Añadir en ${title}`} size="sm" onClick={onAdd}>
          <Plus className="size-4" />
        </IconButton>
      </header>
      <SortableContext id={status} items={ids} strategy={verticalListSortingStrategy}>
        <ul ref={setNodeRef} className="flex flex-1 flex-col gap-2.5">
          {ids.map((id) => {
            const t = byId.get(id)
            if (!t) return null
            return <KanbanCard key={id} task={t} project={t.project_id ? projectMap.get(t.project_id) : undefined} onOpen={() => onOpen(t)} />
          })}
          {ids.length === 0 && <li className="grid flex-1 place-items-center rounded-tile border border-dashed border-ink/10 py-8 text-xs text-muted">Suelta aquí</li>}
        </ul>
      </SortableContext>
    </section>
  )
}

function LocalKanbanPage() {
  const profile = useProfile()
  if (profile.isLoading) return <Spinner />
  if (profile.error) return <ErrorNote error={profile.error} onRetry={() => void profile.refetch()} />
  return profile.data ? <LocalBoard key={profile.data.id} userId={profile.data.id} /> : null
}

function LocalBoard({ userId }: { userId: string }) {
  const { config, setConfig, assign, storageError } = useLocalColumns(userId)
  const definitions = useMemo(() => [...defaultColumns, ...config.columns.map(c => ({ ...c, dot: 'bg-sky-400' }))], [config.columns])
  const [addingColumn, setAddingColumn] = useState(false)
  const [newCardColumn, setNewCardColumn] = useState<string | null>(null)

  const { data: tasks, isLoading, error, refetch } = useTasks()
  const { data: projects = [] } = useProjects()
  const projectMap = useProjectMap()
  const update = useUpdateTask()
  const { newTask, editTask } = useQuickActions()
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [activeId, setActiveId] = useState<string | null>(null)
  // Evita abrir el editor con el "click" que algunos navegadores disparan al soltar
  const justDragged = useRef(false)
  const openTask = (t: Task) => {
    if (!justDragged.current) editTask(t)
  }

  const visible = useMemo(
    () => (tasks ?? []).filter((t) => projectFilter === 'all' || t.project_id === projectFilter),
    [tasks, projectFilter],
  )
  const initialColumns = useMemo(() => buildColumns(visible, config), [visible, config])
  const byId = useMemo(() => new Map(visible.map((t) => [t.id, t])), [visible])
  const [columns, setColumns] = useState<Columns>(initialColumns)
  const [syncedWith, setSyncedWith] = useState(initialColumns)

  // Sincroniza con los datos del servidor cuando no se está arrastrando
  if (syncedWith !== initialColumns && !activeId) {
    setSyncedWith(initialColumns)
    setColumns(initialColumns)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: columnKeyboardCoordinates(definitions.map(c => c.id)) }),
  )

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id))

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return
    const from = findColumn(columns, String(active.id))
    const to = findColumn(columns, String(over.id))
    if (!from || !to || from === to) return
    setColumns((cols) => {
      const overIndex = cols[to].indexOf(String(over.id))
      const index = overIndex >= 0 ? overIndex : cols[to].length
      return {
        ...cols,
        [from]: cols[from].filter((id) => id !== active.id),
        [to]: [...cols[to].slice(0, index), String(active.id), ...cols[to].slice(index)],
      }
    })
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null)
    justDragged.current = true
    setTimeout(() => (justDragged.current = false), 50)
    const id = String(active.id)
    const task = byId.get(id)
    if (!over || !task) return
    const columnId = findColumn(columns, id)
    const definition = definitions.find(c => c.id === columnId)
    if (!columnId || !definition) return
    const status = definition.status
    let list = columns[columnId]
    const overIndex = list.indexOf(String(over.id))
    const activeIndex = list.indexOf(id)
    if (overIndex >= 0 && overIndex !== activeIndex) list = arrayMove(list, activeIndex, overIndex)
    setColumns((c) => ({ ...c, [columnId]: list }))

    const i = list.indexOf(id)
    const before = byId.get(list[i - 1])?.position
    const after = byId.get(list[i + 1])?.position
    const position = positionBetween(before, after)
    const previousColumn = taskColumn(task, config)
    assign(id, columnId)
    if (status !== task.status || position !== task.position) update.mutate({ id, patch: { status, position } }, { onError: () => assign(id, previousColumn) })
  }

  const active = activeId ? byId.get(activeId) : undefined

  return (
    <>
      <PageHeader
        title="Tablero"
        actions={
          <>
            <select
              aria-label="Filtrar por proyecto"
              className="h-10 rounded-full border border-line bg-card/90 px-4 text-sm"
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
            >
              <option value="all">Todos los proyectos</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <Button variant="light" onClick={() => setAddingColumn(true)}><Plus className="size-4" /> Añadir columna</Button>
            <Button onClick={() => newTask({ project_id: projectFilter === 'all' ? null : projectFilter })}>
              <Plus className="size-4" /> Nueva tarjeta
            </Button>
          </>
        }
      />
      {storageError && <ErrorNote error={storageError} />}
      {isLoading && <Spinner />}
      {error && <ErrorNote error={error} onRetry={() => void refetch()} />}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => { setActiveId(null); setColumns(initialColumns) }}
        accessibility={{
          screenReaderInstructions: { draggable: 'Pulsa espacio para coger la tarjeta; flechas izquierda y derecha para cambiar de columna, arriba y abajo para reordenar; espacio para soltar.' },
        }}
      >
        <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
          {definitions.map(({ id, title, dot, status }) => (
            <Column
              key={id}
              status={id}
              title={title}
              dot={dot}
              ids={columns[id] ?? []}
              byId={byId}
              projectMap={projectMap}
              onOpen={openTask}
              onAdd={() => id.startsWith('custom:') ? setNewCardColumn(id) : newTask({ status, project_id: projectFilter === 'all' ? null : projectFilter })}
            />
          ))}
        </div>
        <DragOverlay>{active ? <KanbanCardView task={active} project={active.project_id ? projectMap.get(active.project_id) : undefined} overlay /> : null}</DragOverlay>
      </DndContext>
      <Modal open={addingColumn} onClose={() => setAddingColumn(false)} title="Añadir columna">
        <form className="flex flex-col gap-4" onSubmit={event => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          const title = String(data.get('title') ?? '').trim()
          if (!title) return
          setConfig(previous => ({ ...previous, columns: [...previous.columns, { id: `custom:${crypto.randomUUID()}`, title, status: data.get('status') as TaskStatus }] }))
          setAddingColumn(false)
        }}>
          <Field label="Nombre de la columna">{id => <Input id={id} name="title" required maxLength={80} autoFocus placeholder="Por ejemplo, En revisión" />}</Field>
          <Field label="Estado de las tarjetas">{id => <Select id={id} name="status" defaultValue="todo">{Object.entries(copy.status).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select>}</Field>
          <p className="text-xs text-muted">El estado se aplica al añadir o mover tarjetas a esta columna. Las columnas personalizadas y su distribución se guardan en este navegador para tu cuenta.</p>
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setAddingColumn(false)}>Cancelar</Button><Button type="submit" disabled={config.columns.length >= 100}>Crear columna</Button></div>
        </form>
      </Modal>
      <TaskDialog open={!!newCardColumn} onClose={() => setNewCardColumn(null)} defaults={{ status: definitions.find(c => c.id === newCardColumn)?.status ?? 'todo', project_id: projectFilter === 'all' ? null : projectFilter }} onCreated={task => { if (newCardColumn) assign(task.id, newCardColumn) }} />
    </>
  )
}

export function KanbanPage() {
  const status = useGoogleTasksStatus()
  if (status.isLoading) return <Spinner />
  if (status.error) return <ErrorNote error={status.error} onRetry={() => void status.refetch()} />
  if (status.data?.state === 'connected') return <GoogleTasksBoard />
  if (status.data?.state === 'needs_reauth') return <><PageHeader title="Tablero" /><p>Vuelve a conectar Google Tasks desde <Link to="/ajustes" className="underline">Ajustes</Link> para ver tus listas.</p></>
  return <LocalKanbanPage />
}
