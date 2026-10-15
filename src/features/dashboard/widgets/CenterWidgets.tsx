import { useQueryClient } from '@tanstack/react-query'
import { useSettings, useUpdateSettings } from '../../settings/hooks'
import { Check, ListChecks, Play, Target, Video } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { ErrorNote, Spinner } from '@/components/ui/States'
import { copy } from '@/config/copy.es'
import { themeConfig } from '@/config/theme.config'
import { formatShort, relativeDay } from '@/lib/dates'
import { plural } from '@/lib/stats'
import { isDueToday, isOverdue, pickFocusTask } from '@/lib/tasks'
import { useCalendarStatus, useCalendars, useEvents } from '../../calendar/hooks'
import { useCalendarProvider } from '../../calendar/CalendarProvider'
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
  const { provider } = useCalendarProvider()
  const status = useCalendarStatus()
  const calendars = useCalendars(status.data?.state === 'connected')
  const { data: settings } = useSettings()
  const update = useUpdateSettings()
  const qc = useQueryClient()
  const selected = (provider === 'apple' ? settings?.visible_apple_calendar_ids : settings?.visible_calendar_ids)
    ?? calendars.data?.filter((c) => c.visible).map((c) => c.id) ?? []
  const toggle = (id: string) => {
    const ids = selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id]
    update.mutate(provider === 'apple' ? { visible_apple_calendar_ids: ids } : { visible_calendar_ids: ids }, {
      onSettled: () => { void qc.invalidateQueries({ queryKey: ['calendar'] }) },
    })
  }
  return <>
    {status.data?.state === 'connected' && <Card tilt={-tilt}>
      <h2 className="text-[17px] font-semibold">Próximos 3 días</h2>
      <p className="mt-1 text-xs text-muted">Hoy y los dos días siguientes. Elige los calendarios por su color; la selección también se aplica en Calendario.</p>
      {calendars.isLoading && <Spinner label="Cargando calendarios…" />}
      {calendars.error && <ErrorNote error={calendars.error} onRetry={() => void calendars.refetch()} />}
      <div className="mt-3 flex flex-wrap gap-2" aria-label="Calendarios de próximos eventos">
        {calendars.data?.map((calendar) => <button key={calendar.id} type="button" disabled={update.isPending || !settings} aria-pressed={selected.includes(calendar.id)} onClick={() => toggle(calendar.id)} className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs ${selected.includes(calendar.id) ? 'border-ink bg-white' : 'border-line opacity-60'}`}>
          <span className="size-3 rounded-full" style={{ backgroundColor: calendar.color }} aria-hidden />{calendar.summary}
        </button>)}
      </div>
      {update.error && <ErrorNote error={update.error} />}
    </Card>}
    <UpcomingEventsContent />
  </>
}

export function UpcomingEventsContent() {
  const { provider } = useCalendarProvider()
  const status = useCalendarStatus()
  const connected = status.data?.state === 'connected'
  const events = useEvents('threeDays', connected)
  const next = (events.data ?? []).filter((e) => new Date(e.allDay ? `${e.end.slice(0, 10)}T00:00:00` : e.end) > new Date()).slice(0, 2)

  if (status.error || events.error || status.isLoading || (connected && events.isLoading))
    return (
      <Card tilt={-tilt} className="animate-rise">
        <h2 className="text-[17px] font-semibold">{copy.dashboard.upcoming}</h2>
        {status.error || events.error
          ? <ErrorNote error={status.error ?? events.error} onRetry={() => { void status.refetch(); if (connected) void events.refetch() }} />
          : <Spinner label="Buscando tus próximos eventos…" />}
      </Card>
    )

  if (status.data && !connected)
    return (
      <Card tilt={-tilt} className="animate-rise">
        <h2 className="text-[17px] font-semibold">{copy.dashboard.upcoming}</h2>
        {provider === 'apple'
          ? <p className="mt-2 text-sm text-muted">Conecta o revisa tu cuenta de Apple en <Link to="/ajustes" className="font-medium underline">Ajustes</Link> para ver tus eventos.</p>
          : <CalendarStatusPanel status={status.data} compact />}
      </Card>
    )

  if (connected && events.data && next.length === 0)
    return (
      <Card tilt={-tilt} className="animate-rise">
        <h2 className="text-[17px] font-semibold">{copy.dashboard.upcoming}</h2>
        <p className="mt-2 text-sm text-muted">No hay eventos en los próximos 3 días en tus calendarios visibles de {provider === 'apple' ? 'Apple' : 'Google'}.</p>
        <Link to="/calendario" className="mt-3 inline-block text-sm font-medium underline">Ver calendario</Link>
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
