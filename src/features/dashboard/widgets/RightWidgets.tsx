import { Link } from 'react-router'
import { Pause, Play, Plus } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { RoundCheck } from '@/components/ui/Checkbox'
import { ProgressBar } from '@/components/ui/Progress'
import { copy } from '@/config/copy.es'
import { projectColorVar } from '@/config/theme.config'
import { todayISO } from '@/lib/dates'
import { projectProgress } from '@/lib/stats'
import { isDueToday, isOverdue, sortTasks } from '@/lib/tasks'
import { cn } from '@/lib/cn'
import { formatClock, minutesToMs } from '../../focus/pomodoro'
import { usePomodoro } from '../../focus/PomodoroProvider'
import { useProjects } from '../../projects/hooks'
import { useQuickActions } from '../../quick-actions'
import { useTasks, useUpdateTask } from '../../tasks/hooks'
import { DueBadge } from '../../tasks/TaskBits'

/** Panel translúcido de tareas de hoy (como "Quick requests") */
export function TodayListWidget() {
  const { data: tasks = [] } = useTasks()
  const update = useUpdateTask()
  const { newTask, editTask } = useQuickActions()
  const list = sortTasks(tasks.filter((t) => isDueToday(t) || isOverdue(t)), 'priority').slice(0, 6)

  return (
    <Card tone="glass" className="animate-rise">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[17px] font-semibold tracking-tight">
          <span className="size-2.5 rounded-full bg-sun ring-4 ring-sun/30" aria-hidden />
          {copy.dashboard.today}
        </h2>
        <button type="button" onClick={() => newTask({ due_date: todayISO() })} className="inline-flex items-center gap-1 text-xs font-medium hover:underline">
          <Plus className="size-3.5" /> Añadir
        </button>
      </div>
      <ul className="mt-3 divide-y divide-ink/5">
        {list.map((t) => (
          <li key={t.id} className="flex items-center gap-3 py-2.5">
            <RoundCheck checked={false} label={`Completar "${t.title}"`} onChange={() => update.mutate({ id: t.id, patch: { status: 'done' } })} />
            <button type="button" onClick={() => editTask(t)} className="min-w-0 flex-1 text-left">
              <span className="line-clamp-2 text-xs leading-snug font-medium">{t.title}</span>
              <DueBadge task={t} />
            </button>
            <Play className="size-3 shrink-0 fill-ink text-ink" aria-hidden />
          </li>
        ))}
      </ul>
      {list.length === 0 && <p className="py-4 text-center text-xs text-muted">Nada pendiente para hoy ☀️</p>}
    </Card>
  )
}

/** Mini Pomodoro (en el lugar de la tarjeta "Say something" de la referencia) */
export function PomodoroMiniWidget() {
  const { state, remainingMs, durations, start, pause } = usePomodoro()
  const running = state.status === 'running'
  const progress = state.indefinite ? 0 : 1 - remainingMs / minutesToMs(durations[state.mode])
  const bars = 28
  return (
    <Card tone="glass" className="animate-rise relative">
      <span className="rounded-full bg-sky-300/70 px-2.5 py-0.5 text-[10.5px] font-semibold text-ink">{state.indefinite ? 'Enfoque sin límite' : copy.focusKind[state.mode]}</span>
      <div className="mt-3 flex items-center justify-between gap-3">
        <Link to="/enfoque" className="font-display text-[34px] leading-[0.95] hover:underline">
          {state.status === 'idle' ? (
            <>¿Un rato de<br />enfoque?</>
          ) : (
            <span className="tabular-nums">{formatClock(remainingMs)}</span>
          )}
        </Link>
        <div className="flex h-12 flex-1 items-center justify-end gap-[3px]" aria-hidden>
          {Array.from({ length: bars }, (_, i) => {
            const h = 30 + 70 * Math.abs(Math.sin(i * 1.7))
            return <span key={i} className={cn('w-[3px] rounded-full transition-colors', i / bars < progress ? 'bg-ink' : 'bg-sky-400/70')} style={{ height: `${h}%` }} />
          })}
        </div>
      </div>
      <div className="mt-3 flex justify-center">
        <button
          type="button"
          onClick={running ? pause : start}
          aria-label={running ? 'Pausar temporizador' : 'Iniciar temporizador'}
          className="grid size-9 place-items-center rounded-full bg-card shadow-pill hover:bg-sky-50"
        >
          {running ? <Pause className="size-4" /> : <Play className="size-4 fill-ink" />}
        </button>
      </div>
    </Card>
  )
}

export function ActiveProjectsWidget() {
  const { data: projects = [] } = useProjects()
  const { data: tasks = [] } = useTasks()
  const active = projects.filter((p) => p.status === 'active').slice(0, 4)
  return (
    <Card className="animate-rise">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold">{copy.dashboard.activeProjects}</h2>
        <Link to="/proyectos" className="text-xs font-medium text-ink-soft hover:underline">Ver todos</Link>
      </div>
      <ul className="mt-3 flex flex-col gap-3.5">
        {active.map((p) => {
          const { percent, done, total } = projectProgress(p, tasks)
          return (
            <li key={p.id}>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="flex min-w-0 items-center gap-2 font-medium">
                  <span className="size-2 shrink-0 rounded-full" style={{ background: projectColorVar(p.color) }} aria-hidden />
                  <span className="truncate">{p.name}</span>
                </span>
                <span className="text-muted">{done}/{total}</span>
              </div>
              <ProgressBar value={percent} color={projectColorVar(p.color)} label={`Progreso de ${p.name}`} />
            </li>
          )
        })}
      </ul>
      {active.length === 0 && <p className="py-3 text-xs text-muted">{copy.empty.projects}</p>}
    </Card>
  )
}
