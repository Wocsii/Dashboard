import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input, Segmented, Select } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState, ErrorNote, Spinner } from '@/components/ui/States'
import { copy } from '@/config/copy.es'
import { defaultFilter, filterTasks, groupTasks, sortTasks, type TaskFilter, type TaskSort } from '@/lib/tasks'
import type { Task, TaskPriority } from '@/types/domain'
import { useProjectMap, useProjects } from '../projects/hooks'
import { useQuickActions } from '../quick-actions'
import { useTasks } from './hooks'
import { TaskRow } from './TaskRow'

const groupMeta = [
  { key: 'overdue', title: 'Vencidas', accent: 'bg-coral' },
  { key: 'today', title: 'Hoy', accent: 'bg-sun' },
  { key: 'upcoming', title: 'Próximas', accent: 'bg-sky-400' },
  { key: 'noDate', title: 'Sin fecha', accent: 'bg-lilac' },
  { key: 'done', title: 'Completadas', accent: 'bg-mint-strong' },
] as const

export function TasksPage() {
  const { data: tasks, isLoading, error, refetch } = useTasks()
  const { data: projects = [] } = useProjects()
  const projectMap = useProjectMap()
  const { newTask } = useQuickActions()
  const [filter, setFilter] = useState<TaskFilter>(defaultFilter)
  const [sort, setSort] = useState<TaskSort>('due')
  const set = <K extends keyof TaskFilter>(k: K, v: TaskFilter[K]) => setFilter((f) => ({ ...f, [k]: v }))

  const groups = useMemo(() => groupTasks(sortTasks(filterTasks(tasks ?? [], filter), sort)), [tasks, filter, sort])
  const pendingCount = (tasks ?? []).filter((t) => t.status !== 'done').length
  const total = Object.values(groups).reduce((n, g) => n + g.length, 0)

  return (
    <>
      <PageHeader
        title="Tareas"
        subtitle={`${pendingCount} pendientes`}
        actions={
          <Button onClick={() => newTask()}>
            <Plus className="size-4" /> Nueva tarea
          </Button>
        }
      />

      <Card tone="glass" className="mb-5 flex flex-wrap items-center gap-3 p-3">
        <Segmented
          label="Estado"
          size="sm"
          value={filter.state}
          onChange={(v) => set('state', v)}
          options={[
            { value: 'pending', label: 'Pendientes' },
            { value: 'done', label: 'Completadas' },
            { value: 'all', label: 'Todas' },
          ]}
        />
        <Select aria-label="Filtrar por fecha" className="h-8 w-auto rounded-full text-xs" value={filter.when} onChange={(e) => set('when', e.target.value as TaskFilter['when'])}>
          <option value="all">Cualquier fecha</option>
          <option value="overdue">Vencidas</option>
          <option value="today">Hoy</option>
          <option value="week">Próximos 7 días</option>
          <option value="nodate">Sin fecha</option>
        </Select>
        <Select aria-label="Filtrar por prioridad" className="h-8 w-auto rounded-full text-xs" value={filter.priority} onChange={(e) => set('priority', e.target.value as TaskPriority | 'all')}>
          <option value="all">Toda prioridad</option>
          {Object.entries(copy.priority).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
        <Select aria-label="Filtrar por proyecto" className="h-8 w-auto rounded-full text-xs" value={filter.projectId} onChange={(e) => set('projectId', e.target.value)}>
          <option value="all">Todos los proyectos</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        <Select aria-label="Ordenar" className="h-8 w-auto rounded-full text-xs" value={sort} onChange={(e) => setSort(e.target.value as TaskSort)}>
          <option value="due">Ordenar por fecha</option>
          <option value="priority">Ordenar por prioridad</option>
          <option value="created">Más recientes</option>
        </Select>
        <div className="relative ml-auto min-w-48 flex-1 sm:max-w-64">
          <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted" aria-hidden />
          <Input aria-label="Buscar tareas" className="h-8 rounded-full pl-8 text-xs" placeholder="Buscar…" value={filter.search} onChange={(e) => set('search', e.target.value)} />
        </div>
      </Card>

      {isLoading && <Spinner />}
      {error && <ErrorNote error={error} onRetry={() => void refetch()} />}
      {tasks && total === 0 && (
        <Card><EmptyState action={<Button size="sm" onClick={() => newTask()}><Plus className="size-3.5" /> Crear una</Button>}>{copy.empty.tasks}</EmptyState></Card>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-2">
        {groupMeta.map(({ key, title, accent }) => {
          const list: Task[] = groups[key]
          if (!list.length) return null
          return (
            <Card key={key} as="section" aria-labelledby={`g-${key}`} className="animate-rise p-3">
              <h2 id={`g-${key}`} className="flex items-center gap-2 px-3 pt-2 pb-1 text-sm font-semibold">
                <span className={`size-2 rounded-full ${accent}`} aria-hidden />
                {title}
                <span className="text-xs font-normal text-muted">{list.length}</span>
              </h2>
              <ul>
                {list.map((t) => <TaskRow key={t.id} task={t} project={t.project_id ? projectMap.get(t.project_id) : undefined} />)}
              </ul>
            </Card>
          )
        })}
      </div>
    </>
  )
}
