import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import { UpcomingEventsContent } from './CenterWidgets'

const state = vi.hoisted(() => ({
  provider: 'google',
  status: { data: { state: 'connected' }, isLoading: false, error: null as Error | null, refetch: vi.fn() },
  events: { data: [] as Record<string, unknown>[], isLoading: false, error: null as Error | null, refetch: vi.fn() },
  useEvents: vi.fn(),
}))
vi.mock('../../calendar/CalendarProvider', () => ({ useCalendarProvider: () => ({ provider: state.provider }) }))
vi.mock('../../calendar/hooks', () => ({ useCalendarStatus: () => state.status, useEvents: (...args: unknown[]) => { state.useEvents(...args); return state.events } }))
afterEach(() => {
  cleanup()
  state.provider = 'google'
  state.status.data.state = 'connected'
  state.events.error = null
  state.events.isLoading = false
  state.events.data = []
  vi.clearAllMocks()
})
const show = () => render(<MemoryRouter><UpcomingEventsContent /></MemoryRouter>)
it('queries the three-day range and displays a returned event', () => {
  const start = new Date(); start.setDate(start.getDate() + 2)
  state.events.data = [{ id:'later',title:'Plan lejano',start:start.toISOString(),end:new Date(+start + 3600000).toISOString(),allDay:false }]
  show()
  expect(state.useEvents).toHaveBeenCalledWith('threeDays', true)
  expect(screen.getByText('Plan lejano')).toBeVisible()
})
it('explains the empty date range and selected provider', () => {
  state.provider = 'apple'
  show()
  expect(screen.getByText(/próximos 3 días.*Apple/)).toBeVisible()
})
it('shows loading and fetch errors instead of disappearing', () => {
  state.events.isLoading = true
  const view = show()
  expect(screen.getByRole('status')).toHaveTextContent('Buscando')
  state.events.isLoading = false
  state.events.error = new Error('No se pudo contactar con iCloud')
  view.rerender(<MemoryRouter><UpcomingEventsContent /></MemoryRouter>)
  expect(screen.getByRole('alert')).toHaveTextContent('No se pudo contactar con iCloud')
})
it('sends disconnected Apple users to settings rather than Google login', () => {
  state.provider = 'apple'
  state.status.data.state = 'not_connected'
  show()
  expect(screen.getByRole('link', { name:'Ajustes' })).toHaveAttribute('href','/ajustes')
  expect(screen.queryByText(/Conectar Google/)).not.toBeInTheDocument()
})
