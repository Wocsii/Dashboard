// @vitest-environment node
import type { DAVCalendar, DAVClient } from 'tsdav'
import { expect, it, vi } from 'vitest'
import { fetchAppleEvents } from './apple-events'
import { appleCalendarInfo, AppleTimeZoneError, normalizeAppleObject } from './apple-ical'

const calendar: DAVCalendar = { url:'https://p01-caldav.icloud.com/123/calendars/work/' }
const info = appleCalendarInfo(calendar, null)
const url = `${calendar.url}recurring.ics`
const ics = (body: string) => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${body}\r\nEND:VCALENDAR\r\n`
const zone = `BEGIN:VTIMEZONE\r\nTZID:Custom European Time\r\nBEGIN:STANDARD\r\nDTSTART:19701025T030000\r\nRRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU\r\nTZOFFSETFROM:+0200\r\nTZOFFSETTO:+0100\r\nEND:STANDARD\r\nBEGIN:DAYLIGHT\r\nDTSTART:19700329T020000\r\nRRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU\r\nTZOFFSETFROM:+0100\r\nTZOFFSETTO:+0200\r\nEND:DAYLIGHT\r\nEND:VTIMEZONE`
const event = (day: string, extra = '') => `BEGIN:VEVENT\r\nUID:recurring\r\nDTSTART;TZID=Custom European Time:${day}T130000\r\nDTEND;TZID=Custom European Time:${day}T140000\r\n${extra}\r\nEND:VEVENT`
const start = new Date('2026-10-22T00:00:00Z'), end = new Date('2026-11-22T00:00:00Z')

it('recovers original timezone rules for expanded occurrences across the DST change', async () => {
  const expanded = { url, data:ics(event('20261023','RECURRENCE-ID:20261023T110000Z')+'\r\n'+event('20261030','RECURRENCE-ID:20261030T120000Z')) }
  // Reproduces the production failure, rather than substituting the calendar zone.
  expect(() => normalizeAppleObject(expanded, {...info, timeZone:'America/New_York'})).toThrow(AppleTimeZoneError)
  const fetchCalendarObjects = vi.fn().mockResolvedValueOnce([expanded]).mockResolvedValueOnce([{ url, data:ics(zone+'\r\n'+event('20261023','RRULE:FREQ=WEEKLY')) }])
  const events = await fetchAppleEvents({ fetchCalendarObjects } as unknown as DAVClient, calendar, info, start, end)
  expect(events.map(e => [e.start, e.end])).toEqual([
    ['2026-10-23T11:00:00.000Z', '2026-10-23T12:00:00.000Z'],
    ['2026-10-30T12:00:00.000Z', '2026-10-30T13:00:00.000Z'],
  ])
  expect(events[0].id).not.toBe(events[1].id)
  expect(fetchCalendarObjects).toHaveBeenNthCalledWith(2, { calendar, objectUrls:[url], urlFilter:expect.any(Function) })
})

it('uses collection timezone rules without another request when available', async () => {
  const fetchCalendarObjects = vi.fn().mockResolvedValue([{ url, data:ics(event('20261030')) }])
  const events = await fetchAppleEvents({ fetchCalendarObjects } as unknown as DAVClient, {...calendar, timezone:zone}, info, start, end)
  expect(events[0].start).toBe('2026-10-30T12:00:00.000Z')
  expect(fetchCalendarObjects).toHaveBeenCalledTimes(1)
})

it('keeps UTC and IANA events working without an extra request', async () => {
  const data = ics(event('20261030').replaceAll('Custom European Time','Europe/Madrid')+'\r\n'+event('20261031').replaceAll(';TZID=Custom European Time','').replaceAll('T130000','T130000Z').replaceAll('T140000','T140000Z'))
  const fetchCalendarObjects = vi.fn().mockResolvedValue([{ url, data }])
  const events = await fetchAppleEvents({ fetchCalendarObjects } as unknown as DAVClient, calendar, info, start, end)
  expect(events.map(e=>e.start)).toEqual(['2026-10-30T12:00:00.000Z','2026-10-31T13:00:00.000Z'])
  expect(fetchCalendarObjects).toHaveBeenCalledTimes(1)
})

it('reports missing timezone rules explicitly instead of returning guessed times', async () => {
  const fetchCalendarObjects = vi.fn().mockResolvedValue([{ url, data:ics(event('20261030')) }])
  await expect(fetchAppleEvents({ fetchCalendarObjects } as unknown as DAVClient, calendar, info, start, end)).rejects.toThrow(AppleTimeZoneError)
})

it('does not retry authentication errors or unrelated malformed events as timezone errors', async () => {
  const fetchCalendarObjects = vi.fn().mockResolvedValue([{ url, data:'invalid' }])
  await expect(fetchAppleEvents({ fetchCalendarObjects } as unknown as DAVClient, calendar, info, start, end)).rejects.toThrow('No se pudo interpretar un evento')
  expect(fetchCalendarObjects).toHaveBeenCalledTimes(1)
})
