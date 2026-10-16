import { Focus, Square } from 'lucide-react'
import type { Task } from '@/types/domain'
import { useToast } from '@/components/ui/Toast'
import { usePomodoro } from './PomodoroProvider'

export function TaskFocusButton({ task }: { task: Task }) {
  const { state, taskId, startTaskFocus, reset } = usePomodoro()
  const toast = useToast()
  const active = state.indefinite === true && state.status !== 'idle' && taskId === task.id
  const label = `${active ? 'Detener enfoque' : 'Activar enfoque indefinido'}: ${task.title}`
  return <button
    type="button" aria-label={label} title={label} aria-pressed={active}
    onPointerDown={(event) => event.stopPropagation()}
    onKeyDown={(event) => event.stopPropagation()}
    onClick={(event) => {
      event.stopPropagation()
      if (active) reset()
      else startTaskFocus(task.id)
      toast(active ? 'Enfoque finalizado' : `Enfoque sin límite: ${task.title}`)
    }}
    className="task-focus-button grid size-7 shrink-0 cursor-pointer touch-auto place-items-center rounded-full text-ink-soft transition-colors hover:bg-sky-100 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
  >{active ? <Square aria-hidden className="size-3.5 fill-current" /> : <Focus aria-hidden className="size-4" />}</button>
}
