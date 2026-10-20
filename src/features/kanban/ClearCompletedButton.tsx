import { BrushCleaning } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { IconButton } from '@/components/ui/Button'
import { ErrorNote } from '@/components/ui/States'
import { repo } from '@/data'
import { tasksKey, deletedTasksKey } from '../tasks/hooks'

export function ClearCompletedButton({ ids }: { ids: string[] }) {
  const qc = useQueryClient()
  const clear = useMutation({
    mutationFn: () => repo().trashTasks(ids),
    onSettled: async () => {
      await Promise.all([qc.invalidateQueries({ queryKey: tasksKey }), qc.invalidateQueries({ queryKey: deletedTasksKey })])
    },
  })
  return <div className="flex items-center gap-2">
    <IconButton label="Limpiar completadas" className="bg-sun-soft text-amber-600" disabled={!ids.length || clear.isPending} onClick={() => clear.mutate()}><BrushCleaning className="size-5" /></IconButton>
    {clear.error && <ErrorNote error={clear.error} />}
  </div>
}
