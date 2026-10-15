import { addDays, differenceInCalendarDays, format, isValid, parseISO, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'

/** Fecha local YYYY-MM-DD (las fechas límite se guardan como `date`, sin hora). */
export function toISODate(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

export function todayISO(now = new Date()): string {
  return toISODate(now)
}

export function parseDate(iso: string): Date {
  // 'YYYY-MM-DD' → medianoche LOCAL (parseISO lo hace así; new Date() usaría UTC)
  return parseISO(iso)
}

export function daysUntil(iso: string, now = new Date()): number {
  return differenceInCalendarDays(parseDate(iso), now)
}

export function formatLong(d: Date): string {
  const s = format(d, "EEEE, d 'de' MMMM", { locale: es })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function formatShort(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = parseDate(iso)
  if (!isValid(d)) return ''
  return format(d, 'd MMM', { locale: es })
}

export function formatTime(iso: string): string {
  return format(parseISO(iso), 'HH:mm')
}

/** "Hoy", "Mañana", "Ayer", "En 3 días", "Hace 2 días" o fecha corta */
export function relativeDay(iso: string, now = new Date()): string {
  const n = daysUntil(iso, now)
  if (n === 0) return 'Hoy'
  if (n === 1) return 'Mañana'
  if (n === -1) return 'Ayer'
  if (n > 1 && n < 7) return `En ${n} días`
  if (n < -1 && n > -7) return `Hace ${-n} días`
  return formatShort(iso)
}

export function weekDays(now = new Date(), weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 1): Date[] {
  const start = startOfWeek(now, { weekStartsOn })
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export function dayLabel(d: Date): string {
  return format(d, 'EEEEE', { locale: es }).toUpperCase()
}

export function partOfDay(now = new Date()): 'morning' | 'afternoon' | 'evening' {
  const h = now.getHours()
  if (h < 13) return 'morning'
  if (h < 20) return 'afternoon'
  return 'evening'
}
