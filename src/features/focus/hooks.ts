import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { subDays } from 'date-fns'
import { useProjects } from '../projects/hooks'
import { useTasks } from '../tasks/hooks'
import { useToast } from '@/components/ui/Toast'
import { repo } from '@/data'
import type { FocusSession, FocusSessionInput } from '@/types/domain'

export const focusKey = ['focus_sessions'] as const
const HISTORY_DAYS = 120

export function useFocusSessions({ includeExcluded = false } = {}) {
  const { data: projects = [] } = useProjects()
  const { data: tasks = [] } = useTasks()
  return useQuery({
    queryKey: focusKey,
    select: (sessions) => includeExcluded ? sessions : sessions.filter((s) => {
      const task = tasks.find((t) => t.id === s.task_id)
      const project = projects.find((p) => p.id === task?.project_id)
      return project?.exercise_config?.countAsFocus !== false
    }),
    queryFn: () => repo().listFocusSessions(subDays(new Date(), HISTORY_DAYS).toISOString()),
  })
}

export function useLogFocusSession() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    scope: { id:'focus-session-log' },
    mutationFn: (input: FocusSessionInput) => repo().createFocusSession(input),
    onError: () => toast('No se pudo guardar el tiempo. Revisa la conexión.', 'error'),
    onSuccess: (s) => qc.setQueryData<FocusSession[]>(focusKey, (l = []) => [s, ...l.filter((row) => row.id !== s.id)]),
  })
}
