import { Check, ListChecks, Play, Target, Video } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { copy } from '@/config/copy.es'
import { themeConfig } from '@/config/theme.config'
import { formatShort, relativeDay } from '@/lib/dates'
import { plural } from '@/lib/stats'
import { isDueToday, isOverdue, pickFocusTask } from '@/lib/tasks'
import { useCalendarStatus, useEvents } from '../../calendar/hooks'
import { CalendarStatusPanel } from '../../calendar/CalendarStatusPanel'
import { eventWhen } from '../../calendar/format'
import { usePomodoro } from '../../focus/PomodoroProvider'
import { useProjectMap } from '../../projects/hooks'
import { useQuickActions } from '../../quick-actions'
import { useStats } from '../../stats/useStats'
import { useTasks, useUpdateTask } from '../../tasks/hooks'
import { PriorityChip } from '../../tasks/TaskBits'

const tilt = themeConfig.stackTilt

/** Etiqueta gris + valor negro, en 3 columnas (patrón de las tarjetas de la referencia) */
function Meta({ items }: { items: { label: string; value: React.ReactNode; align?: 'right' }[] }) {
  return (
    <dl className="mt-4 grid grid-cols-3 gap-3 text-xs">
      {items.map((i) => (
        <div key={i.label} className={i.align === 'right' ? 'text-right' : undefined}>
          <dt className="label">{i.label}</dt>
          <dd className="mt-1 truncate font-medium text-ink">{i.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function DaySummaryWidget() {
  const { data: tasks = [] } = useTasks()
  const s = useStats()
  const today = tasks.filter((t) => isDueToday(t)).length
  const overdue = tasks.filter((t) => isOverdue(t)).length
  return (
    <Card className="animate-rise" tilt={-tilt / 2}>
      <div className="flex items-start justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[17px] font-semibold tracking-tight">
          <ListChecks className="size-4" aria-hidden /> Resumen del día
        </h2>
        <Chip tone="sun">Hoy</Chip>
      </div>
      <Meta
        items={[
          { label: 'Para hoy', value: plural(today, 'tarea', 'tareas') },
          { label: 'Hechas hoy', value: plural(s.completedBars.find((b) => b.highlight)?.value ?? 0, 'tarea', 'tareas') },
          { label: 'Vencidas', value: <span className={overdue ? 'text-coral-accessible' : undefined}>{overdue}</span>, align: 'right' },
        ]}
      />
      <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
        <span className="text-xs text-muted">{s.pending} pendientes en total</span>
        <Link to="/tareas" className="inline-flex h-8 items-center rounded-full bg-sky-50 px-3.5 text-xs font-medium hover:bg-sky-100">
          Ver tareas
        </Link>
      </div>
    </Card>
  )
}

export function FocusTaskWidget() {
  const { data: tasks = [] } = useTasks()
  const projectMap = useProjectMap()
  const update = useUpdateTask()
  const { editTask } = useQuickActions()
  const pomodoro = usePomodoro()
  const task = pickFocusTask(tasks)

  if (!task)
    return (
      <Card tilt={tilt} className="animate-rise">
        <h2 className="flex items-center gap-2 text-[17px] font-semibold"><Target className="size-4" aria-hidden /> {copy.dashboard.focusTask}</h2>
        <p className="mt-3 text-sm text-muted">{copy.dashboard.noFocusTask}. Abre una tarea y marca “prioritaria”.</p>
      </Card>
    )

  const project = task.project_id ? projectMap.get(task.project_id) : undefined
  return (
    <Card tilt={tilt} className="animate-rise relative z-10 shadow-float">
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={() => editTask(task)} className="flex min-w-0 items-center gap-2 text-left text-[17px] font-semibold tracking-tight hover:underline">
          <Target className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{task.title}</span>
        </button>
        <div className="flex shrink-0 gap-1">
          <PriorityChip priority={task.priority} />
          <Chip tone="sun">Prioritaria</Chip>
        </div>
      </div>
      <Meta
        items={[
          { label: 'Proyecto', value: project?.name ?? 'Personal' },
          { label: 'Descripción', value: task.description || '—' },
          { label: 'Fecha límite', value: task.due_date ? `${relativeDay(task.due_date)} · ${formatShort(task.due_date)}` : 'Sin fecha', align: 'right' },
        ]}
      />
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3">
        <Button variant="ghost" size="sm" onClick={() => update.mutate({ id: task.id, patch: { status: 'done' } })}>
          <Check className="size-3.5" /> Hecha
        </Button>
        <Button
          size="sm"
          onClick={() => {
            pomodoro.setTaskId(task.id)
            if (pomodoro.state.mode !== 'focus') pomodoro.setMode('focus')
            pomodoro.start()
          }}
        >
          <Play className="size-3.5 fill-sun text-sun" /> Empezar enfoque
        </Button>
      </div>
    </Card>
  )
}

export function UpcomingEventsWidget() {
  const status = useCalendarStatus()
  const connected = status.data?.state === 'connected'
  const events = useEvents('week', connected)
  const next = (events.data ?? []).filter((e) => new Date(e.end) > new Date()).slice(0, 2)

  if (status.data && !connected)
    return (
      <Card tilt={-tilt} className="animate-rise">
        <h2 className="text-[17px] font-semibold">{copy.dashboard.upcoming}</h2>
        <CalendarStatusPanel status={status.data} compact />
      </Card>
    )

  if (connected && events.data && next.length === 0)
    return (
      <Card tilt={-tilt} className="animate-rise">
        <h2 className="text-[17px] font-semibold">{copy.dashboard.upcoming}</h2>
        <p className="mt-2 text-sm text-muted">{copy.empty.events}</p>
      </Card>
    )

  return (
    <>
      {next.map((e, i) => (
        <Card key={e.id} tilt={i % 2 === 0 ? -tilt : tilt / 2} className="animate-rise">
          <div className="flex items-start justify-between gap-2">
            <h2 className="flex min-w-0 items-center gap-2 text-[17px] font-semibold tracking-tight">
              <Video className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{e.title}</span>
            </h2>
            <Chip tone="mint">Evento</Chip>
          </div>
          <Meta
            items={[
              { label: 'Cuándo', value: eventWhen(e) },
              { label: 'Lugar', value: e.location ?? (e.meetUrl ? 'Videollamada' : '—') },
              {
                label: 'Duración',
                value: e.allDay ? 'Todo el día' : `${Math.round((new Date(e.end).getTime() - new Date(e.start).getTime()) / 60000)} min`,
                align: 'right',
              },
            ]}
          />
          {e.meetUrl && (
            <div className="mt-4 flex justify-end border-t border-line pt-3">
              <a href={e.meetUrl} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center rounded-full bg-sky-50 px-3.5 text-xs font-medium hover:bg-sky-100">
                Unirse a la llamada
              </a>
            </div>
          )}
        </Card>
      ))}
    </>
  )
}
