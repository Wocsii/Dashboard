import { useQueryClient } from '@tanstack/react-query'
import { repo } from '@/data'
import type { Task } from '@/types/domain'
import { TaskFocusButton } from '../focus/TaskFocusButton'
import { tasksKey, useTasks } from '../tasks/hooks'
import { googleFocusId, googleTaskKey, googleTaskView } from './task-link'
import type { GoogleTask } from './api'

export function GoogleTaskFocusButton({ list, task }: { list: string; task: GoogleTask }) {
  const { data: tasks = [] } = useTasks({ includeGoogleFocus: true })
  const qc = useQueryClient()
  const key = googleTaskKey(list, task.id)
  const linked = tasks.find(row => row.tags.includes(key))
  const view = googleTaskView(list, task)
  return <TaskFocusButton visible task={{ ...view, id: linked?.id ?? view.id }} resolveTaskId={async () => {
    const profile = await repo().getProfile()
    const id = await googleFocusId(profile.id, list, task.id)
    const saved = await repo().saveGoogleFocusTask({ id, title: view.title.slice(0, 300), description: view.description, tags: [key] })
    qc.setQueryData<Task[]>(tasksKey, (rows = []) => [...rows.filter(row => row.id !== saved.id), saved])
    return saved.id
  }} />
}
