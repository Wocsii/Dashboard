import type { Task, TaskPriority } from '@/types/domain'
import { todayISO } from './dates'

export const priorityRank: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 }

export type TaskFilter = {
  state: 'all' | 'pending' | 'done'
  priority: TaskPriority | 'all'
  when: 'all' | 'overdue' | 'today' | 'week' | 'nodate'
  projectId: string | 'all'
  search: string
}
export type TaskSort = 'due' | 'priority' | 'created'

export const defaultFilter: TaskFilter = { state: 'pending', priority: 'all', when: 'all', projectId: 'all', search: '' }

export const isDone = (t: Task) => t.status === 'done'
export const isOverdue = (t: Task, today = todayISO()) => !isDone(t) && !!t.due_date && t.due_date < today
export const isDueToday = (t: Task, today = todayISO()) => !isDone(t) && t.due_date === today

function addDaysISO(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d + n)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function filterTasks(tasks: Task[], f: TaskFilter, today = todayISO()): Task[] {
  const q = f.search.trim().toLowerCase()
  const weekEnd = addDaysISO(today, 7)
  return tasks.filter((t) => {
    if (f.state === 'pending' && isDone(t)) return false
    if (f.state === 'done' && !isDone(t)) return false
    if (f.priority !== 'all' && t.priority !== f.priority) return false
    if (f.projectId !== 'all' && t.project_id !== f.projectId) return false
    if (f.when === 'overdue' && !isOverdue(t, today)) return false
    if (f.when === 'today' && t.due_date !== today) return false
    if (f.when === 'week' && !(t.due_date && t.due_date >= today && t.due_date <= weekEnd)) return false
    if (f.when === 'nodate' && t.due_date) return false
    if (q && !`${t.title} ${t.description} ${t.tags.join(' ')}`.toLowerCase().includes(q)) return false
    return true
  })
}

export function sortTasks(tasks: Task[], sort: TaskSort): Task[] {
  const byDue = (a: Task, b: Task) => (a.due_date ?? '9999') .localeCompare(b.due_date ?? '9999')
  const byPrio = (a: Task, b: Task) => priorityRank[a.priority] - priorityRank[b.priority]
  const byCreated = (a: Task, b: Task) => b.created_at.localeCompare(a.created_at)
  const cmp =
    sort === 'due'
      ? (a: Task, b: Task) => byDue(a, b) || byPrio(a, b)
      : sort === 'priority'
        ? (a: Task, b: Task) => byPrio(a, b) || byDue(a, b)
        : byCreated
  return [...tasks].sort(cmp)
}

export type TaskGroups = { overdue: Task[]; today: Task[]; upcoming: Task[]; noDate: Task[]; done: Task[] }

/** Agrupa tareas por urgencia para la vista de lista */
export function groupTasks(tasks: Task[], today = todayISO()): TaskGroups {
  const g: TaskGroups = { overdue: [], today: [], upcoming: [], noDate: [], done: [] }
  for (const t of tasks) {
    if (isDone(t)) g.done.push(t)
    else if (!t.due_date) g.noDate.push(t)
    else if (t.due_date < today) g.overdue.push(t)
    else if (t.due_date === today) g.today.push(t)
    else g.upcoming.push(t)
  }
  return g
}

/** Tarea prioritaria: la marcada como foco; si no hay, la más urgente para hoy/vencida */
export function pickFocusTask(tasks: Task[], today = todayISO()): Task | undefined {
  const pending = tasks.filter((t) => !isDone(t))
  const flagged = pending.find((t) => t.is_focus)
  if (flagged) return flagged
  const due = pending.filter((t) => t.due_date && t.due_date <= today)
  return sortTasks(due, 'priority')[0]
}
