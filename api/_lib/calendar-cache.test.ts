// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest'
import { CalendarCache } from './calendar-cache'

afterEach(() => vi.useRealTimers())

it('shares concurrent requests and keeps accounts separate', async () => {
  const cache = new CalendarCache<string>(1000)
  const load = vi.fn(async () => 'events')
  const first = cache.get('alice', load)
  expect(cache.get('alice', load)).toBe(first)
  await Promise.all([first, cache.get('bob', load)])
  expect(load).toHaveBeenCalledTimes(2)
})

it('reloads expired entries and retries failures', async () => {
  vi.useFakeTimers()
  const cache = new CalendarCache<string>(1000)
  const load = vi.fn(async () => 'events')
  await cache.get('alice', load)
  vi.advanceTimersByTime(1001)
  await cache.get('alice', load)
  expect(load).toHaveBeenCalledTimes(2)
  await expect(cache.get('bob', async () => { throw new Error('offline') })).rejects.toThrow('offline')
  await expect(cache.get('bob', load)).resolves.toBe('events')
})

it('bounds memory use and supports invalidation', async () => {
  const cache = new CalendarCache<string>(1000, 1)
  const load = vi.fn(async () => 'events')
  await cache.get('alice', load)
  await cache.get('bob', load)
  await cache.get('alice', load)
  cache.delete('alice')
  await cache.get('alice', load)
  expect(load).toHaveBeenCalledTimes(4)
})
