import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addDays, endOfDay, startOfDay } from 'date-fns'
import type { CalendarProvider, CalendarStatus } from '@/types/domain'
import { useCalendarProvider } from './CalendarProvider'
import { calendarApi, CalendarApiError } from './api'

export const calendarKeys = {
  status: ['calendar', 'status'] as const,
  calendars: ['calendar', 'list'] as const,
  events: (range: string) => ['calendar', 'events', range] as const,
}

export function useCalendarStatus(source?: CalendarProvider) {
  const { provider:current } = useCalendarProvider()
  const provider = source ?? current
  return useQuery<CalendarStatus>({ queryKey: [...calendarKeys.status,provider], queryFn: () => calendarApi.status(provider), staleTime: 60_000, retry: false })
}

export function useCalendars(enabled: boolean, source?: CalendarProvider) {
  const { provider:current } = useCalendarProvider()
  const provider = source ?? current
  return useQuery({ queryKey: [...calendarKeys.calendars,provider], queryFn: () => calendarApi.calendars(provider), enabled, staleTime: 10 * 60_000, retry: false })
}

export type Range = 'today' | 'threeDays' | 'week' | 'upcoming'

export function rangeBounds(range: Range, now = new Date()): [Date, Date] {
  if (range === 'today') return [startOfDay(now), endOfDay(now)]
  if (range === 'threeDays') return [now, endOfDay(addDays(now, 2))]
  if (range === 'week') return [startOfDay(now), endOfDay(addDays(now, 6))]
  return [now, endOfDay(addDays(now, 30))]
}

export function useEvents(range: Range, enabled: boolean, source?: CalendarProvider) {
  const [start, end] = rangeBounds(range)
  return useCalendarEvents(start, end, enabled, range, source)
}

export function useCalendarEvents(start: Date, end: Date, enabled: boolean, label = 'view', source?: CalendarProvider) {
  const qc = useQueryClient()
  const { provider:current } = useCalendarProvider()
  const provider = source ?? current
  return useQuery({
    queryKey: calendarKeys.events(`${provider}:${label}:${start.toDateString()}:${end.toDateString()}`),
    queryFn: async () => {
      try { return await calendarApi.events(start, end, provider) } catch (e) {
        if (e instanceof CalendarApiError && e.code === 'needs_reauth') void qc.invalidateQueries({ queryKey: calendarKeys.status })
        throw e
      }
    },
    // Keep visited ranges available while fresh events load in the background.
    enabled, staleTime: 60_000, gcTime: 30 * 60_000, refetchInterval: 60_000,
    retry: (n, e) => !(e instanceof CalendarApiError && e.code !== 'network') && n < 2,
  })
}

export function useDisconnectCalendar(source?: CalendarProvider) {
  const qc = useQueryClient()
  const { provider:current } = useCalendarProvider()
  return useMutation({ mutationFn: () => calendarApi.disconnect(source ?? current), onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar'] }) })
}
