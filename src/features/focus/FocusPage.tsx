import { FocusClock } from './FocusClock'
import { useId, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Field'
import { ManualTimeEntry } from './ManualTimeEntry'
import { Mascot } from '@/components/ui/Mascot'
import { Infinity as InfinityIcon, Minus, Pause, Play, Plus, RotateCcw, SkipForward, Square } from 'lucide-react'
import { BarChart } from '@/components/ui/BarChart'
import { Button, IconButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Segmented, Select } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { ProgressRing } from '@/components/ui/Progress'
import { copy } from '@/config/copy.es'
import { dayLabel, formatLong, toISODate, todayISO, weekDays } from '@/lib/dates'
import { focusMinutes, formatMinutes } from '@/lib/stats'
import type { FocusKind } from '@/types/domain'
import { useSettings } from '../settings/hooks'
import { useTasks } from '../tasks/hooks'
import { useFocusSessions } from './hooks'
import { usePomodoro } from './PomodoroProvider'
import { minutesToMs } from './pomodoro'

const modeColor: Record<FocusKind, string> = {
  focus: 'var(--color-ink)',
  short_break: 'var(--color-mint-strong)',
  long_break: 'var(--color-sky-400)',
}

export function PomodoroControls({ size = 'lg' }: { size?: 'md' | 'lg' }) {
  const { state, start, pause, reset, skip, indefiniteSessionSeconds, editIndefiniteTime } = usePomodoro()
  const [editing, setEditing] = useState(false)
  const [minutes, setMinutes] = useState('')
  const formId = useId()
  const minutesId = useId()
  const close = () => setEditing(false)
  const adjust = (delta: number) => setMinutes(String(Math.max(0, Math.min(9999, (Number(minutes) || 0) + delta))))
  const running = state.status === 'running'
  const canEdit = !!state.indefinite && state.status === 'paused'
  return (
    <>
    <div className="flex items-center justify-center gap-2">
      <IconButton label="Reiniciar" variant="light" size={size} onClick={reset} disabled={state.status === 'idle'}>
        <RotateCcw className="size-4" />
      </IconButton>
      <Button onClick={running ? pause : start} className={size === 'lg' ? 'h-12 px-7 text-base' : undefined}>
        {running ? <Pause className="size-4" /> : <Play className="size-4" />}
        {running ? 'Pausar' : state.status === 'paused' ? 'Continuar' : 'Empezar'}
      </Button>
      {canEdit && <Button variant="sun" onClick={() => {
        setMinutes(String(Math.round(indefiniteSessionSeconds / 60)))
        setEditing(true)
      }}>Editar</Button>}
      <IconButton label={state.indefinite ? 'Finalizar enfoque' : 'Saltar al siguiente bloque'} variant="light" size={size} onClick={skip}>
        {state.indefinite ? <Square className="size-4" /> : <SkipForward className="size-4" />}
      </IconButton>
    </div>
    <Modal open={editing && canEdit} onClose={close} title="Editar tiempo indefinido" footer={<><Button variant="ghost" onClick={close}>Cancelar</Button><Button type="submit" form={formId}>Guardar</Button></>}>
      <form id={formId} className="flex flex-col gap-5 pt-2 text-left" onSubmit={event => {
        event.preventDefault()
        const value = Number(minutes)
        if (!Number.isInteger(value) || value < 0 || value > 9999) return
        if (value !== Math.round(indefiniteSessionSeconds / 60)) editIndefiniteTime(value * 60)
        close()
      }}>
        <div className="rounded-card bg-card px-4 py-6 shadow-pill">
          <label htmlFor={minutesId} className="mb-4 block text-center text-xs font-medium text-ink-soft">Minutos trabajados</label>
          <div className="flex items-center justify-center gap-2 sm:gap-4">
            <IconButton label="Restar 5 minutos" variant="light" size="lg" disabled={Number(minutes) <= 0} onClick={() => adjust(-5)}><Minus className="size-4" /></IconButton>
            <Input id={minutesId} aria-label="Tiempo trabajado en minutos" type="number" min={0} max={9999} step={1} required autoFocus value={minutes} onChange={event => setMinutes(event.target.value)} className="h-20 w-24 border-transparent sm:w-32 bg-transparent text-center font-display text-6xl tracking-tight tabular-nums shadow-none focus:border-sky-400 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [appearance:textfield]" />
            <IconButton label="Añadir 5 minutos" variant="light" size="lg" disabled={Number(minutes) >= 9999} onClick={() => adjust(5)}><Plus className="size-4" /></IconButton>
          </div>
        </div>
        <div role="group" aria-label="Duraciones habituales" className="flex flex-wrap justify-center gap-2">
          {[15, 25, 50, 90].map(value => <Button key={value} size="sm" variant={Number(minutes) === value ? 'sun' : 'light'} aria-pressed={Number(minutes) === value} className={Number(minutes) === value ? 'min-w-18 shadow-pill' : 'min-w-18'} onClick={() => setMinutes(String(value))}>{value} min</Button>)}
        </div>
      </form>
    </Modal>
    </>
  )
}

export function FocusPage() {
  const { state, remainingMs, durations, setMode, taskId, setTaskId, saveError, retrySave, startIndefinite } = usePomodoro()
  const { data: tasks = [] } = useTasks({ includeGoogleFocus: true })
  const { data: sessions = [] } = useFocusSessions()
  const { data: settings } = useSettings()
  const total = minutesToMs(durations[state.mode])
  const days = weekDays(new Date(), (settings?.week_starts_on ?? 1) as 0 | 1)
  const perDay = days.map((d) => focusMinutes(sessions, toISODate(d), toISODate(d)))
  const weekTotal = perDay.reduce((a, b) => a + b, 0)
  const today = todayISO()
  const weekDates = new Set(days.map(toISODate))
  const restMinutes = Math.round(sessions.filter(s => s.kind !== 'focus' && weekDates.has(toISODate(new Date(s.started_at)))).reduce((sum, s) => sum + s.duration_seconds, 0) / 60)

  return (
    <>
      <PageHeader title="Enfoque" />
      {saveError && <div role="alert" className="mb-5 rounded-card bg-blush p-4 text-sm"><p>No se pudo guardar el tiempo: {saveError}</p><p className="mt-1 text-xs">El registro se conserva pendiente en este navegador.</p><Button variant="light" size="sm" className="mt-3" onClick={retrySave}>Reintentar guardado</Button></div>}
      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Card tone="ivory" className="relative flex flex-col items-center gap-6 overflow-hidden py-10">
          <Segmented<FocusKind>
            label="Tipo de bloque"
            value={state.mode}
            onChange={setMode}
            options={(['focus', 'short_break', 'long_break'] as const).map((m) => ({ value: m, label: copy.focusKind[m] }))}
          />
          <ProgressRing value={state.indefinite ? 0 : 1 - remainingMs / total} size={260} stroke={12} color={modeColor[state.mode]}>
            <div className="text-center">
              <FocusClock />
              <p className="mt-1 text-xs text-muted">{state.indefinite ? 'Enfoque sin límite · Tiempo transcurrido' : copy.focusKind[state.mode]}</p>
            </div>
          </ProgressRing>
          <PomodoroControls />
          <div className="w-full max-w-sm">
            <Select aria-label="Tarea en la que te concentras" value={taskId ?? ''} onChange={(e) => setTaskId(e.target.value || null)} className="rounded-full text-xs">
              <option value="">Sin tarea asociada</option>
              {tasks.filter((t) => t.status !== 'done').map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </Select>
          </div>
          <Mascot variant="hero" className="character-outline pointer-events-none absolute top-6 right-6 hidden h-36 min-[1400px]:block" />
        </Card>

        <div className="flex flex-col gap-5">
          <Card tone="sun">
            <p className="text-sm font-semibold">Esta semana</p>
            <p className="mt-2 text-5xl font-light tracking-tight">{formatMinutes(weekTotal)}</p>
            <p className="text-xs text-ink-soft">de concentración</p>
            {restMinutes > 0 && <p className="mt-1 text-xs text-ink-soft">{formatMinutes(restMinutes)} de descanso registrados</p>}
            <BarChart
              className="mt-5"
              title="Minutos de enfoque por día"
              height={110}
              data={days.map((d, i) => ({
                label: dayLabel(d),
                full: formatLong(d),
                value: perDay[i],
                display: formatMinutes(perDay[i]),
                highlight: toISODate(d) === today,
              }))}
            />
          </Card>
          <Card>
            <h2 className="mb-4 text-sm font-semibold">Añadir tiempo</h2>
            <ManualTimeEntry />
            <div className="mt-5 flex items-center gap-3 border-t border-line pt-5">
              <IconButton label={state.indefinite && state.status === 'paused' ? 'Continuar cronómetro indefinido' : 'Iniciar cronómetro indefinido'} variant="sun" size="lg" disabled={!!state.indefinite && state.status === 'running'} onClick={startIndefinite} className="size-14">
                <InfinityIcon className="size-6" />
              </IconButton>
              <span className="text-sm font-medium">{state.indefinite && state.status === 'running' ? 'Cronómetro indefinido en marcha' : state.indefinite && state.status === 'paused' ? 'Continuar cronómetro indefinido' : 'Iniciar cronómetro indefinido'}</span>
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}
