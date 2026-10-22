import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addDays, endOfDay, startOfDay } from 'date-fns'
import type { CalendarProvider, CalendarStatus } from '@/types/domain'
import { useCalendarProvider } from './CalendarProvider'
import { calendarApi, CalendarApiError } from './api'
import { useAuth } from '@/features/auth/AuthProvider'
import { cachedCalendarEvents, cachedCalendarStatus, clearCalendarSnapshot, saveCalendarEvents, saveCalendarStatus } from './snapshot'

export const calendarKeys = {
  status: ['calendar', 'status'] as const,
  calendars: ['calendar', 'list'] as const,
  events: (range: string) => ['calendar', 'events', range] as const,
}

export function useCalendarStatus(source?: CalendarProvider) {
  const { session } = useAuth()
  const userId = session?.user.id ?? 'demo'
  const { provider:current } = useCalendarProvider()
  const provider = source ?? current
  return useQuery<CalendarStatus>({
    queryKey: [...calendarKeys.status,provider,userId],
    initialData: () => cachedCalendarStatus(userId, provider),
    initialDataUpdatedAt: 0,
    queryFn: async ({ signal }) => {
      try {
        const status = await calendarApi.status(provider, signal)
        if (!signal.aborted) saveCalendarStatus(userId, provider, status)
        return status
      } catch (error) {
        if (!signal.aborted && error instanceof CalendarApiError && error.code === 'unauthorized') clearCalendarSnapshot(userId, provider)
        throw error
      }
    },
    staleTime: 60_000, retry: false,
  })
}

export function useCalendars(enabled: boolean, source?: CalendarProvider) {
  const { session } = useAuth()
  const { provider:current } = useCalendarProvider()
  const provider = source ?? current
  return useQuery({ queryKey: [...calendarKeys.calendars,provider,session?.user.id ?? 'demo'], queryFn: () => calendarApi.calendars(provider), enabled, staleTime: 10 * 60_000, retry: false })
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
  const { session } = useAuth()
  const userId = session?.user.id ?? 'demo'
  const { provider:current } = useCalendarProvider()
  const provider = source ?? current
  const status = useCalendarStatus(provider)
  const email = status.data?.state === 'connected' ? status.data.email : null
  const range = `${label}:${start.toDateString()}:${end.toDateString()}`
  return useQuery({
    queryKey: [...calendarKeys.events(`${provider}:${range}`), userId, email],
    initialData: () => cachedCalendarEvents(userId, provider, email, range)?.events,
    // Always revalidate a restored snapshot, while keeping it visible.
    initialDataUpdatedAt: 0,
    queryFn: async ({ signal }) => {
      try {
        const events = await calendarApi.events(start, end, provider, signal)
        if (!signal.aborted) saveCalendarEvents(userId, provider, email, range, events)
        return events
      } catch (e) {
        if (!signal.aborted && e instanceof CalendarApiError && ['needs_reauth', 'not_connected', 'unauthorized'].includes(e.code)) {
          clearCalendarSnapshot(userId, provider)
          void qc.invalidateQueries({ queryKey: [...calendarKeys.status, provider, userId] })
        }
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
  const { session } = useAuth()
  const { provider:current } = useCalendarProvider()
  const provider = source ?? current
  const userId = session?.user.id ?? 'demo'
  return useMutation({ mutationFn: () => calendarApi.disconnect(provider), onSuccess: async () => {
    await qc.cancelQueries({ queryKey: ['calendar'] })
    clearCalendarSnapshot(userId, provider)
    qc.removeQueries({ predicate: (query) => query.queryKey[0] === 'calendar' && query.queryKey[1] === 'events' && String(query.queryKey[2]).startsWith(`${provider}:`) })
    qc.setQueryData([...calendarKeys.status, provider, userId], { state: 'disconnected' })
    await qc.invalidateQueries({ queryKey: ['calendar'] })
  } })
}
