import type { ExerciseConfig, ExerciseLog, FocusSession, Project, Task } from '@/types/domain'
import { todayISO } from '@/lib/dates'

/** Stable upsert key across reloads and browser tabs for a running timer. */
export function timerSessionId(startedAt: number, taskId: string) {
  let hash = 0
  for (const char of taskId) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) | 0
  const hex = Math.trunc(startedAt).toString(16).padStart(12, '0') + (hash >>> 0).toString(16).padStart(8, '0') + '000000000000'
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-8${hex.slice(17,20)}-${hex.slice(20,32)}`
}

export function habitDailyProgress(project: Project, tasks: Task[], sessions: FocusSession[], logs: ExerciseLog[], date = todayISO(), live?: { id: string; taskId: string; seconds: number; startedAt: number }) {
  const taskIds = new Set(tasks.filter((t) => t.project_id === project.id).map((t) => t.id))
  let seconds = 0, pomodoros = 0
  for (const s of sessions) {
    if (!s.task_id || !taskIds.has(s.task_id) || s.kind !== 'focus') continue
    // Allocate elapsed time across local calendar days, including midnight sessions.
    const start = new Date(`${date}T00:00:00`).getTime()
    const end = new Date(start); end.setDate(end.getDate() + 1)
    const a = new Date(s.started_at).getTime(), b = new Date(s.ended_at).getTime()
    const overlap = Math.max(0, Math.min(b, +end) - Math.max(a, start))
    if (b > a) seconds += s.duration_seconds * overlap / (b - a)
    if (s.completed && todayISO(new Date(s.ended_at)) === date) pomodoros++
  }
  if (live && taskIds.has(live.taskId)) {
    const saved = sessions.find((s) => s.id === live.id)
    const start = new Date(`${date}T00:00:00`).getTime()
    const end = new Date(start); end.setDate(end.getDate() + 1)
    if (live.startedAt >= start && live.startedAt < +end) seconds += Math.max(0, live.seconds - (saved?.duration_seconds ?? 0))
  }
  const entry = logs.find((l) => l.project_id === project.id && l.date === date)
  const minutes = Math.max(seconds / 60, entry?.values.minutes ?? 0)
  const config = project.exercise_config!
  const goal = config.timeGoal
  const value = goal?.unit === 'pomodoros' ? pomodoros : goal?.unit === 'hours' ? minutes / 60 : minutes
  return { minutes, pomodoros, volume: entry?.values.repetitions ?? 0, value, target: goal?.amount ?? 0, reached: !goal || value >= goal.amount }
}

export function goalLabel(config: ExerciseConfig) {
  const goal = config.timeGoal
  if (!goal) return ''
  return `${goal.amount} ${goal.unit === 'hours' ? 'h' : goal.unit === 'pomodoros' ? 'Pomodoros' : 'min'}`
}
