import { useState, type FormEvent } from 'react'
import { BookOpen, Timer } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { ErrorNote, Spinner } from '@/components/ui/States'
import { todayISO } from '@/lib/dates'
import type { ExerciseLog, Project } from '@/types/domain'
import { useExerciseLogs, useExerciseMutations } from './exercise-hooks'
import { useHabitProgress } from './useHabitProgress'
import { goalLabel } from './study'

export function StudyPanel({ project }: { project: Project }) {
  const [date, setDate] = useState(todayISO)
  const query = useExerciseLogs()
  const progress = useHabitProgress(project, date)
  const config = project.exercise_config!
  const current = query.data?.find((l) => l.project_id === project.id && l.date === date)
  return <section aria-label="Seguimiento de estudio" className="mt-5 border-t border-line pt-4">
    <Field label="Día del registro">{(id) => <Input id={id} type="date" max={todayISO()} required value={date} onChange={(e) => { if (e.target.value && e.target.value <= todayISO()) setDate(e.target.value) }} />}</Field>
    <div className="mt-3 grid grid-cols-2 gap-3">
      <div className="rounded-tile bg-card p-3"><Timer className="mb-2 size-4" aria-hidden /><p className="text-xl font-semibold tabular-nums">{Math.floor(progress.minutes)} min</p><p className="mt-1 text-[11px] text-muted">Tiempo de estudio · {(progress.minutes / 60).toLocaleString('es-ES', { maximumFractionDigits:2 })} h</p><p className="mt-1 text-[11px] text-muted">{progress.pomodoros} Pomodoros completados</p></div>
      <div className="rounded-tile bg-card p-3"><BookOpen className="mb-2 size-4" aria-hidden /><p className="text-xl font-semibold tabular-nums">{progress.volume}{config.volume?.target ? ` / ${config.volume.target}` : ''}</p><p className="mt-1 text-[11px] text-muted">{config.volume?.unit ?? 'páginas'}</p></div>
    </div>
    {config.timeGoal && <div className="mt-3 rounded-tile bg-sun-soft p-3 text-xs" role="status">Meta diaria: {goalLabel(config)} · {progress.reached ? 'Alcanzada' : 'En curso'}{config.timeGoal.required && ' · Obligatoria para completar el día'}</div>}
    <p className="mt-3 text-xs text-muted">El reloj actualiza el tiempo automáticamente. {config.countAsFocus === false ? 'Este tiempo no suma a tus estadísticas de enfoque.' : 'Este tiempo también suma a tus estadísticas de enfoque.'}</p>
    {query.isPending ? <Spinner /> : query.error ? <ErrorNote error={query.error} onRetry={() => void query.refetch()} /> : <StudyEntry key={`${project.id}:${date}`} project={project} date={date} current={current} />}
  </section>
}

function StudyEntry({ project, date, current }: { project: Project; date: string; current?: ExerciseLog }) {
  const { save } = useExerciseMutations()
  const [volume, setVolume] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const config = project.exercise_config!
  async function submit(event: FormEvent) {
    event.preventDefault()
    setMessage('')
    try {
      await save.mutateAsync({ project_id:project.id,date,status:'exercise',values:{ ...current?.values,repetitions:Number(volume ?? current?.values.repetitions ?? 0) } })
      setMessage('Registro guardado')
    } catch { setMessage('No se pudo guardar el registro. Inténtalo de nuevo.') }
  }
  return <form onSubmit={(e) => void submit(e)} className="mt-4 flex flex-col gap-3">
    <Field label={`Volumen de trabajo (${config.volume?.unit ?? 'páginas'})`}>{(id) => <Input id={id} type="number" min={0} step={1} disabled={project.status !== 'active'} value={volume ?? current?.values.repetitions ?? ''} onChange={(e) => setVolume(e.target.value)} />}</Field>
    <Button type="submit" size="sm" disabled={save.isPending || project.status !== 'active'}>Guardar estudio</Button>
    {message && <p role="status" className="text-xs text-ink-soft">{message}</p>}
  </form>
}
