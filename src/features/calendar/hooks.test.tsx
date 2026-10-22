import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { CalendarEvent, CalendarStatus } from '@/types/domain'
import { calendarApi } from './api'
import { useCalendarStatus, useDisconnectCalendar, useEvents } from './hooks'
import { cachedCalendarEvents, cachedCalendarStatus, clearCalendarSnapshots, saveCalendarEvents, saveCalendarStatus } from './snapshot'

vi.mock('@/features/auth/AuthProvider', () => ({ useAuth: () => ({ session: { user: { id: 'alice' } } }) }))
vi.mock('./CalendarProvider', () => ({ useCalendarProvider: () => ({ provider: 'apple' }) }))
vi.mock('./api', async (original) => ({ ...await original<typeof import('./api')>(), calendarApi: { status: vi.fn(), events: vi.fn(), disconnect: vi.fn() } }))
const status: CalendarStatus = { state: 'connected', email: 'alice@icloud.com' }
const event: CalendarEvent = { id: 'one', calendarId: 'personal', title: 'Plan guardado', start: new Date().toISOString(), end: new Date(Date.now() + 3600000).toISOString(), allDay: false, color: '#abc' }
const day = new Date().toDateString()
const range = `today:${day}:${day}`
let qc: QueryClient
function wrapper({ children }: { children: ReactNode }) { return <QueryClientProvider client={qc}>{children}</QueryClientProvider> }
beforeEach(() => {
  clearCalendarSnapshots()
  vi.resetAllMocks()
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})
afterEach(() => { cleanup(); qc.clear(); clearCalendarSnapshots() })

it('shows persisted events before either network request completes and replaces them with fresh events', async () => {
  saveCalendarStatus('alice', 'apple', status)
  saveCalendarEvents('alice', 'apple', status.email, range, [event])
  let finishStatus!: (value: CalendarStatus) => void
  let finishEvents!: (value: CalendarEvent[]) => void
  vi.mocked(calendarApi.status).mockReturnValue(new Promise(resolve => { finishStatus = resolve }))
  vi.mocked(calendarApi.events).mockReturnValue(new Promise(resolve => { finishEvents = resolve }))
  const { result } = renderHook(() => {
    const connection = useCalendarStatus()
    return useEvents('today', connection.data?.state === 'connected')
  }, { wrapper })
  expect(result.current.data).toEqual([event])
  expect(result.current.isLoading).toBe(false)
  await waitFor(() => expect(calendarApi.events).toHaveBeenCalledOnce())
  const updated = { ...event, title: 'Plan actualizado' }
  await act(async () => { finishStatus(status); finishEvents([updated]) })
  await waitFor(() => expect(result.current.data).toEqual([updated]))
  expect(cachedCalendarEvents('alice', 'apple', status.email, range)?.events).toEqual([updated])
})

it('keeps cached events visible when the background refresh fails', async () => {
  saveCalendarStatus('alice', 'apple', status)
  saveCalendarEvents('alice', 'apple', status.email, range, [event])
  vi.mocked(calendarApi.status).mockResolvedValue(status)
  vi.mocked(calendarApi.events).mockRejectedValue(new Error('Offline'))
  const { result } = renderHook(() => useEvents('today', true), { wrapper })
  await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 })
  expect(result.current.data).toEqual([event])
})

it('cancels pending refreshes and removes saved events on disconnect', async () => {
  saveCalendarStatus('alice', 'apple', status)
  saveCalendarEvents('alice', 'apple', status.email, range, [event])
  vi.mocked(calendarApi.status).mockResolvedValue({ state: 'disconnected' })
  vi.mocked(calendarApi.disconnect).mockResolvedValue(undefined)
  const { result } = renderHook(() => useDisconnectCalendar(), { wrapper })
  await act(async () => { await result.current.mutateAsync() })
  expect(cachedCalendarStatus('alice', 'apple')).toBeUndefined()
  expect(cachedCalendarEvents('alice', 'apple', status.email, range)).toBeUndefined()
})

it('does not restore a snapshot when a status request finishes after logout', async () => {
  let finish!: (value: CalendarStatus) => void
  vi.mocked(calendarApi.status).mockReturnValue(new Promise(resolve => { finish = resolve }))
  renderHook(() => useCalendarStatus(), { wrapper })
  await waitFor(() => expect(calendarApi.status).toHaveBeenCalledOnce())
  await act(async () => { qc.clear(); clearCalendarSnapshots(); finish(status) })
  expect(cachedCalendarStatus('alice', 'apple')).toBeUndefined()
})
