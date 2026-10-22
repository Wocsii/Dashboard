import { addDays, addMonths, addWeeks, addYears, format, isSameDay, parseISO } from 'date-fns'
import type { CalendarEvent } from '@/types/domain'

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
