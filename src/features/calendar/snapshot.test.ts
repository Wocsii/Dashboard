import { afterEach, expect, it, vi } from 'vitest'
import type { CalendarEvent } from '@/types/domain'
import { cachedCalendarEvents, cachedCalendarStatus, clearCalendarSnapshots, saveCalendarEvents, saveCalendarStatus } from './snapshot'
const event: CalendarEvent = { id: 'one', calendarId: 'personal', title: 'Plan', start: '2026-10-22', end: '2026-10-23', allDay: true, color: '#abc' }
afterEach(() => { clearCalendarSnapshots(); vi.useRealTimers(); vi.restoreAllMocks() })
it('separates users, providers and connected accounts, and discards data when the account changes', () => {
  saveCalendarStatus('alice', 'apple', { state: 'connected', email: 'one@icloud.com' })
  saveCalendarEvents('alice', 'apple', 'one@icloud.com', 'week', [event])
  expect(cachedCalendarStatus('bob', 'apple')).toBeUndefined()
  expect(cachedCalendarStatus('alice', 'google')).toBeUndefined()
  expect(cachedCalendarEvents('alice', 'apple', 'two@icloud.com', 'week')).toBeUndefined()
  saveCalendarStatus('alice', 'apple', { state: 'connected', email: 'two@icloud.com' })
  expect(cachedCalendarEvents('alice', 'apple', 'two@icloud.com', 'week')).toBeUndefined()
  saveCalendarEvents('alice', 'apple', 'one@icloud.com', 'week', [event])
  expect(cachedCalendarEvents('alice', 'apple', 'two@icloud.com', 'week')).toBeUndefined()
})
it('expires event snapshots even if the connection status keeps being refreshed', () => {
  vi.useFakeTimers()
  saveCalendarStatus('alice', 'apple', { state: 'connected', email: 'one@icloud.com' })
  saveCalendarEvents('alice', 'apple', 'one@icloud.com', 'week', [event])
  vi.advanceTimersByTime(23 * 3600000)
  saveCalendarStatus('alice', 'apple', { state: 'connected', email: 'one@icloud.com' })
  vi.advanceTimersByTime(2 * 3600000)
  expect(cachedCalendarStatus('alice', 'apple')?.state).toBe('connected')
  expect(cachedCalendarEvents('alice', 'apple', 'one@icloud.com', 'week')).toBeUndefined()
})
it('removes snapshots on revoked connections and ignores late event responses', () => {
  saveCalendarStatus('alice', 'apple', { state: 'connected', email: 'one@icloud.com' })
  saveCalendarEvents('alice', 'apple', 'one@icloud.com', 'week', [event])
  saveCalendarStatus('alice', 'apple', { state: 'needs_reauth', email: 'one@icloud.com' })
  saveCalendarEvents('alice', 'apple', 'one@icloud.com', 'week', [event])
  expect(cachedCalendarStatus('alice', 'apple')).toBeUndefined()
})
it('remains usable when browser storage is unavailable', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota exceeded') })
  expect(() => saveCalendarStatus('alice', 'apple', { state: 'connected', email: 'one@icloud.com' })).not.toThrow()
})
