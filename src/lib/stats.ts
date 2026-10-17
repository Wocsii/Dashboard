import { addDays } from 'date-fns'
import type { FocusSession, Project, Task } from '@/types/domain'
import { toISODate, todayISO, weekDays } from './dates'
import { isDone } from './tasks'

const localDay = (iso: string) => toISODate(new Date(iso))

/**
 * Productividad de hoy = completadas hoy / (completadas hoy + pendientes para hoy o vencidas).
 * Devuelve null si hoy no había nada planificado.
 */
export function todayProductivity(tasks: Task[], today = todayISO()): number | null {
  const doneToday = tasks.filter((t) => isDone(t) && t.completed_at && localDay(t.completed_at) === today).length
  const pendingDue = tasks.filter((t) => !isDone(t) && t.due_date && t.due_date <= today).length
  const total = doneToday + pendingDue
  return total === 0 ? null : Math.round((doneToday / total) * 100)
}

export function completionRate(tasks: Task[]): number {
  if (tasks.length === 0) return 0
  return Math.round((tasks.filter(isDone).length / tasks.length) * 100)
}

export function focusMinutes(sessions: FocusSession[], fromISO?: string, toISO?: string): number {
  const secs = sessions
    .filter((s) => s.kind === 'focus')
    .filter((s) => {
      const d = localDay(s.started_at)
      return (!fromISO || d >= fromISO) && (!toISO || d <= toISO)
    })
    .reduce((acc, s) => acc + s.duration_seconds, 0)
  return Math.round(secs / 60)
}

export type DayStat = { date: string; completed: number; focusMinutes: number }

export function weeklySeries(
  tasks: Task[],
  sessions: FocusSession[],
  now = new Date(),
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 1,
): DayStat[] {
  return weekDays(now, weekStartsOn).map((d) => {
    const date = toISODate(d)
    return {
      date,
      completed: tasks.filter((t) => t.completed_at && localDay(t.completed_at) === date).length,
      focusMinutes: focusMinutes(sessions, date, date),
    }
  })
}

/** Días seguidos con tareas completadas o tiempo real de enfoque, incluido el indefinido. */
export function productivityStreak(tasks: Task[], sessions: FocusSession[], now = new Date()): number {
  const active = new Set<string>()
  for (const t of tasks) if (t.completed_at) active.add(localDay(t.completed_at))
  for (const s of sessions) {
    if (s.kind !== 'focus' || s.duration_seconds <= 0) continue
    active.add(localDay(s.started_at))
    // Una sesión continua puede pasar por medianoche. No rellenar días de pausa.
    const start = new Date(s.started_at)
    const end = new Date(Date.parse(s.ended_at) - 1)
    if (s.duration_seconds * 1000 >= end.getTime() - start.getTime() - 1000) {
      start.setHours(0, 0, 0, 0)
      for (let day = addDays(start, 1); toISODate(day) <= toISODate(end); day = addDays(day, 1)) active.add(toISODate(day))
    } else if (s.ended_at) {
      active.add(localDay(s.ended_at))
    }
  }

  let cursor = now
  if (!active.has(toISODate(cursor))) cursor = addDays(cursor, -1)
  let streak = 0
  while (active.has(toISODate(cursor))) {
    streak++
    cursor = addDays(cursor, -1)
  }
  return streak
}

export function projectProgress(project: Project, tasks: Task[]): { done: number; total: number; percent: number } {
  const own = tasks.filter((t) => t.project_id === project.id)
  const done = own.filter(isDone).length
  return { done, total: own.length, percent: own.length ? Math.round((done / own.length) * 100) : 0 }
}

/** Horas compactas para cifras grandes: 225 min → "3,8h" */
export function formatHoursCompact(min: number): string {
  if (min < 60) return `${min}m`
  return `${(Math.round((min / 60) * 10) / 10).toLocaleString('es-ES')}h`
}

/** "1 tarea" / "3 tareas" */
export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export function formatMinutes(min: number): string {
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h ${m}m` : `${h}h`
}
