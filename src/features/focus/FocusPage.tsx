import { FocusClock } from './FocusClock'
import { ManualTimeEntry } from './ManualTimeEntry'
import { Mascot } from '@/components/ui/Mascot'
import { Infinity as InfinityIcon, Pause, Play, RotateCcw, SkipForward, Square } from 'lucide-react'
import { BarChart } from '@/components/ui/BarChart'
import { Button, IconButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input, Segmented, Select } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { ProgressRing } from '@/components/ui/Progress'
import { copy } from '@/config/copy.es'
import { dayLabel, formatLong, toISODate, todayISO, weekDays } from '@/lib/dates'
import { focusMinutes, formatMinutes } from '@/lib/stats'
import type { FocusKind } from '@/types/domain'
import { useSettings, useUpdateSettings } from '../settings/hooks'
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
  const { state, start, pause, reset, skip } = usePomodoro()
  const running = state.status === 'running'
  return (
    <div className="flex items-center justify-center gap-2">
      <IconButton label="Reiniciar" variant="light" size={size} onClick={reset} disabled={state.status === 'idle'}>
        <RotateCcw className="size-4" />
      </IconButton>
      <Button onClick={running ? pause : start} className={size === 'lg' ? 'h-12 px-7 text-base' : undefined}>
        {running ? <Pause className="size-4" /> : <Play className="size-4" />}
        {running ? 'Pausar' : state.status === 'paused' ? 'Continuar' : 'Empezar'}
      </Button>
      <IconButton label={state.indefinite ? 'Finalizar enfoque' : 'Saltar al siguiente bloque'} variant="light" size={size} onClick={skip}>
        {state.indefinite ? <Square className="size-4" /> : <SkipForward className="size-4" />}
      </IconButton>
    </div>
  )
}

function DurationSettings() {
  const { data: s } = useSettings()
  const update = useUpdateSettings()
  if (!s) return null
  const num = (key: 'focus_minutes' | 'short_break_minutes' | 'long_break_minutes' | 'long_break_every', label: string, max: number) => (
    <Field label={label}>
      {(id) => (
        <Input
          id={id}
          type="number"
          min={1}
          max={max}
          defaultValue={s[key]}
          onBlur={(e) => {
            const v = Math.max(1, Math.min(max, Number(e.target.value) || s[key]))
            if (v !== s[key]) update.mutate({ [key]: v })
          }}
        />
      )}
    </Field>
  )
  return (
    <div className="grid grid-cols-2 gap-3">
      {num('focus_minutes', 'Enfoque (min)', 180)}
      {num('short_break_minutes', 'Descanso corto (min)', 60)}
      {num('long_break_minutes', 'Descanso largo (min)', 90)}
      {num('long_break_every', 'Descanso largo cada', 12)}
      <label className="col-span-2 flex items-center gap-2 text-sm text-ink-soft">
        <input type="checkbox" className="size-4 accent-ink" checked={s.log_focus_sessions} onChange={(e) => update.mutate({ log_focus_sessions: e.target.checked })} />
        Registrar mi tiempo de concentración
      </label>
    </div>
  )
}

export function FocusPage() {
  const { state, remainingMs, durations, setMode, taskId, setTaskId, saveError, retrySave, saveConfirmed, startIndefinite } = usePomodoro()
  const { data: tasks = [] } = useTasks()
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
      {saveConfirmed && <p role="status" className="mb-4 text-sm text-ink-soft">Tiempo guardado</p>}
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
            <details className="mt-5 border-t border-line pt-4">
              <summary className="cursor-pointer text-sm font-medium">Duración y descansos del cronómetro</summary>
              <div className="mt-4"><DurationSettings /></div>
            </details>
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
