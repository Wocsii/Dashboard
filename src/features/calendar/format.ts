import { parseISO } from 'date-fns'
import { formatTime, relativeDay, toISODate } from '@/lib/dates'
import type { CalendarEvent } from '@/types/domain'

export function eventWhen(e: CalendarEvent): string {
  const day = relativeDay(e.allDay ? e.start : toISODate(parseISO(e.start)))
  return e.allDay ? `${day} · Todo el día` : `${day}, ${formatTime(e.start)}`
}
