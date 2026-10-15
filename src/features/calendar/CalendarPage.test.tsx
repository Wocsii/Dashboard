import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import { CalendarVisualPage } from './CalendarVisualPage'
import { calendarApi } from './api'

vi.mock('./api', () => ({ calendarApi: { connect: vi.fn().mockResolvedValue(undefined) } }))
vi.mock('./hooks', () => ({
  calendarKeys: { calendars: ['calendar','list'] },
  useCalendarStatus: () => ({ data: { state: 'connected', canWrite: false, email: 'me@example.com' }, refetch: vi.fn() }),
  useCalendars: () => ({ data: [{ id: 'mine', summary: 'Personal', writable: true, visible: true, color: '#8fb8e3' }] }),
  useCalendarEvents: () => ({ data: [], refetch: vi.fn() }),
  useCalendarMutations: () => ({ save: { isPending: false } }),
}))
vi.mock('../settings/hooks', () => ({
  useProfile: () => ({ data: { display_name: 'Manuela' } }),
  useSettings: () => ({ data: { week_starts_on: 1, visible_calendar_ids: null } }),
  useUpdateSettings: () => ({ mutate: vi.fn(), isPending: false }),
}))
afterEach(cleanup)
it('keeps read-only connections usable and asks for an explicit write upgrade', () => {
  render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><CalendarVisualPage /></MemoryRouter></QueryClientProvider>)
  expect(screen.getByLabelText('Agenda semanal')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Nuevo evento' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Activar edición' }))
  expect(calendarApi.connect).toHaveBeenCalledOnce()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
