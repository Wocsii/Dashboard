import { useQuery } from '@tanstack/react-query'
import { useProfile } from '../settings/hooks'
import { TaskWorkedTime } from '../focus/TaskWorkedTime'
import { googleFocusId } from './task-link'
import { ErrorNote } from '@/components/ui/States'

export function GoogleTaskWorkedTime({ list, task }: { list: string; task: string }) {
  const profile = useProfile()
  const id = useQuery({ queryKey: ['google-focus-id', profile.data?.id, list, task], enabled: !!profile.data, queryFn: () => googleFocusId(profile.data!.id, list, task) })
  if (profile.error || id.error) return <ErrorNote error={profile.error ?? id.error} />
  return id.data ? <TaskWorkedTime taskId={id.data} /> : <p className="mb-4 text-xs text-muted">Cargando tiempo trabajado…</p>
}
