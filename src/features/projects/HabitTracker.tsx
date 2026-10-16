import { addDays, startOfWeek } from 'date-fns'
import { Check, Clock3, Play, Square } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { repo } from '@/data'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { projectColorVar } from '@/config/theme.config'
import { todayISO } from '@/lib/dates'
import type { Project } from '@/types/domain'
import { usePomodoro } from '../focus/PomodoroProvider'
import { useSettings } from '../settings/hooks'
import { tasksKey, useTasks } from '../tasks/hooks'
import { useExerciseLogs, useExerciseMutations } from './exercise-hooks'

export function HabitTracker({ project, timer = false, compact = false }: { project: Project; timer?: boolean; compact?: boolean }) {
  const { data: logs = [] } = useExerciseLogs()
  const { data: settings } = useSettings()
  const { data: tasks = [] } = useTasks()
  const { save, remove } = useExerciseMutations()
  const focus = usePomodoro()
  const qc = useQueryClient()
  const toast = useToast()
  const [starting, setStarting] = useState(false)
  const today = todayISO()
  const start = startOfWeek(new Date(), { weekStartsOn: settings?.week_starts_on === 0 ? 0 : 1 })
  const entries = logs.filter((l) => l.project_id === project.id)
  const done = entries.find((l) => l.date === today && l.status === 'exercise')
  const active = tasks.some((t) => t.project_id === project.id && t.id === focus.taskId) && focus.state.status === 'running'
  const busy = save.isPending || remove.isPending || starting
  function check(date: string) {
    const entry = entries.find((l) => l.date === date)
    if (entry?.status === 'exercise') remove.mutate(entry.id, { onError: () => toast('No se pudo actualizar el hábito') })
    else save.mutate({ project_id: project.id, date, status: 'exercise', values: entry?.values ?? {} }, { onError: () => toast('No se pudo guardar el hábito') })
  }
  async function startTimer() {
    if (active) { focus.pause(); return }
    setStarting(true)
    try {
      let task = tasks.find((t) => t.project_id === project.id && t.status !== 'done')
      if (!task) {
        task = await repo().createTask({ title: project.name, project_id: project.id, tags: ['habit-session'] })
        await qc.invalidateQueries({ queryKey: tasksKey })
      }
      focus.startTaskFocus(task.id)
    } catch { toast('No se pudo iniciar el hábito. Inténtalo de nuevo.') }
    finally { setStarting(false) }
  }
  return <div className={compact ? 'shrink-0' : 'mt-3'} onClick={(e) => e.stopPropagation()}>
    {!compact && <div className="grid grid-cols-7 gap-1" aria-label={`Semana de ${project.name}`}>
      {Array.from({ length: 7 }, (_, i) => {
        const day = addDays(start, i), date = todayISO(day)
        const checked = entries.some((l) => l.date === date && l.status === 'exercise')
        return <button key={date} type="button" disabled={busy || date > today || project.status !== 'active'} aria-label={`${project.name}, ${date}: ${checked ? 'completado' : 'pendiente'}`} aria-pressed={checked} onClick={() => check(date)} className="flex flex-col items-center gap-1 rounded-lg py-1 text-[10px] disabled:opacity-50">
          <span>{['D','L','M','X','J','V','S'][day.getDay()]}</span>
          <span className={`grid size-7 place-items-center rounded-full border ${date === today ? 'border-ink' : 'border-line'}`} style={{ background: checked ? projectColorVar(project.color) : undefined }}>{checked && <Check className="size-3.5" />}</span>
        </button>
      })}
    </div>}
    <div className={compact ? 'flex items-center gap-1' : 'mt-3 flex flex-wrap items-center justify-between gap-2'}>
      {!compact && <span className="text-[11px] text-muted">{entries.filter((l) => l.status === 'exercise' && l.date >= todayISO(start) && l.date <= today).length}/{project.exercise_config!.weeklyTarget} esta semana</span>}
      <Button size="sm" variant="light" className={compact ? 'gap-1 px-2 text-[11px]' : undefined} disabled={busy || project.status !== 'active'} onClick={() => check(today)}><Check className="size-3.5" />{done ? 'Hecho hoy' : 'Marcar hoy'}</Button>
      {timer && <Button size="sm" variant="ghost" className={compact ? 'size-8 px-0' : undefined} aria-label={compact ? active ? 'Pausar' : 'Iniciar reloj' : undefined} title={active ? 'Pausar reloj' : 'Iniciar reloj'} aria-pressed={active} disabled={busy || project.status !== 'active'} onClick={() => void startTimer()}>{active ? <Square className="size-3.5" /> : compact ? <Clock3 className="size-3.5" /> : <Play className="size-3.5" />}{!compact && (active ? 'Pausar' : 'Iniciar reloj')}</Button>}
    </div>
  </div>
}
