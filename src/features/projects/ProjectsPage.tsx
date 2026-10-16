import { useMemo, useState } from 'react'
import { CalendarRange, Dumbbell, Pencil, Plus } from 'lucide-react'
import { Button, IconButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { Segmented } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { ProgressBar } from '@/components/ui/Progress'
import { EmptyState, ErrorNote, Spinner } from '@/components/ui/States'
import { copy } from '@/config/copy.es'
import { projectColorVar } from '@/config/theme.config'
import { formatShort } from '@/lib/dates'
import { projectProgress } from '@/lib/stats'
import { sortTasks } from '@/lib/tasks'
import { cn } from '@/lib/cn'
import type { ExerciseLog, Project, ProjectStatus, Task } from '@/types/domain'
import { useQuickActions } from '../quick-actions'
import { useTasks } from '../tasks/hooks'
import { TaskRow } from '../tasks/TaskRow'
import { useProjects } from './hooks'
import { useSettings } from '../settings/hooks'
import { useExerciseLogs } from './exercise-hooks'
import { exerciseMetrics, exerciseSummary } from './exercise'
import { ExercisePanel } from './ExercisePanel'

const statusTone = { active: 'mint', paused: 'sun', completed: 'neutral' } as const

function ProjectCard({ project, tasks, selected, onSelect, logs, weekStartsOn }: { project: Project; tasks: Task[]; selected: boolean; onSelect: () => void; logs:ExerciseLog[]; weekStartsOn:0 | 1 }) {
  const { done, total, percent } = projectProgress(project, tasks)
  const config = project.exercise_config
  const summary = config ? exerciseSummary(logs,config.weeklyTarget,new Date(),weekStartsOn) : null
  const latest = [...logs].filter((log) => log.status === 'exercise').sort((a,b) => b.date.localeCompare(a.date))[0]
  return (
    <Card as="article" padded={false} className={cn('group h-full overflow-hidden transition-transform hover:-translate-y-0.5', selected && 'ring-2 ring-ink')}>
      <button type="button" onClick={onSelect} className="flex h-full min-h-[280px] w-full flex-col p-5 text-left" aria-pressed={selected}>
        <div className="mb-4 flex w-full items-center justify-between gap-2">
          <span className="grid size-9 place-items-center rounded-full text-sm font-semibold" style={{ background: projectColorVar(project.color) }} aria-hidden>
            {config ? <Dumbbell className="size-4" /> : project.name.charAt(0).toUpperCase()}
          </span>
          <Chip tone={statusTone[project.status]}>{copy.projectStatus[project.status]}</Chip>
        </div>
        <h2 className="text-base font-semibold tracking-tight">{project.name}</h2>
        {project.description && <p className="mt-1 line-clamp-2 text-xs text-muted">{project.description}</p>}
        <div className="mt-auto flex w-full items-end justify-between gap-2 pt-5">
          <span className="text-3xl font-light tracking-tight">{summary ? `${summary.workouts}/${config!.weeklyTarget}` : `${percent}%`}</span>
          <span className="text-right text-[11px] text-muted">{summary ? `Esta semana · Racha ${summary.streak}` : `${done}/${total} tareas`}</span>
        </div>
        <ProgressBar value={summary?.percent ?? percent} className="mt-2 w-full" color={projectColorVar(project.color)} label={`Progreso de ${project.name}`} />
        {config && <p className="mt-3 min-h-4 text-[11px] text-muted">{config.metrics.slice(0,2).map(({ id }) => latest?.values[id] !== undefined ? `${exerciseMetrics[id].label}: ${latest.values[id]} ${exerciseMetrics[id].unit}` : exerciseMetrics[id].label).join(' · ') || 'Registro diario de ejercicio y descanso'}</p>}
        {(project.start_date || project.due_date) && (
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted">
            <CalendarRange className="size-3" aria-hidden />
            {formatShort(project.start_date) || '—'} → {formatShort(project.due_date) || '—'}
          </p>
        )}
      </button>
    </Card>
  )
}

export function ProjectsPage() {
  const { data: projects, isLoading, error, refetch } = useProjects()
  const { data: tasks = [] } = useTasks()
  const { data:settings } = useSettings()
  const exerciseLogs = useExerciseLogs(projects?.some((p) => !!p.exercise_config) ?? false)
  const { newProject, editProject, newTask } = useQuickActions()
  const [tab, setTab] = useState<ProjectStatus>('active')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const list = useMemo(() => (projects ?? []).filter((p) => p.status === tab), [projects, tab])
  const counts = useMemo(() => {
    const c = { active: 0, paused: 0, completed: 0 }
    for (const p of projects ?? []) c[p.status]++
    return c
  }, [projects])
  const selected = (projects ?? []).find((p) => p.id === selectedId) ?? null
  const related = selected ? sortTasks(tasks.filter((t) => t.project_id === selected.id), 'due') : []

  return (
    <>
      <PageHeader
        title="Proyectos"
        subtitle={`${counts.active} activos · ${counts.paused} pausados · ${counts.completed} completados`}
        actions={
          <Button onClick={newProject}>
            <Plus className="size-4" /> Nuevo proyecto
          </Button>
        }
      />
      <div className="mb-5">
        <Segmented<ProjectStatus>
          label="Estado"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'active', label: `Activos · ${counts.active}` },
            { value: 'paused', label: `Pausados · ${counts.paused}` },
            { value: 'completed', label: `Completados · ${counts.completed}` },
          ]}
        />
      </div>
      {isLoading && <Spinner />}
      {error && <ErrorNote error={error} onRetry={() => void refetch()} />}

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="grid content-start gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {list.map((p) => (
            <ProjectCard key={p.id} project={p} tasks={tasks} selected={p.id === selectedId} onSelect={() => setSelectedId(p.id === selectedId ? null : p.id)} logs={(exerciseLogs.data ?? []).filter((log) => log.project_id === p.id)} weekStartsOn={settings?.week_starts_on === 0 ? 0 : 1} />
          ))}
          {projects && list.length === 0 && (
            <Card className="sm:col-span-2"><EmptyState>{copy.empty.projects}</EmptyState></Card>
          )}
        </div>

        <Card tone="ivory" as="aside" aria-label="Detalle del proyecto" className="h-fit xl:sticky xl:top-0">
          {selected ? (
            <>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="label">Proyecto</p>
                  <h2 className="font-display text-3xl leading-tight">{selected.name}</h2>
                </div>
                <IconButton label="Editar proyecto" onClick={() => editProject(selected)}>
                  <Pencil className="size-4" />
                </IconButton>
              </div>
              {selected.description && <p className="mt-2 text-sm whitespace-pre-line text-ink-soft">{selected.description}</p>}
              {selected.exercise_config && <ExercisePanel key={selected.id} project={selected} />}
              <div className="mt-5 flex items-center justify-between">
                <h3 className="text-sm font-semibold">{selected.exercise_config ? 'Sesiones y tareas' : 'Tareas relacionadas'}</h3>
                <Button size="sm" variant="light" onClick={() => newTask({ project_id: selected.id })}>
                  <Plus className="size-3.5" /> Tarea
                </Button>
              </div>
              <ul className="-mx-3 mt-2">
                {related.map((t) => <TaskRow key={t.id} task={t} project={selected} compact />)}
              </ul>
              {related.length === 0 && <EmptyState className="py-4">Sin tareas todavía</EmptyState>}
            </>
          ) : (
            <EmptyState>Selecciona un proyecto para ver sus tareas</EmptyState>
          )}
        </Card>
      </div>
    </>
  )
}
