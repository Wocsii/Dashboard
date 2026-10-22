import { useToday } from '@/lib/useToday'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { addDays, startOfWeek } from 'date-fns'
import { repo } from '@/data'
import { dayLabel, formatLong, toISODate } from '@/lib/dates'
import { completionRate, focusMinutes, formatMinutes, productivityStreak, todayProductivity, weeklySeries } from '@/lib/stats'
import { isDone } from '@/lib/tasks'
import type { Bar } from '@/components/ui/BarChart'
import { useFocusSessions } from '../focus/hooks'
import { useProjects } from '../projects/hooks'
import { useSettings } from '../settings/hooks'
import { tasksKey, useTasks } from '../tasks/hooks'
import { isGoogleFocusTask } from '../google-tasks/task-link'

/** Todas las métricas derivadas en un solo sitio (Inicio y Estadísticas) */
export function useStats({ includeDeletedCompleted = false } = {}) {
  const currentDay = useToday()
  const { data: allTasks = [], isLoading: l1 } = useTasks()
  const { data: deletedTasks = [], isLoading: loadingDeleted } = useQuery({
    queryKey: [...tasksKey, 'deleted-completed'],
    queryFn: () => repo().listDeletedTasks(),
    enabled: includeDeletedCompleted,
  })
  const { data: sessions = [], isLoading: l2 } = useFocusSessions()
  const { data: projects = [] } = useProjects()
  const { data: settings } = useSettings()
  const tasks = useMemo(() => {
    const combined = new Map(allTasks.map(task => [task.id, task]))
    if (includeDeletedCompleted) {
      for (const task of deletedTasks) {
        if (isDone(task) && !isGoogleFocusTask(task) && !combined.has(task.id)) combined.set(task.id, task)
      }
    }
    return [...combined.values()].filter(task => !task.tags.includes('habit-session'))
  }, [allTasks, deletedTasks, includeDeletedCompleted])
  const weekStartsOn = (settings?.week_starts_on ?? 1) as 0 | 1

  return useMemo(() => {
    const now = new Date(`${currentDay}T12:00:00`)
    const today = currentDay
    const week = weeklySeries(tasks, sessions, now, weekStartsOn)
    const weekStart = week[0].date
    const done = tasks.filter(isDone)

    const toBars = (pick: (d: (typeof week)[number]) => number, fmt: (n: number) => string): Bar[] =>
      week.map((d) => {
        const date = new Date(`${d.date}T12:00:00`)
        return { label: dayLabel(date), full: formatLong(date), value: pick(d), display: fmt(pick(d)), highlight: d.date === today }
      })

    // Últimas 6 semanas: tareas completadas por semana
    const thisWeek = startOfWeek(now, { weekStartsOn })
    const weeks: Bar[] = Array.from({ length: 6 }, (_, i) => {
      const from = addDays(thisWeek, -7 * (5 - i))
      const fromISO = toISODate(from)
      const toISO = toISODate(addDays(from, 6))
      const n = done.filter((t) => {
        const d = t.completed_at ? toISODate(new Date(t.completed_at)) : ''
        return d >= fromISO && d <= toISO
      }).length
      return { label: i === 5 ? 'Esta' : `S-${5 - i}`, full: `Semana del ${formatLong(from)}`, value: n, display: `${n} tareas`, highlight: i === 5 }
    })

    return {
      loading: l1 || l2 || (includeDeletedCompleted && loadingDeleted),
      today,
      productivity: todayProductivity(tasks, today),
      completed: done.length,
      pending: tasks.length - done.length,
      overdue: tasks.filter((t) => !isDone(t) && t.due_date && t.due_date < today).length,
      completionRate: completionRate(tasks),
      completedThisWeek: week.reduce((a, d) => a + d.completed, 0),
      focusToday: focusMinutes(sessions, today, today),
      focusThisWeek: focusMinutes(sessions, weekStart, today),
      activeProjects: projects.filter((p) => p.status === 'active' && !p.exercise_config).length,
      streak: productivityStreak(tasks, sessions, now),
      completedBars: toBars((d) => d.completed, (n) => `${n} tareas`),
      focusBars: toBars((d) => d.focusMinutes, formatMinutes),
      weeksBars: weeks,
    }
  }, [tasks, sessions, projects, weekStartsOn, l1, l2, currentDay, includeDeletedCompleted, loadingDeleted])
}
