import type { DAVCalendar, DAVClient } from 'tsdav'
import type { CalendarInfo } from '../../src/types/domain.js'
import { AppleTimeZoneError, normalizeAppleObject } from './apple-ical.js'

export async function fetchAppleEvents(client: DAVClient, calendar: DAVCalendar, info: CalendarInfo, start: Date, end: Date) {
  const objects = await client.fetchCalendarObjects({ calendar, timeRange:{ start:start.toISOString(), end:end.toISOString() }, expand:true, urlFilter:() => true })
  const groups = await Promise.all(objects.map(async object => {
    const sources = calendar.timezone ? [calendar.timezone] : []
    try { return normalizeAppleObject(object, info, sources) }
    catch (error) {
      if (!(error instanceof AppleTimeZoneError)) throw error
      // Read the unexpanded resource to recover custom VTIMEZONE definitions.
      // Keep the server-expanded occurrences, including recurrence exceptions.
      const originals = await client.fetchCalendarObjects({ calendar, objectUrls:[object.url], urlFilter:() => true })
      const original = originals.find(item => item.url === object.url)
      if (typeof original?.data !== 'string') throw error
      return normalizeAppleObject(object, info, [...sources, original.data])
    }
  }))
  return groups.flat().filter(event => new Date(event.start) < end && new Date(event.end) > start)
}
