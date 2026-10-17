import { useState } from 'react'
import { useProjectMap } from '../projects/hooks'
import { Focus, Square } from 'lucide-react'
import type { Task } from '@/types/domain'
import { useToast } from '@/components/ui/Toast'
import { usePomodoro } from './PomodoroProvider'

export function TaskFocusButton({ task, visible = false, resolveTaskId }: { task: Task; visible?: boolean; resolveTaskId?: () => Promise<string> }) {
  const [preparing, setPreparing] = useState(false)
  const { state, taskId, startTaskFocus, reset } = usePomodoro()
  const toast = useToast()
  const projects = useProjectMap()
  const project = projects.get(task.project_id ?? '')
  const disabled = !!project?.exercise_config && project.status !== 'active'
  const active = state.status !== 'idle' && taskId === task.id
  const label = `${active ? 'Detener enfoque' : project?.exercise_config?.timeGoal?.unit === 'pomodoros' ? 'Iniciar Pomodoro' : 'Activar enfoque indefinido'}: ${task.title}`
  return <button
    disabled={disabled || preparing} type="button" aria-label={label} title={label} aria-pressed={active}
    onPointerDown={(event) => event.stopPropagation()}
    onKeyDown={(event) => event.stopPropagation()}
    onClick={async (event) => {
      event.stopPropagation()
      setPreparing(true)
      try {
        if (active) reset()
        else startTaskFocus(resolveTaskId ? await resolveTaskId() : task.id)
        toast(active ? 'Enfoque finalizado' : `${project?.exercise_config?.timeGoal?.unit === 'pomodoros' ? 'Pomodoro' : 'Enfoque sin límite'}: ${task.title}`)
      } catch { toast('No se pudo vincular la tarea al reloj. Inténtalo de nuevo.', 'error') }
      finally { setPreparing(false) }
    }}
    className={`${visible ? '' : 'task-focus-button'} grid size-7 shrink-0 cursor-pointer touch-auto place-items-center rounded-full text-ink-soft transition-colors hover:bg-sky-100 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink`}
  >{active ? <Square aria-hidden className="size-3.5 fill-current" /> : <Focus aria-hidden className="size-4" />}</button>
}
