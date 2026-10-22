import { afterEach, expect, it, vi } from 'vitest'
import { calendarApi } from './api'
vi.mock('@/lib/env', () => ({ isDemo:false,isEmbedded:false }))
vi.mock('@/lib/supabase', () => ({ supabase:{ auth:{ getSession:async () => ({ data:{ session:{ access_token:'dashboard-session' } } }) } } }))
afterEach(() => vi.unstubAllGlobals())
it('uses authenticated endpoints for the selected provider and keeps Apple credentials out of read requests', async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ state:'connected',email:'one@icloud.com',canWrite:true })).mockResolvedValueOnce(Response.json({ calendars:[] }))
  vi.stubGlobal('fetch',fetcher)
  await calendarApi.status('apple')
  await calendarApi.calendars('google')
  expect(fetcher.mock.calls[0][0]).toBe('/api/apple/status')
  expect(fetcher.mock.calls[1][0]).toBe('/api/google/calendars')
  expect(fetcher.mock.calls[0][1].headers.Authorization).toBe('Bearer dashboard-session')
  expect(fetcher.mock.calls[0][1].body).toBeUndefined()
})
