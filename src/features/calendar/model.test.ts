import { describe, expect, it } from 'vitest'
import { parseISO } from 'date-fns'
import type { CalendarEvent } from '@/types/domain'
import { dateTimeInZone, eventsOnDay, moveEvent, positionEvents, viewDates, zonedDateTimeToISO } from './model'

const event = (id: string, start: string, end: string, allDay = false): CalendarEvent => ({ id, calendarId: 'personal', title: id, start, end, allDay, color: '#a4bdfc' })
describe('calendar dates and layout', () => {
  it('covers whole calendar weeks across month and year boundaries', () => {
    const days = viewDates(new Date(2026,0,1), 'month')
    expect(days[0].getDay()).toBe(1)
    expect(days.at(-1)?.getDay()).toBe(0)
    expect(days.length % 7).toBe(0)
    expect(days[0].getFullYear()).toBe(2025)
    expect(viewDates(new Date(), 'day')).toHaveLength(1)
  })
  it('treats all-day end dates as exclusive and includes overnight timed events', () => {
    const days = [event('birthday','2026-10-15','2026-10-17',true), event('overnight','2026-10-14T23:00:00','2026-10-15T01:00:00')]
    expect(eventsOnDay(days,new Date(2026,9,15))).toHaveLength(2)
    expect(eventsOnDay(days,new Date(2026,9,16)).map((e) => e.id)).toEqual(['birthday'])
    expect(eventsOnDay(days,new Date(2026,9,17))).toHaveLength(0)
  })
  it('assigns independent lanes to overlapping clusters and gives later events full width', () => {
    const rows = positionEvents([
      event('a','2026-10-15T09:00:00','2026-10-15T10:00:00'),
      event('b','2026-10-15T09:30:00','2026-10-15T11:00:00'),
      event('c','2026-10-15T10:00:00','2026-10-15T10:30:00'),
      event('d','2026-10-15T12:00:00','2026-10-15T13:00:00'),
    ],new Date(2026,9,15))
    expect(rows.slice(0,3).map((r) => r.lanes)).toEqual([2,2,2])
    expect(rows[0].lane).not.toBe(rows[1].lane)
    expect(rows[2].lane).toBe(rows[0].lane)
    expect(rows[3].lanes).toBe(1)
  })
  it('preserves duration when moving timed events and exclusive spans for all-day events', () => {
    const moved = moveEvent(event('a','2026-10-15T09:00:00','2026-10-15T10:30:00'),new Date(2026,9,20),14*60)
    expect(parseISO(moved.start).getHours()).toBe(14)
    expect(+parseISO(moved.end)-+parseISO(moved.start)).toBe(90*60000)
    const days = moveEvent(event('b','2026-10-15','2026-10-17',true),new Date(2026,9,24))
    expect([days.start,days.end]).toEqual(['2026-10-24','2026-10-26'])
  })
  it('converts IANA wall times correctly and rejects the missing spring DST hour', () => {
    expect(zonedDateTimeToISO('2026-01-15T09:00','Europe/Madrid')).toBe('2026-01-15T08:00:00.000Z')
    expect(zonedDateTimeToISO('2026-07-15T09:00','Europe/Madrid')).toBe('2026-07-15T07:00:00.000Z')
    expect(dateTimeInZone('2026-07-15T07:00:00Z','Europe/Madrid')).toBe('2026-07-15T09:00')
    expect(() => zonedDateTimeToISO('2026-03-29T02:30','Europe/Madrid')).toThrow('cambio horario')
  })
})
