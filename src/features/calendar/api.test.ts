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
it('sends Apple resource identity and etag to the Apple writer, independently of Google', async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ event:{ id:'apple-event' } })).mockResolvedValueOnce(Response.json({ deleted:true }))
  vi.stubGlobal('fetch',fetcher)
  const data = { calendarId:'apple:personal',title:'Plan',description:'',location:'',start:'2026-10-15T09:00:00Z',end:'2026-10-15T10:00:00Z',allDay:false,timeZone:'UTC' }
  const event = { ...data,id:'apple-event',provider:'apple' as const,color:'#bfe6c6',appleUid:'uid',appleObjectUrl:'https://p01-caldav.icloud.com/one/personal/event.ics',appleRecurrenceId:'RECURRENCE-ID:20261015T090000Z',etag:'v1' }
  await calendarApi.saveEvent(data,event)
  await calendarApi.deleteEvent(event)
  expect(fetcher.mock.calls[0][0]).toBe('/api/apple/events-write')
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({ uid:'uid',etag:'v1',recurrenceId:event.appleRecurrenceId,objectUrl:event.appleObjectUrl })
  expect(fetcher.mock.calls[1][1].method).toBe('DELETE')
})
