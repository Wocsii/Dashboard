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

const kanbanColumns: { status: TaskStatus; dot: string }[] = [
  { status: 'todo', dot: 'bg-sky-400' },
  { status: 'in_progress', dot: 'bg-sun' },
  { status: 'blocked', dot: 'bg-coral' },
  { status: 'done', dot: 'bg-mint-strong' },
]

type Columns = Record<TaskStatus, string[]>

function buildColumns(tasks: Task[]): Columns {
  const cols: Columns = { todo: [], in_progress: [], blocked: [], done: [] }
  for (const t of [...tasks].sort((a, b) => a.position - b.position)) cols[t.status].push(t.id)
  return cols
}

function findColumn(cols: Columns, id: string): TaskStatus | undefined {
  if (id in cols) return id as TaskStatus
  return (Object.keys(cols) as TaskStatus[]).find((s) => cols[s].includes(id))
}

/**
 * Teclado: ←/→ saltan a la columna vecina (por defecto dnd-kit solo reordena dentro
 * de la misma columna); ↑/↓ reordenan.
 */
const columnKeyboardCoordinates: KeyboardCoordinateGetter = (event, args) => {
  if (event.code !== 'ArrowRight' && event.code !== 'ArrowLeft') return sortableKeyboardCoordinates(event, args)
  const { active, droppableRects } = args.context
  const from = active?.data.current?.sortable?.containerId as TaskStatus | undefined
  const order = kanbanColumns.map((c) => c.status)
  const to = from ? order[order.indexOf(from) + (event.code === 'ArrowRight' ? 1 : -1)] : undefined
  const rect = to ? droppableRects.get(to) : undefined
  if (!rect) return undefined
  event.preventDefault()
  return { x: rect.left + 8, y: rect.top + 8 }
}

function Column({ status, dot, ids, byId, projectMap, onOpen, onAdd }: {
  status: TaskStatus
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
          {copy.status[status]}
          <span className="rounded-full bg-card/80 px-1.5 text-[11px] font-medium text-muted">{ids.length}</span>
        </h2>
        <IconButton label={`Añadir en ${copy.status[status]}`} size="sm" onClick={onAdd}>
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
  const byId = useMemo(() => new Map(visible.map((t) => [t.id, t])), [visible])
  const [columns, setColumns] = useState<Columns>(() => buildColumns(visible))
  const [syncedWith, setSyncedWith] = useState(visible)

  // Sincroniza con los datos del servidor cuando no se está arrastrando
  if (syncedWith !== visible && !activeId) {
    setSyncedWith(visible)
    setColumns(buildColumns(visible))
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: columnKeyboardCoordinates }),
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
    const status = findColumn(columns, id)
    if (!status) return
    let list = columns[status]
    const overIndex = list.indexOf(String(over.id))
    const activeIndex = list.indexOf(id)
    if (overIndex >= 0 && overIndex !== activeIndex) list = arrayMove(list, activeIndex, overIndex)
    setColumns((c) => ({ ...c, [status]: list }))

    const i = list.indexOf(id)
    const before = byId.get(list[i - 1])?.position
    const after = byId.get(list[i + 1])?.position
    const position = positionBetween(before, after)
    if (status !== task.status || position !== task.position) update.mutate({ id, patch: { status, position } })
  }

  const active = activeId ? byId.get(activeId) : undefined

  return (
    <>
      <PageHeader
        title="Tablero"
        subtitle="Arrastra las tarjetas entre columnas"
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
            <Button onClick={() => newTask({ project_id: projectFilter === 'all' ? null : projectFilter })}>
              <Plus className="size-4" /> Nueva tarjeta
            </Button>
          </>
        }
      />
      {isLoading && <Spinner />}
      {error && <ErrorNote error={error} onRetry={() => void refetch()} />}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
        accessibility={{
          screenReaderInstructions: { draggable: 'Pulsa espacio para coger la tarjeta; flechas izquierda y derecha para cambiar de columna, arriba y abajo para reordenar; espacio para soltar.' },
        }}
      >
        <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
          {kanbanColumns.map(({ status, dot }) => (
            <Column
              key={status}
              status={status}
              dot={dot}
              ids={columns[status]}
              byId={byId}
              projectMap={projectMap}
              onOpen={openTask}
              onAdd={() => newTask({ status, project_id: projectFilter === 'all' ? null : projectFilter })}
            />
          ))}
        </div>
        <DragOverlay>{active ? <KanbanCardView task={active} project={active.project_id ? projectMap.get(active.project_id) : undefined} overlay /> : null}</DragOverlay>
      </DndContext>
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
