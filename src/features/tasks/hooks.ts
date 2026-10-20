import { isGoogleFocusTask } from '../google-tasks/task-link'
import { useQuery } from '@tanstack/react-query'
import { repo } from '@/data'
import { useListMutation } from '@/data/optimistic'
import type { Task, TaskInput } from '@/types/domain'

export const tasksKey = ['tasks'] as const
export const deletedTasksKey = ['deleted-tasks'] as const

export function useTasks({ includeGoogleFocus = false } = {}) {
  return useQuery({ queryKey: tasksKey, queryFn: () => repo().listTasks(), select: tasks => includeGoogleFocus ? tasks : tasks.filter(task => !isGoogleFocusTask(task)) })
}

type Patch = Partial<TaskInput> & { position?: number }

export function useCreateTask() {
  return useListMutation<Patch & { title: string }, Task>({
    key: tasksKey,
    mutationFn: (input) => repo().createTask(input),
    apply: (list, input) => [
      ...list,
      {
        id: `tmp-${Date.now()}`, user_id: '', project_id: null, description: '', status: 'todo', priority: 'medium',
        due_date: null, tags: [], position: Date.now(), is_focus: false, completed_at: null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...input,
      },
    ],
    errorMessage: 'No se pudo crear la tarea',
  })
}

export function useUpdateTask() {
  return useListMutation<{ id: string; patch: Patch }, Task>({
    key: tasksKey,
    mutationFn: ({ id, patch }) => repo().updateTask(id, patch),
    apply: (list, { id, patch }) =>
      list.map((t) => {
        if (t.id !== id) return patch.is_focus ? { ...t, is_focus: false } : t
        const next = { ...t, ...patch }
        if (patch.status === 'done' && t.status !== 'done') next.completed_at = new Date().toISOString()
        if (patch.status && patch.status !== 'done') next.completed_at = null
        return next
      }),
    errorMessage: 'No se pudo guardar la tarea',
  })
}

export function useDeleteTask() {
  return useListMutation<string, Task>({
    key: tasksKey,
    mutationFn: (id) => repo().deleteTask(id),
    apply: (list, id) => list.filter((t) => t.id !== id),
    errorMessage: 'No se pudo borrar la tarea',
  })
}

/** Marca una tarea como la prioritaria (y desmarca las demás). */
export function useSetFocusTask() {
  const update = useUpdateTask()
  const { data: tasks = [] } = useTasks()
  return (id: string) => {
    for (const t of tasks) if (t.is_focus && t.id !== id) update.mutate({ id: t.id, patch: { is_focus: false } })
    update.mutate({ id, patch: { is_focus: true } })
  }
}
