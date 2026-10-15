import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addDays, endOfDay, startOfDay } from 'date-fns'
import type { CalendarStatus } from '@/types/domain'
import { calendarApi, CalendarApiError } from './api'

export const calendarKeys = {
  status: ['calendar', 'status'] as const,
  calendars: ['calendar', 'list'] as const,
  events: (range: string) => ['calendar', 'events', range] as const,
}

export function useCalendarStatus() {
  return useQuery<CalendarStatus>({ queryKey: calendarKeys.status, queryFn: calendarApi.status, staleTime: 60_000, retry: false })
}

export function useCalendars(enabled: boolean) {
  return useQuery({ queryKey: calendarKeys.calendars, queryFn: calendarApi.calendars, enabled, staleTime: 10 * 60_000, retry: false })
}

export type Range = 'today' | 'week' | 'upcoming'

export function rangeBounds(range: Range, now = new Date()): [Date, Date] {
  if (range === 'today') return [startOfDay(now), endOfDay(now)]
  if (range === 'week') return [startOfDay(now), endOfDay(addDays(now, 6))]
  return [now, endOfDay(addDays(now, 30))]
}

export function useEvents(range: Range, enabled: boolean) {
  const qc = useQueryClient()
  return useQuery({
    queryKey: calendarKeys.events(range),
    queryFn: async () => {
      const [a, b] = rangeBounds(range)
      try {
        return await calendarApi.events(a, b)
      } catch (e) {
        // Token revocado o caducado: refresca el estado para mostrar "Reconectar"
        if (e instanceof CalendarApiError && e.code === 'needs_reauth') void qc.invalidateQueries({ queryKey: calendarKeys.status })
        throw e
      }
    },
    enabled,
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
    retry: (n, e) => !(e instanceof CalendarApiError && e.code !== 'network') && n < 2,
  })
}

export function useDisconnectCalendar() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: calendarApi.disconnect, onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar'] }) })
}
