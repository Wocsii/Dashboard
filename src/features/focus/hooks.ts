import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { subDays } from 'date-fns'
import { repo } from '@/data'
import type { FocusSession, FocusSessionInput } from '@/types/domain'

export const focusKey = ['focus_sessions'] as const
const HISTORY_DAYS = 120

export function useFocusSessions() {
  return useQuery({
    queryKey: focusKey,
    queryFn: () => repo().listFocusSessions(subDays(new Date(), HISTORY_DAYS).toISOString()),
  })
}

export function useLogFocusSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: FocusSessionInput) => repo().createFocusSession(input),
    onSuccess: (s) => qc.setQueryData<FocusSession[]>(focusKey, (l = []) => [s, ...l]),
  })
}
