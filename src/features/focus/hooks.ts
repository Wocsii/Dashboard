import { useEffect, useRef } from 'react'
import { useProfile } from '../settings/hooks'
import { timerSessionId } from '../projects/study'
import { confirmSession, pendingSessions, queueSession } from './pending-sessions'
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
  const { data: profile } = useProfile()
  const lastError = useRef(0)
  const mutation = useMutation({
    mutationKey: ['focus-session-log', profile?.id],
    scope: { id: 'focus-session-log' },
    retry: 2,
    retryDelay: attempt => 500 * 2 ** attempt,
    mutationFn: async (input: FocusSessionInput) => {
      const userId = profile?.id ?? (await repo().getProfile()).id
      const queued = queueSession(userId, { ...input, id: input.id ?? timerSessionId(Date.parse(input.started_at), input.task_id ?? userId) })
      const saved = await repo().createFocusSession(queued)
      confirmSession(userId, queued)
      return saved
    },
    onError: () => {
      if (Date.now() - lastError.current > 30_000) {
        lastError.current = Date.now()
        toast('No se pudo guardar el tiempo. Se conserva pendiente y se reintentará al recuperar la conexión o volver a esta pestaña.', 'error')
      }
    },
    onSuccess: (s) => qc.setQueryData<FocusSession[]>(focusKey, (l = []) => [s, ...l.filter((row) => row.id !== s.id)]),
  })
  const { mutate } = mutation
  useEffect(() => {
    if (!profile) return
    const retryPending = () => {
      if (qc.isMutating({ mutationKey: ['focus-session-log', profile.id] })) return
      for (const session of pendingSessions(profile.id)) mutate(session)
    }
    retryPending()
    window.addEventListener('online', retryPending)
    window.addEventListener('focus', retryPending)
    return () => { window.removeEventListener('online', retryPending); window.removeEventListener('focus', retryPending) }
  }, [profile, mutate, qc])
  return mutation
}
