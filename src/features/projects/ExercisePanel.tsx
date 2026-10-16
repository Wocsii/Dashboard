import { useState, type FormEvent } from 'react'
import { Flame, Dumbbell, Coffee } from 'lucide-react'
import { BarChart } from '@/components/ui/BarChart'
import { Button } from '@/components/ui/Button'
import { ConfirmButton } from '@/components/ui/ConfirmButton'
import { Field, Input } from '@/components/ui/Field'
import { ErrorNote, Spinner } from '@/components/ui/States'
import { formatShort, todayISO } from '@/lib/dates'
import type { ExerciseLog, ExerciseLogInput, Project } from '@/types/domain'
import { exerciseMetrics, exerciseSummary, metricHistory } from './exercise'
import { useExerciseLogs, useExerciseMutations } from './exercise-hooks'
import { useSettings } from '../settings/hooks'

export function ExercisePanel({ project }: { project: Project }) {
  const query = useExerciseLogs()
  const { data:settings } = useSettings()
  const [date,setDate] = useState(todayISO)
  const config = project.exercise_config!
  const logs = (query.data ?? []).filter((log) => log.project_id === project.id)
  const current = logs.find((log) => log.date === date)
  const summary = exerciseSummary(logs,config.weeklyTarget,new Date(),settings?.week_starts_on === 0 ? 0 : 1)
  return <section aria-label="Progreso de ejercicio" className="mt-5 border-t border-line pt-4">
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-xl bg-card p-3"><p className="text-xl font-semibold tabular-nums">{summary.workouts}/{config.weeklyTarget}</p><p className="mt-1 text-[11px] text-muted">Entrenamientos esta semana</p></div>
      <div className="rounded-xl bg-sun-soft p-3"><p className="flex items-center gap-1 text-xl font-semibold"><Flame aria-hidden className="size-4" />{summary.streak}</p><p className="mt-1 text-[11px] text-ink-soft">Días de ejercicio en racha</p></div>
    </div>
    <p className="mt-2 text-[11px] text-muted">El descanso conserva la racha; un día sin registrar la interrumpe.</p>
    {query.isPending ? <Spinner /> : query.error ? <ErrorNote error={query.error} onRetry={() => void query.refetch()} /> : <>
      <div className="mt-4"><Field label="Día del registro">{(id) => <Input id={id} type="date" max={todayISO()} required value={date} onChange={(e) => { if (e.target.value && e.target.value <= todayISO()) setDate(e.target.value) }} />}</Field></div>
      <ExerciseEntry key={`${date}:${current?.updated_at ?? 'new'}`} project={project} date={date} current={current} />
      <div className="mt-5 flex flex-col gap-5">{config.metrics.map(({ id,target }) => {
        const metric = exerciseMetrics[id], history = metricHistory(logs,id)
        return <div key={id} className="rounded-xl bg-card p-3">
          <div className="flex items-baseline justify-between gap-2"><h3 className="text-sm font-medium">{metric.label}</h3><span className="text-xs text-muted">{history.at(-1)?.display ?? 'Sin datos'}</span></div>
          {target !== undefined && <p className="mt-1 text-[11px] text-muted">Meta: {target} {metric.unit}</p>}
          {history.length ? <BarChart className="mt-3" title={`${metric.label} de ${project.name}`} data={history} height={80} /> : <p className="mt-3 text-xs text-muted">Registra tu primer entrenamiento para ver el progreso.</p>}
        </div>
      })}</div>
      {logs.length > 0 && <details className="mt-4"><summary className="cursor-pointer text-xs font-medium">Historial · {logs.length} días</summary><ul className="mt-2 flex max-h-56 flex-col gap-2 overflow-auto">{[...logs].sort((a,b) => b.date.localeCompare(a.date)).map((log) => <li key={log.id}><button type="button" onClick={() => setDate(log.date)} className="flex w-full items-center justify-between rounded-lg bg-card p-2 text-left text-xs"><span>{formatShort(log.date)}</span><span>{log.status === 'rest' ? 'Descanso' : 'Entrenamiento'}</span></button></li>)}</ul></details>}
    </>}
  </section>
}

function ExerciseEntry({ project,date,current }: { project:Project; date:string; current?:ExerciseLog }) {
  const { save,remove } = useExerciseMutations()
  const [values,setValues] = useState<ExerciseLogInput['values']>(current?.values ?? {})
  const [error,setError] = useState('')
  const [saved,setSaved] = useState(false)
  const busy = save.isPending || remove.isPending
  async function checkIn(status: ExerciseLogInput['status'], metrics = current?.values ?? {}) {
    setError(''); setSaved(false)
    try {
      await save.mutateAsync({ project_id:project.id,date,status,values:status === 'rest' ? {} : metrics })
      setSaved(true)
    } catch { setError('No se pudo guardar el registro. Inténtalo de nuevo.') }
  }
  const submit = (event:FormEvent) => { event.preventDefault(); void checkIn('exercise',values) }
  return <div className="mt-3">
    <div className="grid grid-cols-2 gap-2">
      <Button size="sm" variant={current?.status === 'exercise' ? 'sun' : 'light'} aria-pressed={current?.status === 'exercise'} disabled={busy || project.status !== 'active'} onClick={() => void checkIn('exercise')}><Dumbbell aria-hidden className="size-3.5" />{date === todayISO() ? 'Hoy entrené' : 'Entrené'}</Button>
      <Button size="sm" variant={current?.status === 'rest' ? 'sun' : 'light'} aria-pressed={current?.status === 'rest'} disabled={busy || project.status !== 'active'} onClick={() => void checkIn('rest')}><Coffee aria-hidden className="size-3.5" />{date === todayISO() ? 'Hoy descansé' : 'Descansé'}</Button>
    </div>
    {project.status !== 'active' && <p className="mt-2 text-xs text-muted">Reactiva el proyecto para registrar entrenamientos.</p>}
    {project.exercise_config!.metrics.length > 0 && <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">{project.exercise_config!.metrics.map(({ id }) => {
        const metric = exerciseMetrics[id]
        return <Field key={id} label={`${metric.label} (${metric.unit})`}>{(fieldId) => <Input id={fieldId} type="number" min={0} max={metric.max} step={id === 'repetitions' || id === 'intensity' ? 1 : 'any'} value={values[id] ?? ''} disabled={busy || project.status !== 'active'} onChange={(e) => {
          setSaved(false)
          setValues((previous) => { const next = { ...previous }; if (e.target.value === '') delete next[id]; else next[id] = Number(e.target.value); return next })
        }} />}</Field>
      })}</div>
      <Button type="submit" size="sm" disabled={busy || project.status !== 'active'}>Guardar entrenamiento</Button>
    </form>}
    {current && <div className="mt-3"><ConfirmButton confirmLabel="Confirmar borrado" disabled={busy} onConfirm={() => {
      setError('')
      remove.mutate(current.id,{ onError:() => setError('No se pudo borrar el registro.') })
    }}>Borrar registro</ConfirmButton></div>}
    {saved && <p role="status" className="mt-2 text-xs text-ink-soft">Registro guardado</p>}
    {error && <p role="alert" className="mt-2 text-xs text-coral-accessible">{error}</p>}
  </div>
}
