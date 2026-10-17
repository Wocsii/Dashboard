import { useQuery } from '@tanstack/react-query'
import { repo } from '@/data'
import { Button } from '@/components/ui/Button'
import { useProfile } from '../settings/hooks'
import { usePomodoro } from './PomodoroProvider'
import { pendingSessions } from './pending-sessions'
import { formatWorkedTime, taskWorkedSeconds } from './task-time'

export function TaskWorkedTime({ taskId }: { taskId: string }) {
  const { liveSession } = usePomodoro()
  const { data: profile } = useProfile()
  const sessions = useQuery({ queryKey: ['task-focus-sessions', taskId], queryFn: () => repo().listTaskFocusSessions(taskId) })
  const pending = profile ? pendingSessions(profile.id) : []
  const seconds = taskWorkedSeconds(taskId, [...sessions.data ?? [], ...pending], liveSession)
  return <div className="mb-4 rounded-tile bg-sky-50 px-4 py-3">
    <p className="text-xs text-muted">Tiempo trabajado</p>
    {sessions.isLoading ? <p className="mt-1 text-sm">Cargando tiempo…</p> : sessions.error ? <div role="alert" className="mt-1 text-sm">No se pudo cargar el tiempo. <Button size="sm" variant="ghost" onClick={() => void sessions.refetch()}>Reintentar</Button></div> : <p className="mt-1 text-lg font-semibold tabular-nums">{formatWorkedTime(seconds)}</p>}
  </div>
}
