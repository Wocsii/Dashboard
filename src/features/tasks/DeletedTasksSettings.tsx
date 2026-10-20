import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { repo } from '@/data'
import { Button } from '@/components/ui/Button'
import { ErrorNote, Spinner } from '@/components/ui/States'
import { tasksKey, deletedTasksKey } from './hooks'

export function DeletedTasksSettings() {
  const qc = useQueryClient()
  const tasks = useQuery({ queryKey: deletedTasksKey, queryFn: () => repo().listDeletedTasks(), refetchInterval: 60000 })
  const restore = useMutation({
    mutationFn: (id: string) => repo().restoreTask(id),
    onSuccess: async () => {
      await Promise.all([qc.invalidateQueries({ queryKey: tasksKey }), qc.invalidateQueries({ queryKey: deletedTasksKey })])
    },
  })
  return <div className="flex flex-col gap-3">
    <p className="text-sm text-ink-soft">Puedes recuperar las tareas durante 14 días desde que las borras. Después se eliminan definitivamente.</p>
    {tasks.isLoading && <Spinner />}
    {tasks.error && <ErrorNote error={tasks.error} onRetry={() => void tasks.refetch()} />}
    {restore.error && <ErrorNote error={restore.error} />}
    {tasks.data?.length === 0 && <p className="text-sm text-muted">No hay tareas borradas.</p>}
    <ul className="flex flex-col gap-2">{tasks.data?.map(task => <li key={task.id} className="flex items-center justify-between gap-3 rounded-tile bg-glass p-3">
      <div className="min-w-0"><p className="break-words text-sm font-medium">{task.title}</p><p className="text-xs text-muted">Se elimina el {new Date(Date.parse(task.deleted_at!) + 14 * 86400000).toLocaleDateString('es-ES')}</p></div>
      <Button size="sm" variant="light" disabled={restore.isPending} onClick={() => restore.mutate(task.id)} aria-label={`Recuperar ${task.title}`}>Recuperar</Button>
    </li>)}</ul>
  </div>
}
