import { addDays, addMonths, addWeeks, addYears, endOfMonth, endOfWeek, format, isSameDay, parseISO, startOfDay, startOfMonth, startOfWeek } from 'date-fns'
import type { CalendarEvent, CalendarEventInput } from '@/types/domain'

export type CalendarView = 'month' | 'week' | 'day'
export const eventColors = [
  { id: '', label: 'Color del calendario', color: '#8fb8e3' }, { id: '1', label: 'Azul', color: '#a4bdfc' }, { id: '2', label: 'Menta', color: '#7ae7bf' }, { id: '3', label: 'Lavanda', color: '#dbadff' }, { id: '4', label: 'Rosa', color: '#ff887c' }, { id: '5', label: 'Amarillo', color: '#fbd75b' }, { id: '6', label: 'Melocotón', color: '#ffb878' }, { id: '7', label: 'Turquesa', color: '#46d6db' },
]
export function viewDates(date: Date, view: CalendarView, weekStartsOn: 0 | 1 = 1): Date[] {
  if (view === 'day') return [startOfDay(date)]
  const start = view === 'month' ? startOfWeek(startOfMonth(date), { weekStartsOn }) : startOfWeek(date, { weekStartsOn })
  const end = view === 'month' ? endOfWeek(endOfMonth(date), { weekStartsOn }) : addDays(start, 6)
  const result: Date[] = []
  for (let day = start; day <= end; day = addDays(day, 1)) result.push(day)
  return result
}
export function navigateDate(date: Date, view: CalendarView, direction: number) {
  return view === 'month' ? addMonths(date, direction) : view === 'week' ? addWeeks(date, direction) : addDays(date, direction)
}
export function eventsOnDay(events: CalendarEvent[], day: Date) {
  const start = startOfDay(day), end = addDays(start, 1)
  return events.filter((event) => parseISO(event.start) < end && parseISO(event.end) > start)
}
export function eventInput(event: CalendarEvent): CalendarEventInput {
  return { calendarId: event.calendarId, title: event.title, description: event.description ?? '', start: event.start, end: event.end, allDay: event.allDay, timeZone: event.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone, location: event.location ?? '' }
}
export function moveEvent(event: CalendarEvent, target: Date, minutes?: number): CalendarEventInput {
  const start = parseISO(event.start), end = parseISO(event.end)
  const nextStart = startOfDay(target)
  if (event.allDay) {
    const span = Math.round((Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / 86400000)
    return { ...eventInput(event), start: format(nextStart, 'yyyy-MM-dd'), end: format(addDays(nextStart, span), 'yyyy-MM-dd') }
  }
  nextStart.setMinutes(minutes ?? start.getHours() * 60 + start.getMinutes())
  return { ...eventInput(event), start: nextStart.toISOString(), end: new Date(+nextStart + (+end - +start)).toISOString() }
}

export type PositionedEvent = { event: CalendarEvent; start: number; end: number; lane: number; lanes: number }
/** Partition each overlap cluster, including events crossing midnight. */
export function positionEvents(events: CalendarEvent[], day: Date): PositionedEvent[] {
  const start = startOfDay(day), end = addDays(start, 1)
  const minute = (date: Date) => date.getHours() * 60 + date.getMinutes()
  const segments = eventsOnDay(events, day).filter((event) => !event.allDay).map((event) => ({ event, start: parseISO(event.start) <= start ? 0 : minute(parseISO(event.start)), end: parseISO(event.end) >= end ? 1440 : minute(parseISO(event.end)), lane: 0, lanes: 1 })).sort((a, b) => a.start - b.start || b.end - a.end)
  let cluster: PositionedEvent[] = [], ends: number[] = [], clusterEnd = -1
  const finish = () => { cluster.forEach((segment) => { segment.lanes = ends.length }); cluster = []; ends = [] }
  for (const segment of segments) {
    if (segment.start >= clusterEnd) { finish(); clusterEnd = -1 }
    let lane = ends.findIndex((value) => value <= segment.start)
    if (lane === -1) lane = ends.length
    segment.lane = lane
    ends[lane] = segment.end
    cluster.push(segment)
    clusterEnd = Math.max(clusterEnd, segment.end)
  }
  finish()
  return segments
}

export function dateTimeInZone(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso))
  const part = (type: string) => parts.find((p) => p.type === type)?.value
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`
}
/** Resolve wall time in the selected IANA zone, rejecting nonexistent DST hours. */
export function zonedDateTimeToISO(value: string, timeZone: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('Revisa la fecha y la hora.')
  const target = Date.parse(`${value}:00Z`)
  if (!Number.isFinite(target)) throw new Error('Fecha no válida.')
  let guess = target
  for (let i = 0; i < 4; i++) {
    const wall = dateTimeInZone(new Date(guess).toISOString(), timeZone)
    const delta = target - Date.parse(`${wall}:00Z`)
    if (!delta) return new Date(guess).toISOString()
    guess += delta
  }
  throw new Error('Esa hora no existe por el cambio horario. Elige otra hora.')
}

export function expandDemoRecurrences(events: CalendarEvent[], min: Date, max: Date) {
  return events.flatMap((event) => {
    const rule = event.recurrence?.[0]
    if (!rule) return [event]
    const frequency = /FREQ=(DAILY|WEEKLY|MONTHLY|YEARLY)/.exec(rule)?.[1]
    const interval = Number(/INTERVAL=(\d+)/.exec(rule)?.[1] ?? 1)
    const count = Math.min(Number(/COUNT=(\d+)/.exec(rule)?.[1] ?? 1000), 1000)
    const until = /UNTIL=(\d{8})/.exec(rule)?.[1]
    const untilDate = until ? parseISO(`${until.slice(0,4)}-${until.slice(4,6)}-${until.slice(6,8)}`) : null
    const result: CalendarEvent[] = []
    const shift = (d: Date, n: number) => frequency === 'DAILY' ? addDays(d, n) : frequency === 'WEEKLY' ? addWeeks(d, n) : frequency === 'YEARLY' ? addYears(d, n) : addMonths(d, n)
    for (let i = 0; i < count; i++) {
      const start = shift(parseISO(event.start), i * interval), end = shift(parseISO(event.end), i * interval)
      if (start >= max || (untilDate && start > untilDate && !isSameDay(start, untilDate))) break
      if (end <= min) continue
      result.push({ ...event, id: `${event.id}@${format(start, 'yyyyMMddHHmm')}`, googleId: `${event.id}@${format(start, 'yyyyMMddHHmm')}`, recurringEventId: event.id, start: event.allDay ? format(start, 'yyyy-MM-dd') : start.toISOString(), end: event.allDay ? format(end, 'yyyy-MM-dd') : end.toISOString(), recurrence: undefined })
    }
    return result
  })
}
