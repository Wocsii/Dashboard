import { act, renderHook } from '@testing-library/react'
import { todayISO } from './dates'
import { useToday } from './useToday'

afterEach(() => vi.useRealTimers())

it('actualiza la fecha automáticamente al llegar medianoche', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 17, 23, 59))
  const view = renderHook(useToday)
  expect(view.result.current).toBe('2026-10-17')
  act(() => vi.advanceTimersByTime(60_000))
  expect(view.result.current).toBe('2026-10-18')
  view.unmount()
})

it('actualiza al volver de una pestaña suspendida', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 17, 12))
  const view = renderHook(useToday)
  vi.setSystemTime(new Date(2026, 9, 19, 9))
  act(() => window.dispatchEvent(new Event('focus')))
  expect(view.result.current).toBe(todayISO())
  view.unmount()
})
